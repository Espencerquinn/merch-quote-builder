import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Store, ShoppingBag, AlertTriangle, Shirt } from "lucide-react";
import { formatCents } from "@/lib/format";
import { auth } from "@/lib/auth";

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await db.query.stores.findFirst({
    where: eq(stores.slug, slug),
  });

  if (!store) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === store.userId;
  if (!store.isPublished && !isOwner) notFound();

  const products = await db
    .select({
      storeProduct: storeProducts,
      decoratedProduct: decoratedProducts,
    })
    .from(storeProducts)
    .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
    .where(
      and(
        eq(storeProducts.storeId, store.id),
        eq(storeProducts.isVisible, true)
      )
    );

  const theme = store.themeConfig ? JSON.parse(store.themeConfig) : {};
  const primaryColor = theme.primaryColor || "#3b82f6";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Preview Banner */}
      {!store.isPublished && isOwner && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>This store is not published. Only you can see this preview.</span>
            <Link
              href={`/dashboard/stores/${store.id}`}
              className="ml-auto font-medium text-yellow-900 hover:underline"
            >
              Manage Store
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        {store.headerImageUrl && (
          <div className="h-48 md:h-56 bg-gray-100 overflow-hidden">
            <img
              src={store.headerImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-16 h-16 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Store className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{store.name}</h1>
              {store.description && (
                <p className="text-gray-500 mt-1 max-w-xl">{store.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Products */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-10 w-full">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-500">Check back soon for new products!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map(({ storeProduct, decoratedProduct }) => (
                <Link
                  key={storeProduct.id}
                  href={`/store/${slug}/products/${storeProduct.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {decoratedProduct?.thumbnailUrl ? (
                      <img
                        src={decoratedProduct.thumbnailUrl}
                        alt={storeProduct.displayName || decoratedProduct?.name || ""}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="font-medium text-gray-900 text-sm md:text-base group-hover:text-blue-600 transition-colors line-clamp-2">
                      {storeProduct.displayName || decoratedProduct?.name}
                    </h3>
                    <p className="text-base md:text-lg font-bold text-gray-900 mt-1">
                      {formatCents(storeProduct.sellingPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
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
