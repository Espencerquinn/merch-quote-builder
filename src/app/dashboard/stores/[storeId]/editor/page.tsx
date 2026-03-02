import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import StoreEditorForm from "./StoreEditorForm";

export default async function StoreEditorPage({
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

  const theme = store.themeConfig ? JSON.parse(store.themeConfig) : {};

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/dashboard/stores/${storeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {store.name}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Customize Store</h1>
      <p className="text-gray-400 mb-8">
        Update your store&apos;s branding and appearance.
      </p>

      <StoreEditorForm
        storeId={store.id}
        initialName={store.name}
        initialDescription={store.description || ""}
        initialPrimaryColor={theme.primaryColor || "#3b82f6"}
        initialLogoUrl={store.logoUrl || ""}
        initialHeaderImageUrl={store.headerImageUrl || ""}
      />
    </div>
  );
}
