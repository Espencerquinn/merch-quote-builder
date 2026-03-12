import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const DEFAULT_COLOUR_HEX = "#888888";
const GENERIC_VIEWS = new Set(["BACK", "FRONT", "MAIN", "SIDE", "TURN"]);

function sortSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function applyMarkup(wholesalePrice: number): number {
  return wholesalePrice * 1.3;
}

interface ASColourVariant {
  sku: string;
  colour: string;
  sizeCode: string;
  discontinued: boolean;
}

interface ASColourProductImage {
  imageType: string;
  urlTiny: string;
  urlThumbnail: string;
  urlStandard: string;
  urlZoom: string;
}

interface ASColourPricelistItem {
  sku: string;
  price: number;
  currency: string;
}

interface ASColourColour {
  colour: string;
  hex: string;
}

async function verifyAdmin(req: Request) {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!dbUser || dbUser.role !== "admin") throw new Error("Admin access required");

  return supabaseAdmin;
}

/**
 * Phase 1: Catalog sync — fast, fetches product list only (3 API calls).
 * Inserts/updates basic fields (name, description, type, metadata).
 * Sets enriched_at = null so phase 2 knows to fetch details.
 */
async function phaseCatalogSync(supabaseAdmin: ReturnType<typeof createClient>) {
  const apiUrl = Deno.env.get("ASCOLOUR_API_URL") || "https://api.ascolour.co.nz/v1";
  const subscriptionKey = Deno.env.get("ASCOLOUR_SUBSCRIPTION_KEY")!;
  const apiHeaders = { "Subscription-Key": subscriptionKey, "Content-Type": "application/json" };
  const providerId = "ascolour";

  // Create sync log
  const syncLogId = crypto.randomUUID();
  await supabaseAdmin.from("sync_log").insert({
    id: syncLogId,
    provider_id: providerId,
    status: "running",
    started_at: new Date().toISOString(),
  });

  let productsAdded = 0;
  let productsUpdated = 0;
  let productsRemoved = 0;

  try {
    // Fetch all products from catalog (paginated, ~3 calls)
    const allProducts: Array<{
      styleCode: string; styleName: string; shortDescription: string;
      productType: string; fabricWeight: string; composition: string;
      fit: string; gender: string; coreRange: boolean;
      printingTechniques: string; productWeight: string;
      sizeGuideURL: string; websiteURL: string;
    }> = [];
    let page = 1;
    const pageSize = 250;

    while (true) {
      const res = await fetch(
        `${apiUrl}/catalog/products/?pageNumber=${page}&pageSize=${pageSize}`,
        { headers: apiHeaders }
      );
      if (!res.ok) throw new Error(`AS Colour catalog API error: ${res.status}`);
      const body = await res.json();
      const items = body.data || [];
      allProducts.push(...items);
      if (items.length < pageSize) break;
      page++;
    }

    console.log(`[sync] Fetched ${allProducts.length} products from catalog`);

    // Get existing products
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("compound_id, name, description, product_type, is_active")
      .eq("provider_id", providerId);

    const existingMap = new Map(
      (existing || []).map((p: { compound_id: string }) => [p.compound_id, p])
    );
    const incomingIds = new Set(allProducts.map((p) => `${providerId}:${p.styleCode}`));

    const changesToInsert: Array<{
      id: string; sync_log_id: string; compound_id: string;
      change_type: string; field_name?: string; old_value?: string; new_value?: string;
    }> = [];

    // Upsert products (catalog data only)
    for (const product of allProducts) {
      const compoundId = `${providerId}:${product.styleCode}`;
      const existingProduct = existingMap.get(compoundId) as {
        compound_id: string; name: string; description: string;
        product_type: string; is_active: boolean;
      } | undefined;

      const metadataJson = JSON.stringify({
        fabricWeight: product.fabricWeight, composition: product.composition,
        fit: product.fit, gender: product.gender, coreRange: product.coreRange,
        printingTechniques: product.printingTechniques, productWeight: product.productWeight,
        sizeGuideURL: product.sizeGuideURL, websiteURL: product.websiteURL,
      });

      const now = new Date().toISOString();

      if (!existingProduct) {
        await supabaseAdmin.from("products").upsert({
          compound_id: compoundId,
          provider_id: providerId,
          raw_product_id: product.styleCode,
          name: product.styleName,
          description: product.shortDescription || "",
          product_type: product.productType || "",
          detail_json: "{}",
          metadata_json: metadataJson,
          enriched_at: null, // needs detail fetch
          is_active: true,
          last_synced_at: now,
        });

        productsAdded++;
        changesToInsert.push({
          id: crypto.randomUUID(), sync_log_id: syncLogId,
          compound_id: compoundId, change_type: "added",
        });
      } else {
        const changes: Array<{ field: string; old_val: string; new_val: string }> = [];
        if (existingProduct.name !== product.styleName)
          changes.push({ field: "name", old_val: existingProduct.name, new_val: product.styleName });
        if ((existingProduct.description || "") !== (product.shortDescription || ""))
          changes.push({ field: "description", old_val: existingProduct.description || "", new_val: product.shortDescription || "" });
        if ((existingProduct.product_type || "") !== (product.productType || ""))
          changes.push({ field: "productType", old_val: existingProduct.product_type || "", new_val: product.productType || "" });

        if (changes.length > 0 || !existingProduct.is_active) {
          await supabaseAdmin
            .from("products")
            .update({
              name: product.styleName,
              description: product.shortDescription || "",
              product_type: product.productType || "",
              metadata_json: metadataJson,
              enriched_at: null, // force re-enrichment on catalog change
              is_active: true,
              last_synced_at: now,
            })
            .eq("compound_id", compoundId);

          if (changes.length > 0) {
            productsUpdated++;
            for (const c of changes) {
              changesToInsert.push({
                id: crypto.randomUUID(), sync_log_id: syncLogId,
                compound_id: compoundId, change_type: "updated",
                field_name: c.field, old_value: c.old_val, new_value: c.new_val,
              });
            }
          }
        }
      }
    }

    // Mark removed products as inactive
    for (const [compoundId, existing_] of existingMap) {
      const ex = existing_ as { is_active: boolean };
      if (!incomingIds.has(compoundId) && ex.is_active) {
        await supabaseAdmin
          .from("products")
          .update({ is_active: false, last_synced_at: new Date().toISOString() })
          .eq("compound_id", compoundId);

        productsRemoved++;
        changesToInsert.push({
          id: crypto.randomUUID(), sync_log_id: syncLogId,
          compound_id: compoundId, change_type: "removed",
        });
      }
    }

    // Batch insert changes
    if (changesToInsert.length > 0) {
      for (let i = 0; i < changesToInsert.length; i += 100) {
        await supabaseAdmin.from("sync_changes").insert(changesToInsert.slice(i, i + 100));
      }
    }

    // Get count of products needing enrichment
    const { count: needsEnrichment } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .is("enriched_at", null);

    await supabaseAdmin
      .from("sync_log")
      .update({
        status: "completed", products_added: productsAdded,
        products_updated: productsUpdated, products_removed: productsRemoved,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);

    return {
      phase: "catalog",
      status: "completed",
      syncLogId,
      productsAdded,
      productsUpdated,
      productsRemoved,
      totalFetched: allProducts.length,
      needsEnrichment: needsEnrichment || 0,
    };
  } catch (syncError) {
    const errorMessage = syncError instanceof Error ? syncError.message : "Unknown error";
    await supabaseAdmin
      .from("sync_log")
      .update({
        status: "failed", products_added: productsAdded,
        products_updated: productsUpdated, products_removed: productsRemoved,
        error_message: errorMessage, completed_at: new Date().toISOString(),
      })
      .eq("id", syncLogId);
    throw syncError;
  }
}

/** Fetch with retry on 429 rate limiting */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;

    // Rate limited — wait with exponential backoff
    const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000);
    console.warn(`[enrich] 429 rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  // Final attempt
  return fetch(url, options);
}

/**
 * Phase 2: Enrich details — fetches images, variants, pricing for a batch of products.
 * Called repeatedly until all products are enriched.
 * Each call processes `batchSize` products (default 10) sequentially with rate-limit-aware retries.
 * A 500ms delay between products prevents hitting the AS Colour API rate limit.
 */
async function phaseEnrichDetails(
  supabaseAdmin: ReturnType<typeof createClient>,
  batchSize: number = 10
) {
  const apiUrl = Deno.env.get("ASCOLOUR_API_URL") || "https://api.ascolour.co.nz/v1";
  const subscriptionKey = Deno.env.get("ASCOLOUR_SUBSCRIPTION_KEY")!;
  const apiHeaders = { "Subscription-Key": subscriptionKey, "Content-Type": "application/json" };

  // Get products needing enrichment
  const { data: productsToEnrich } = await supabaseAdmin
    .from("products")
    .select("compound_id, raw_product_id, provider_id")
    .eq("is_active", true)
    .is("enriched_at", null)
    .limit(batchSize);

  if (!productsToEnrich || productsToEnrich.length === 0) {
    const { count: total } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    return { phase: "enrich", enriched: 0, remaining: 0, total: total || 0, errors: 0 };
  }

  // Authenticate for pricing API
  const authEmail = Deno.env.get("ASCOLOUR_EMAIL");
  const authPassword = Deno.env.get("ASCOLOUR_PASSWORD");

  const pricelistMap = new Map<string, ASColourPricelistItem>();
  if (authEmail && authPassword) {
    try {
      const authRes = await fetch(`${apiUrl}/api/authentication`, {
        method: "POST", headers: apiHeaders,
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      if (authRes.ok) {
        const authBody = await authRes.json();
        const bearerToken = authBody.token;
        let pricePage = 1;
        while (true) {
          const res = await fetch(
            `${apiUrl}/catalog/pricelist?pageNumber=${pricePage}&pageSize=250`,
            { headers: { ...apiHeaders, Authorization: `Bearer ${bearerToken}` } }
          );
          if (!res.ok) break;
          const priceBody = await res.json();
          const items: ASColourPricelistItem[] = priceBody.data || [];
          for (const item of items) pricelistMap.set(item.sku, item);
          if (items.length < 250) break;
          pricePage++;
        }
      }
    } catch (e) {
      console.warn("[enrich] Could not fetch pricelist:", e);
    }
  }

  // Fetch global colour hex map
  const colourHexMap = new Map<string, string>();
  try {
    const coloursRes = await fetch(`${apiUrl}/catalog/colours`, { headers: apiHeaders });
    if (coloursRes.ok) {
      const coloursBody = await coloursRes.json();
      const colours: ASColourColour[] = coloursBody.data || [];
      for (const c of colours) colourHexMap.set(c.colour.toLowerCase(), c.hex);
    }
  } catch (e) {
    console.warn("[enrich] Could not fetch colours:", e);
  }

  // Process products sequentially with delay between each to respect rate limits
  let enriched = 0;
  let errors = 0;
  const DELAY_BETWEEN_PRODUCTS_MS = 500;

  for (let idx = 0; idx < productsToEnrich.length; idx++) {
    const product = productsToEnrich[idx];

    if (product.provider_id !== "ascolour") {
      await supabaseAdmin
        .from("products")
        .update({ enriched_at: new Date().toISOString() })
        .eq("compound_id", product.compound_id);
      enriched++;
      continue;
    }

    try {
      // Add delay between products (skip first)
      if (idx > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_PRODUCTS_MS));
      }

      // Fetch images and variants with retry on 429
      const imagesRes = await fetchWithRetry(
        `${apiUrl}/catalog/products/${product.raw_product_id}/images`,
        { headers: apiHeaders }
      );
      const variantsRes = await fetchWithRetry(
        `${apiUrl}/catalog/products/${product.raw_product_id}/variants`,
        { headers: apiHeaders }
      );

      if (!imagesRes.ok) {
        console.error(`[enrich] Images API returned ${imagesRes.status} for ${product.raw_product_id}`);
        errors++;
        continue;
      }
      if (!variantsRes.ok) {
        console.error(`[enrich] Variants API returned ${variantsRes.status} for ${product.raw_product_id}`);
        errors++;
        continue;
      }

      const imagesBody = await imagesRes.json();
      const variantsBody = await variantsRes.json();
      const images: ASColourProductImage[] = imagesBody.data || [];
      const variants: ASColourVariant[] = variantsBody.data || [];

      // Thumbnail
      const hero = images.find((img) => img.imageType === "") || images[0];
      const thumbnailUrl = hero?.urlThumbnail || "";

      // Colors from images
      const colourMap = new Map<string, { front?: ASColourProductImage }>();
      for (const img of images) {
        const imageType = img.imageType.trim();
        if (!imageType || GENERIC_VIEWS.has(imageType)) continue;
        const parts = imageType.split(" - ");
        const colour = parts[0].trim();
        if (GENERIC_VIEWS.has(colour)) continue;
        if (!colourMap.has(colour)) colourMap.set(colour, {});
        const view = parts[1]?.trim().toLowerCase() || "front";
        if (view === "front" || parts.length === 1) {
          colourMap.get(colour)!.front = img;
        }
      }

      // Also add colours from variants
      const activeVariants = variants.filter((v) => !v.discontinued);
      for (const v of activeVariants) {
        if (!colourMap.has(v.colour)) colourMap.set(v.colour, {});
      }

      const colorsJson = JSON.stringify(
        Array.from(colourMap.entries()).map(([name, views]) => ({
          name,
          hex: colourHexMap.get(name.toLowerCase()) || DEFAULT_COLOUR_HEX,
          thumbnailUrl: views.front?.urlTiny || null,
        }))
      );

      // Sizes
      const sizeSet = new Set<string>();
      for (const v of activeVariants) sizeSet.add(v.sizeCode);
      const sizesJson = JSON.stringify(sortSizes(Array.from(sizeSet)));

      // Price
      let basePriceCents: number | null = null;
      let currency: string | null = null;
      for (const v of activeVariants) {
        const priceEntry = pricelistMap.get(v.sku);
        if (priceEntry) {
          const retailCents = Math.round(applyMarkup(priceEntry.price) * 100);
          if (basePriceCents === null || retailCents < basePriceCents) {
            basePriceCents = retailCents;
            currency = priceEntry.currency;
          }
        }
      }

      // Detail JSON
      const detailJson = JSON.stringify({ images, variants });

      await supabaseAdmin
        .from("products")
        .update({
          thumbnail_url: thumbnailUrl,
          detail_json: detailJson,
          colors_json: colorsJson,
          sizes_json: sizesJson,
          base_price_cents: basePriceCents,
          currency,
          enriched_at: new Date().toISOString(),
        })
        .eq("compound_id", product.compound_id);

      enriched++;
      console.log(`[enrich] ${product.compound_id} done (${enriched}/${productsToEnrich.length})`);
    } catch (err) {
      console.error(`[enrich] Failed ${product.compound_id}:`, err);
      errors++;
    }
  }

  // Get remaining count
  const { count: remaining } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .is("enriched_at", null);

  const { count: total } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  return {
    phase: "enrich",
    enriched,
    remaining: remaining || 0,
    total: total || 0,
    errors,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = await verifyAdmin(req);
    const body = await req.json().catch(() => ({}));

    // phase: "catalog" (default) | "enrich"
    const phase = body.phase || "catalog";
    const batchSize = body.batchSize || 20;

    let result;
    if (phase === "enrich") {
      result = await phaseEnrichDetails(supabaseAdmin, batchSize);
    } else {
      result = await phaseCatalogSync(supabaseAdmin);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 500;
    console.error("sync-products error:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
