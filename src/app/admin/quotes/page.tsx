import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

const statusStyles: Record<string, string> = {
  started: "bg-gray-100 text-gray-700",
  saved: "bg-blue-100 text-blue-700",
  "high-intent": "bg-yellow-100 text-yellow-700",
  "contact-requested": "bg-green-100 text-green-700",
};

export default async function AdminQuotesPage() {
  const allQuotes = await db
    .select()
    .from(quotes)
    .orderBy(desc(quotes.createdAt));

  const parsed = allQuotes.map((q) => {
    const design = JSON.parse(q.designStateJson || "{}");
    const quote = JSON.parse(q.quoteJson || "{}");
    const lead = q.leadJson ? JSON.parse(q.leadJson) : null;
    return { ...q, design, quote, lead };
  });

  const totalQuotes = parsed.length;
  const savedQuotes = parsed.filter((q) => q.lead?.email).length;
  const highIntent = parsed.filter((q) => q.lead?.category === "high-intent").length;
  const totalRevenue = parsed.reduce((sum, q) => sum + (q.quote?.totalCost || 0), 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Quotes</h1>

      {/* Funnel */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-gray-600">Started</span>
              <span className="font-medium">{totalQuotes}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex-1">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-gray-600">Emailed</span>
              <span className="font-medium">{savedQuotes}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full"
                style={{ width: totalQuotes > 0 ? `${(savedQuotes / totalQuotes) * 100}%` : "0%" }}
              />
            </div>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex-1">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-gray-600">High Intent</span>
              <span className="font-medium">{highIntent}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-orange-500 rounded-full"
                style={{ width: totalQuotes > 0 ? `${(highIntent / totalQuotes) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {parsed.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No quotes yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsed.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {q.lead ? (
                        <div>
                          <p className="font-medium text-gray-900">{q.lead.name}</p>
                          <p className="text-sm text-gray-500">{q.lead.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{q.quote?.quantity || "-"}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {q.quote?.totalCost ? formatCurrency(q.quote.totalCost) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {q.lead?.category && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          q.lead.category === "high-intent"
                            ? "bg-orange-100 text-orange-700"
                            : q.lead.category === "mid-tier"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {q.lead.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[q.status] || "bg-gray-100 text-gray-700"}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
