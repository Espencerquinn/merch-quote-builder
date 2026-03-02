import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function DashboardSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account settings</p>
      </div>

      <SettingsForm
        initialName={session.user.name || ""}
        email={session.user.email || ""}
      />
    </div>
  );
}
