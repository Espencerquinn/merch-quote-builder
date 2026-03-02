import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Pencil, ShoppingBag, Store, Trash2 } from "lucide-react";
import DeleteProductButton from "../DeleteProductButton";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const product = await db.query.decoratedProducts.findFirst({
    where: and(
      eq(decoratedProducts.id, id),
      eq(decoratedProducts.userId, session.user.id)
    ),
  });

  if (!product) notFound();

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Preview */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="aspect-square bg-gray-900 flex items-center justify-center">
            {product.thumbnailUrl ? (
              <img
                src={product.thumbnailUrl}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <ShoppingBag className="w-16 h-16 text-gray-700" />
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                product.status === "published"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {product.status}
            </span>
          </div>

          <dl className="mt-6 space-y-3">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Base Product</dt>
              <dd className="text-sm text-gray-300 mt-0.5">{product.baseProductId}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Colour</dt>
              <dd className="text-sm text-gray-300 mt-0.5">{product.selectedColourId}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Created</dt>
              <dd className="text-sm text-gray-300 mt-0.5">
                {new Date(product.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wider">Last Updated</dt>
              <dd className="text-sm text-gray-300 mt-0.5">
                {new Date(product.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="mt-8 space-y-3">
            <Link
              href={`/builder?product=${encodeURIComponent(product.baseProductId)}&edit=${product.id}`}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Design
            </Link>
            <Link
              href={`/dashboard/products/${product.id}/checkout`}
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy This Product
            </Link>
            <Link
              href="/dashboard/stores"
              className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <Store className="w-4 h-4" />
              Add to Store
            </Link>
            <div className="pt-3 border-t border-gray-800">
              <DeleteProductButton productId={product.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
