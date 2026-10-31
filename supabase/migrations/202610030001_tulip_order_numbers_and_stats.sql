-- Tulip: unique order numbers (TULIP-123456), safer cancel, fast admin stats.
-- Safe to re-run. Run AFTER the two earlier migrations.

-- 0) Make sure public.orders.id can hold "TULIP-123456".
-- An older orders table may have id as an auto-number (identity / serial / bigint / uuid). Convert it to text.
-- Existing orders keep their data: 7 becomes '7' (the optional rename script can turn those into TULIP numbers later).
do $$
declare col record;
begin
  if to_regclass('public.orders') is null then return; end if;
  select data_type, is_identity into col
    from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'id';
  if not found then return; end if;
  if col.is_identity = 'YES' then
    execute 'alter table public.orders alter column id drop identity if exists';
  end if;
  if col.data_type <> 'text' then
    execute 'alter table public.orders alter column id drop default';
    execute 'alter table public.orders alter column id type text using id::text';
  end if;
end $$;

-- Columns the app writes/reads (no-ops if they already exist).
alter table public.orders add column if not exists name text;
alter table public.orders add column if not exists phone text;
alter table public.orders add column if not exists address text;
alter table public.orders add column if not exists governorate text;
alter table public.orders add column if not exists payment text not null default 'cod';
alter table public.orders add column if not exists items jsonb not null default '[]';
alter table public.orders add column if not exists subtotal numeric not null default 0;
alter table public.orders add column if not exists shipping numeric not null default 0;
alter table public.orders add column if not exists discount numeric not null default 0;
alter table public.orders add column if not exists coupon text;
alter table public.orders add column if not exists total numeric not null default 0;
alter table public.orders add column if not exists status text not null default 'new';
alter table public.orders add column if not exists created_at timestamptz not null default now();

-- 1) Order number generator: TULIP- + 6 random digits, never reused.
create or replace function public.generate_tulip_order_id()
returns text language plpgsql as $$
declare candidate text; tries int := 0;
begin
  loop
    candidate := 'TULIP-' || (100000 + floor(random() * 900000))::int::text;
    exit when not exists (select 1 from public.orders where id = candidate);
    tries := tries + 1;
    if tries > 30 then raise exception 'ORDER_ID_EXHAUSTED'; end if;
  end loop;
  return candidate;
end; $$;

-- Any insert that does not pass an id still gets a proper TULIP number.
alter table public.orders alter column id set default public.generate_tulip_order_id();

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);

-- 2) Create order (same signature as before, now with TULIP numbers + collision retry).
create or replace function public.create_order_atomic(payload jsonb, inventory_items jsonb, coupon_id uuid default null, coupon_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare created_id text; item jsonb; attempt int := 0;
begin
  for item in select * from jsonb_array_elements(inventory_items) loop
    update inventory set stock = stock - (item->>'qty')::integer, updated_at = now()
      where product_id = item->>'product_id' and color = coalesce(item->>'color','') and size = coalesce(item->>'size','')
        and stock >= (item->>'qty')::integer;
    if not found and exists (select 1 from inventory where product_id = item->>'product_id') then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end loop;

  loop
    attempt := attempt + 1;
    begin
      insert into orders(id, name, phone, address, governorate, payment, items, subtotal, shipping, discount, coupon, total)
      values (public.generate_tulip_order_id(), payload->>'name', payload->>'phone', payload->>'address', payload->>'governorate', 'cod', payload->'items',
        (payload->>'subtotal')::numeric, (payload->>'shipping')::numeric, (payload->>'discount')::numeric, nullif(payload->>'coupon',''), (payload->>'total')::numeric)
      returning id into created_id;
      exit;
    exception when unique_violation then
      if attempt >= 5 then raise; end if;
    end;
  end loop;

  if coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = coupon_id and (max_uses is null or used_count < max_uses);
    if not found then raise exception 'COUPON_LIMIT_REACHED'; end if;
    insert into coupon_usages(coupon_id, order_id, customer_phone) values (coupon_id, created_id, coupon_phone);
  end if;
  return created_id;
end; $$;

-- 3) Cancel: customers only while new/confirmed; admin never on delivered orders.
create or replace function public.cancel_order_atomic(p_id text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it jsonb;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_phone is not null and (o.phone <> p_phone or o.status not in ('new','confirmed','cancelled')) then raise exception 'NOT_ALLOWED'; end if;
  if p_phone is null and o.status = 'delivered' then raise exception 'NOT_ALLOWED'; end if;
  if o.status = 'cancelled' then return to_jsonb(o); end if;
  for it in select * from jsonb_array_elements(o.items) loop
    update inventory set stock = stock + (it->>'qty')::integer, updated_at = now()
      where product_id = it->>'id' and color = coalesce(it->>'color','') and size = coalesce(it->>'size','');
  end loop;
  update coupons set used_count = greatest(used_count - 1, 0) where id in (select coupon_id from coupon_usages where order_id = o.id);
  delete from coupon_usages where order_id = o.id;
  update orders set status = 'cancelled' where id = o.id returning * into o;
  return to_jsonb(o);
end; $$;

-- 4) Dashboard numbers computed in the database (works with any number of orders).
create or replace function public.admin_order_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with o as (select * from public.orders),
  cairo as (
    select (now() at time zone 'Africa/Cairo')::date as today,
           date_trunc('month', now() at time zone 'Africa/Cairo') as month_start
  )
  select jsonb_build_object(
    'total', (select count(*) from o),
    'counts', coalesce((select jsonb_object_agg(s.status, s.c) from (select status, count(*) as c from o group by status) s), '{}'::jsonb),
    'revenue', coalesce((select sum(subtotal - discount) from o where status <> 'cancelled'), 0),
    'monthRevenue', coalesce((select sum(o.subtotal - o.discount) from o, cairo
       where o.status <> 'cancelled' and (o.created_at at time zone 'Africa/Cairo') >= cairo.month_start), 0),
    'todayRevenue', coalesce((select sum(o.subtotal - o.discount) from o, cairo
       where o.status <> 'cancelled' and (o.created_at at time zone 'Africa/Cairo')::date = cairo.today), 0),
    'todayOrders', coalesce((select count(*) from o, cairo
       where (o.created_at at time zone 'Africa/Cairo')::date = cairo.today), 0),
    'topProducts', coalesce((select jsonb_agg(to_jsonb(p)) from (
        select it->>'name' as name,
               sum((it->>'qty')::int) as units,
               sum((it->>'qty')::int * (it->>'price')::numeric) as revenue
        from o, jsonb_array_elements(o.items) it
        where o.status <> 'cancelled'
        group by it->>'id', it->>'name'
        order by revenue desc
        limit 8) p), '[]'::jsonb)
  );
$$;

revoke all on function public.create_order_atomic(jsonb,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.cancel_order_atomic(text,text) from public, anon, authenticated;
revoke all on function public.admin_order_stats() from public, anon, authenticated;
revoke all on function public.generate_tulip_order_id() from public, anon, authenticated;
grant execute on function public.create_order_atomic(jsonb,jsonb,uuid,text) to service_role;
grant execute on function public.cancel_order_atomic(text,text) to service_role;
grant execute on function public.admin_order_stats() to service_role;
grant execute on function public.generate_tulip_order_id() to service_role;
