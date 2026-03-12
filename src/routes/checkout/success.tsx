import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle, Package, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import { formatCents } from "@/lib/format";

type SuccessSearch = {
  session_id?: string;
};

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>): SuccessSearch => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutSuccessPage,
});

interface OrderData {
  id: string;
  status: string;
  total_amount: number;
}

function CheckoutSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    async function loadOrder() {
      if (!session_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount")
        .eq("stripe_checkout_session_id", session_id)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    }

    if (!authLoading && user) {
      loadOrder();
    }
  }, [session_id, authLoading, user]);

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
        <p className="text-gray-400 mb-8">
          Thank you for your purchase. We&apos;ll start processing your order right away.
        </p>

        {order && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-8 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Order Details</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Order ID</dt>
                <dd className="text-white font-mono text-xs">{order.id.slice(0, 8)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Status</dt>
                <dd className="text-green-400 capitalize">{order.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Total</dt>
                <dd className="text-white font-semibold">{formatCents(order.total_amount)}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard/orders"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                View Orders
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to Dashboard
              </Link>
            </>
          ) : (
            <Link
              to="/"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
