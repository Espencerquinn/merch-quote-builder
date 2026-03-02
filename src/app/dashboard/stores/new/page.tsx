import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CreateStoreForm from "./CreateStoreForm";

export default async function NewStorePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/dashboard/stores"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stores
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Create a Store</h1>
      <p className="text-gray-400 mb-8">
        Set up your merch storefront. You can customize it further after creation.
      </p>

      <CreateStoreForm />
    </div>
  );
}
