const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_HOSTS = [
  "cdn11.bigcommerce.com",
  "cdn.ascolour.com",
  "images.ascolour.com",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const imageUrl = requestUrl.searchParams.get("url");

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing url query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check host is allowed
    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return new Response(
        JSON.stringify({ error: `Host not allowed: ${parsedUrl.hostname}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error: ${imageResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = imageResponse.headers.get("Content-Type") || "image/jpeg";
    const imageBody = await imageResponse.arrayBuffer();

    return new Response(imageBody, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "CDN-Cache-Control": "public, max-age=604800",
      },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
