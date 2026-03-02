import { db } from "@/lib/db";
import { platformSettings, userPricingOverrides, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DollarSign, Percent } from "lucide-react";
import DefaultMarkupForm from "./DefaultMarkupForm";
import UserOverrideManager from "./UserOverrideManager";

export default async function AdminPricingPage() {
  const [setting, overrides, allUsers] = await Promise.all([
    db.query.platformSettings.findFirst({
      where: eq(platformSettings.key, "default_blank_markup_percent"),
    }),
    db
      .select({
        override: userPricingOverrides,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userPricingOverrides)
      .leftJoin(users, eq(userPricingOverrides.userId, users.id)),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users),
  ]);

  const defaultMarkup = parseInt(setting?.value ?? "50", 10);
  const overrideUserIds = new Set(overrides.map((o) => o.override.userId));

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Controls</h1>
        <p className="text-gray-500 mt-1">
          Set the default markup on blank products and create per-user discounts.
        </p>
      </div>

      {/* Default Markup */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Default Blank Markup</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This percentage is applied on top of the wholesale blank cost to determine
          the base retail price shown to all users. For example, if a blank costs $8
          and markup is 50%, users see $12.
        </p>
        <DefaultMarkupForm initialValue={defaultMarkup} />
      </div>

      {/* User Overrides */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900">Per-User Pricing Overrides</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Override the default markup for specific users. A lower percentage means they
          get a discounted rate on blank products.
        </p>
        <UserOverrideManager
          overrides={overrides.map(({ override, userName, userEmail }) => ({
            id: override.id,
            userId: override.userId,
            userName: userName || "Unknown",
            userEmail: userEmail || "",
            blankMarkupPercent: override.blankMarkupPercent,
            note: override.note,
          }))}
          availableUsers={allUsers
            .filter((u) => !overrideUserIds.has(u.id))
            .map((u) => ({
              id: u.id,
              name: u.name || "Unknown",
              email: u.email,
            }))}
          defaultMarkup={defaultMarkup}
        />
      </div>
    </div>
  );
}
