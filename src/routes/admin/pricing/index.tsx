import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/admin/pricing/")({
  component: AdminPricingPage,
});

function AdminPricingPage() {
  const [settings, setSettings] = useState<{ key: string; value: string }[]>([]);
  const [overrides, setOverrides] = useState<{ id: string; user_id: string; markup_percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("platform_settings").select("key, value"),
      supabase.from("user_pricing_overrides").select("id, user_id, markup_percentage"),
    ]).then(([settingsRes, overridesRes]) => {
      setSettings(settingsRes.data || []);
      setOverrides(overridesRes.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <DollarSign className="w-6 h-6 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Pricing Controls</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Settings</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {settings.length === 0 ? (
                <p className="text-gray-500">No platform settings configured.</p>
              ) : (
                <div className="space-y-3">
                  {settings.map((s) => (
                    <div key={s.key} className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">{s.key}</span>
                      <span className="text-gray-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Overrides</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {overrides.length === 0 ? (
                <p className="text-gray-500">No user pricing overrides.</p>
              ) : (
                <div className="space-y-3">
                  {overrides.map((o) => (
                    <div key={o.id} className="flex justify-between items-center">
                      <span className="text-gray-700 font-mono text-sm">{o.user_id.slice(0, 8)}</span>
                      <span className="text-gray-900">{o.markup_percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
