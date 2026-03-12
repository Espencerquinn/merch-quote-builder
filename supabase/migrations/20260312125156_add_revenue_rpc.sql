-- Server-side aggregate for total order revenue (avoids loading all rows client-side)
CREATE OR REPLACE FUNCTION sum_order_revenue()
RETURNS bigint AS $$
  SELECT COALESCE(SUM(total_amount), 0)::bigint FROM orders;
$$ LANGUAGE sql SECURITY DEFINER;
