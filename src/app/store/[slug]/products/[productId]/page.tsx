import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Store, Shirt } from "lucide-react";
import { formatCents } from "@/lib/format";
import { resolveProductId, getProvider } from "@/lib/providers/registry";
import "@/lib/providers/init";
import { auth } from "@/lib/auth";
import StoreProductCheckout from "./StoreProductCheckout";

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;

  const store = await db.query.stores.findFirst({
    where: eq(stores.slug, slug),
  });

  if (!store) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === store.userId;
  if (!store.isPublished && !isOwner) notFound();

  const storeProductResult = await db
    .select({
      storeProduct: storeProducts,
      decoratedProduct: decoratedProducts,
    })
    .from(storeProducts)
    .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
    .where(
      and(
        eq(storeProducts.id, productId),
        eq(storeProducts.storeId, store.id),
        eq(storeProducts.isVisible, true)
      )
    );

  if (storeProductResult.length === 0) notFound();

  const { storeProduct, decoratedProduct } = storeProductResult[0];

  // Fetch sizes from provider
  let sizes: { id: string; name: string }[] = [];
  if (decoratedProduct?.baseProductId) {
    try {
      const { providerId, productId: rawId } = resolveProductId(decoratedProduct.baseProductId);
      const provider = getProvider(providerId);
      const detail = await provider.getProduct(rawId);
      sizes = detail.sizes;
    } catch {
      sizes = [
        { id: "S", name: "S" },
        { id: "M", name: "M" },
        { id: "L", name: "L" },
        { id: "XL", name: "XL" },
        { id: "2XL", name: "2XL" },
      ];
    }
  }

  const theme = store.themeConfig ? JSON.parse(store.themeConfig) : {};
  const primaryColor = theme.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <Store className="w-6 h-6" style={{ color: primaryColor }} />
            )}
            <span className="font-semibold text-gray-900">{store.name}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <Link
          href={`/store/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to store
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="aspect-square bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {decoratedProduct?.thumbnailUrl ? (
              <img
                src={decoratedProduct.thumbnailUrl}
                alt={storeProduct.displayName || ""}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Shirt className="w-20 h-20 text-gray-200" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {storeProduct.displayName || decoratedProduct?.name}
            </h1>
            <p className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
              {formatCents(storeProduct.sellingPrice)}
            </p>

            {storeProduct.description && (
              <p className="text-gray-600 mb-8 leading-relaxed">{storeProduct.description}</p>
            )}

            <StoreProductCheckout
              storeProductId={storeProduct.id}
              storeId={store.id}
              unitPrice={storeProduct.sellingPrice}
              sizes={sizes}
              primaryColor={primaryColor}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm text-gray-400">
            Powered by{" "}
            <Link href="/" className="font-medium hover:text-gray-600 transition-colors" style={{ color: primaryColor }}>
              Merch Makers
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
