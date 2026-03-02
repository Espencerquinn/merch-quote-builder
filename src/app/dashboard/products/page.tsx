import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { decoratedProducts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Plus, Pencil, Trash2, ShoppingBag, Store } from "lucide-react";
import DeleteProductButton from "./DeleteProductButton";

export default async function DashboardProductsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const products = await db
    .select()
    .from(decoratedProducts)
    .where(eq(decoratedProducts.userId, session.user.id))
    .orderBy(desc(decoratedProducts.updatedAt));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Products</h1>
          <p className="text-gray-400 mt-1">
            {products.length} decorated product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No products yet</h3>
          <p className="text-gray-400 mb-6 max-w-sm mx-auto">
            Browse our catalog and design your first custom product.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-900 relative">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-gray-700" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      product.status === "published"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-white truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Base: {product.baseProductId}
                </p>
                <p className="text-xs text-gray-500">
                  Updated {new Date(product.updatedAt).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/builder?product=${encodeURIComponent(product.baseProductId)}&edit=${product.id}`}
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <span className="text-gray-700">|</span>
                  <Link
                    href={`/dashboard/products/${product.id}/checkout`}
                    className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Buy
                  </Link>
                  <span className="text-gray-700">|</span>
                  <Link
                    href="/dashboard/stores"
                    className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Store className="w-3.5 h-3.5" />
                    Store
                  </Link>
                  <span className="text-gray-700">|</span>
                  <DeleteProductButton productId={product.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
