'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, TrendingUp, Clock } from 'lucide-react';

interface Quote {
  id: string;
  designState: {
    productId: string;
    colorId: string;
    quantity: number;
  };
  quote: {
    quantity: number;
    totalCost: number;
    costPerUnit: number;
  };
  lead?: {
    name: string;
    email: string;
    brandName?: string;
    isSellingThese: boolean;
    category: 'self-serve-small' | 'mid-tier' | 'high-intent';
  };
  status: 'started' | 'saved' | 'high-intent' | 'contact-requested';
  createdAt: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: Quote['status']) {
  const styles = {
    started: 'bg-gray-100 text-gray-700',
    saved: 'bg-blue-100 text-blue-700',
    'high-intent': 'bg-yellow-100 text-yellow-700',
    'contact-requested': 'bg-green-100 text-green-700',
  };

  const labels = {
    started: 'Started',
    saved: 'Saved',
    'high-intent': 'High Intent',
    'contact-requested': 'Contact Requested',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

type LeadCategory = 'self-serve-small' | 'mid-tier' | 'high-intent';

function getCategoryBadge(category?: LeadCategory) {
  if (!category) return null;

  const styles: Record<LeadCategory, string> = {
    'self-serve-small': 'bg-gray-100 text-gray-600',
    'mid-tier': 'bg-purple-100 text-purple-700',
    'high-intent': 'bg-orange-100 text-orange-700',
  };

  const labels: Record<LeadCategory, string> = {
    'self-serve-small': 'Self-Serve',
    'mid-tier': 'Mid-Tier',
    'high-intent': 'High Intent',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category]}`}>
      {labels[category]}
    </span>
  );
}

export default function AdminPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const totalQuotes = quotes.length;
  const savedQuotes = quotes.filter((q) => q.lead?.email).length;
  const highIntentQuotes = quotes.filter((q) => q.lead?.category === 'high-intent').length;
  const totalEstimatedRevenue = quotes.reduce((sum, q) => sum + (q.quote?.totalCost || 0), 0);
  const avgOrderValue = totalQuotes > 0 ? totalEstimatedRevenue / totalQuotes : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Quote Builder Analytics</p>
            </div>
          </div>
          <button
            onClick={fetchQuotes}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Total Quotes</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalQuotes}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Est. Revenue</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalEstimatedRevenue)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Avg Order Value</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgOrderValue)}</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">High Intent</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{highIntentQuotes}</p>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Started Design</span>
                <span className="text-sm font-medium">{totalQuotes}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Emailed Quote</span>
                <span className="text-sm font-medium">{savedQuotes}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-green-500 rounded-full"
                  style={{ width: totalQuotes > 0 ? `${(savedQuotes / totalQuotes) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">High Intent</span>
                <span className="text-sm font-medium">{highIntentQuotes}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-orange-500 rounded-full"
                  style={{ width: totalQuotes > 0 ? `${(highIntentQuotes / totalQuotes) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Quotes</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : quotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No quotes yet. Share the builder link to start collecting leads!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Est. Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {quote.lead ? (
                          <div>
                            <p className="font-medium text-gray-900">{quote.lead.name}</p>
                            <p className="text-sm text-gray-500">{quote.lead.email}</p>
                            {quote.lead.brandName && (
                              <p className="text-xs text-gray-400">{quote.lead.brandName}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Anonymous</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {quote.quote?.quantity || quote.designState?.quantity || '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {quote.quote?.totalCost ? formatCurrency(quote.quote.totalCost) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getCategoryBadge(quote.lead?.category)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(quote.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
