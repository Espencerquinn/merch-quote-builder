import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/admin/quotes/")({
  component: AdminQuotesPage,
});

interface QuoteRow {
  id: string;
  status: string;
  quote_json: string;
  lead_json: string | null;
  created_at: string;
}

function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("quotes")
      .select("id, status, quote_json, lead_json, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setQuotes((data as QuoteRow[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-6 h-6 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : quotes.length === 0 ? (
        <p className="text-gray-500">No quotes submitted yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => {
                const lead = q.lead_json ? JSON.parse(q.lead_json) : null;
                return (
                  <tr key={q.id}>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          q.status === "contact-requested"
                            ? "bg-green-100 text-green-700"
                            : q.status === "high-intent"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{lead?.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(q.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
