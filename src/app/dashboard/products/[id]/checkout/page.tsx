import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decoratedProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import { resolveProductId, getProvider } from "@/lib/providers/registry";
import "@/lib/providers/init";

export default async function CheckoutPage({
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

  // Fetch base product details for sizes and pricing
  let sizes: { id: string; name: string }[] = [];
  let baseRetailPrice = 13; // fallback
  try {
    const { providerId, productId } = resolveProductId(product.baseProductId);
    const provider = getProvider(providerId);
    const detail = await provider.getProduct(productId);
    sizes = detail.sizes;
    if (detail.pricing?.baseRetailPrice) {
      baseRetailPrice = detail.pricing.baseRetailPrice;
    }
  } catch {
    // Use defaults if provider is unavailable
    sizes = [
      { id: "XS", name: "XS" },
      { id: "S", name: "S" },
      { id: "M", name: "M" },
      { id: "L", name: "L" },
      { id: "XL", name: "XL" },
      { id: "2XL", name: "2XL" },
    ];
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href={`/dashboard/products/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Product
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Order: {product.name}</h1>
      <p className="text-gray-400 mb-8">Select sizes and quantities to complete your order.</p>

      <CheckoutForm
        decoratedProductId={product.id}
        productName={product.name}
        sizes={sizes}
        baseRetailPrice={baseRetailPrice}
      />
    </div>
  );
}
