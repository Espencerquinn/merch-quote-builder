import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores, storeConnectors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Plug, ShoppingCart } from "lucide-react";
import ConnectorList from "./ConnectorList";
import AddConnectorForm from "./AddConnectorForm";

export default async function ConnectorsPage({
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

  const connectors = await db
    .select()
    .from(storeConnectors)
    .where(eq(storeConnectors.storeId, storeId));

  // Strip credentials for client
  const safeConnectors = connectors.map(({ credentials, ...rest }) => rest);

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {store.name}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Store Connectors</h1>
      <p className="text-gray-400 mb-8">
        Sync your products to external e-commerce platforms.
      </p>

      {/* Existing Connectors */}
      <ConnectorList connectors={safeConnectors} storeId={storeId} />

      {/* Add New */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Add Connection</h2>
        <AddConnectorForm storeId={storeId} />
      </div>
    </div>
  );
}
