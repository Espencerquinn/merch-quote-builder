import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeProducts, decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { formatCents } from "@/lib/format";
import AddProductModal from "./AddProductModal";
import RemoveProductButton from "./RemoveProductButton";

export default async function StoreProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { storeId } = await params;

  const store = await db.query.stores.findFirst({
    where: and(eq(stores.id, storeId), eq(stores.userId, session.user.id)),
  });

  if (!store) notFound();

  // Get store products with decorated product details
  const products = await db
    .select({
      storeProduct: storeProducts,
      decoratedProduct: decoratedProducts,
    })
    .from(storeProducts)
    .leftJoin(decoratedProducts, eq(storeProducts.decoratedProductId, decoratedProducts.id))
    .where(eq(storeProducts.storeId, storeId));

  // Get user's decorated products that aren't already in this store
  const existingProductIds = products.map((p) => p.storeProduct.decoratedProductId);
  const availableProducts = await db
    .select()
    .from(decoratedProducts)
    .where(eq(decoratedProducts.userId, session.user.id));
  const filteredAvailable = availableProducts.filter(
    (p) => !existingProductIds.includes(p.id)
  );

  return (
    <div className="p-8">
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {store.name}
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Store Products</h1>
          <p className="text-gray-400 mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} in {store.name}
          </p>
        </div>
        <AddProductModal
          storeId={storeId}
          availableProducts={filteredAvailable.map((p) => ({
            id: p.id,
            name: p.name,
            baseProductId: p.baseProductId,
            selectedColourId: p.selectedColourId,
            thumbnailUrl: p.thumbnailUrl,
          }))}
        />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No products yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Add your decorated products to this store to start selling.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(({ storeProduct, decoratedProduct }) => (
            <div
              key={storeProduct.id}
              className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  {decoratedProduct?.thumbnailUrl ? (
                    <img
                      src={decoratedProduct.thumbnailUrl}
                      alt={storeProduct.displayName || ""}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-700" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {storeProduct.displayName || decoratedProduct?.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>
                      Markup: {storeProduct.markupType === "percentage"
                        ? `${storeProduct.markupValue}%`
                        : formatCents(storeProduct.markupValue)}
                    </span>
                    <span>
                      Price: {formatCents(storeProduct.sellingPrice)}
                    </span>
                    <span
                      className={
                        storeProduct.isVisible
                          ? "text-green-500"
                          : "text-gray-600"
                      }
                    >
                      {storeProduct.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>
              </div>
              <RemoveProductButton storeProductId={storeProduct.id} storeId={storeId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
