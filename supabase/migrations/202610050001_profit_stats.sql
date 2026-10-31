-- Tulip: real PROFIT in the admin dashboard.
-- profit = (subtotal - discount) - sum(qty * cost)   — products only, shipping excluded, cancelled orders ignored.
-- `cost` is saved on every order line (items[].cost) when the order is placed. An order whose lines don't ALL have a
-- cost is counted in "costMissing" and left out of the profit numbers (never counted as 100 % profit).
-- Safe to re-run. Run AFTER the earlier migrations.

create or replace function public.admin_order_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with cairo as (
    select (now() at time zone 'Africa/Cairo')::date as today,
           date_trunc('month', now() at time zone 'Africa/Cairo') as month_start
  ),
  o as (
    select ord.id, ord.status, ord.created_at,
           (ord.subtotal - ord.discount) as net,
           coalesce((select sum((l->>'qty')::numeric * (l->>'cost')::numeric)
                       from jsonb_array_elements(ord.items) l where jsonb_typeof(l->'cost') = 'number'), 0) as cost,
           (jsonb_array_length(ord.items) > 0 and not exists (
              select 1 from jsonb_array_elements(ord.items) l where jsonb_typeof(l->'cost') is distinct from 'number')) as cost_ok,
           (ord.created_at at time zone 'Africa/Cairo') as local_ts
    from public.orders ord
  )
  select jsonb_build_object(
    'total', (select count(*) from o),
    'counts', coalesce((select jsonb_object_agg(s.status, s.c) from (select status, count(*) as c from o group by status) s), '{}'::jsonb),
    -- sales (products after discount, shipping excluded, cancelled excluded)
    'revenue',      coalesce((select sum(net) from o where status <> 'cancelled'), 0),
    'monthRevenue', coalesce((select sum(o.net) from o, cairo where o.status <> 'cancelled' and o.local_ts >= cairo.month_start), 0),
    'todayRevenue', coalesce((select sum(o.net) from o, cairo where o.status <> 'cancelled' and o.local_ts::date = cairo.today), 0),
    'todayOrders',  coalesce((select count(*) from o, cairo where o.local_ts::date = cairo.today), 0),
    -- profit (only orders whose cost is fully known)
    'profit',      coalesce((select sum(net - cost) from o where status <> 'cancelled' and cost_ok), 0),
    'monthProfit', coalesce((select sum(o.net - o.cost) from o, cairo where o.status <> 'cancelled' and o.cost_ok and o.local_ts >= cairo.month_start), 0),
    'todayProfit', coalesce((select sum(o.net - o.cost) from o, cairo where o.status <> 'cancelled' and o.cost_ok and o.local_ts::date = cairo.today), 0),
    'costMissing', coalesce((select count(*) from o where status <> 'cancelled' and not cost_ok), 0),
    'topProducts', coalesce((select jsonb_agg(to_jsonb(p)) from (
        select it->>'name' as name,
               sum((it->>'qty')::int) as units,
               sum((it->>'qty')::int * (it->>'price')::numeric) as revenue
        from public.orders ord, jsonb_array_elements(ord.items) it
        where ord.status <> 'cancelled'
        group by it->>'id', it->>'name'
        order by revenue desc
        limit 8) p), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_order_stats() from public, anon, authenticated;
grant execute on function public.admin_order_stats() to service_role;
