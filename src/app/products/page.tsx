import Link from "next/link";
import { Shirt, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cachedProducts } from "@/lib/db/schema";
import "@/lib/providers/init";
import { getAllProviders } from "@/lib/providers/registry";
import type { ProductSummary } from "@/lib/providers/types";
import ProductCatalog from "./ProductCatalog";

async function getProducts(): Promise<ProductSummary[]> {
  // Try cached products first (select only needed columns)
  const cached = await db
    .select({
      compoundId: cachedProducts.compoundId,
      name: cachedProducts.name,
      description: cachedProducts.description,
      productType: cachedProducts.productType,
      thumbnailUrl: cachedProducts.thumbnailUrl,
      providerId: cachedProducts.providerId,
    })
    .from(cachedProducts);

  if (cached.length > 0) {
    return cached.map((p) => ({
      id: p.compoundId,
      name: p.name,
      description: p.description || "",
      productType: p.productType || "",
      thumbnailUrl: p.thumbnailUrl,
      provider: p.providerId,
    }));
  }

  // Fall back to live API
  const providers = getAllProviders();
  const results = await Promise.all(
    providers.map((p) =>
      p.listProducts().catch((err) => {
        console.error(`Provider ${p.id} failed:`, err);
        return [];
      })
    )
  );
  return results.flat();
}

export default async function ProductsPage() {
  const session = await auth();
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="px-6 py-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shirt className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">Merch Makers</span>
          </Link>
          <nav className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors text-sm"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/builder"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Designer
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Product Catalog</h1>
          <p className="text-gray-400 mt-2">
            Browse {products.length} products. Select one to start designing.
          </p>
        </div>

        <ProductCatalog products={products} />
      </main>
    </div>
  );
}
