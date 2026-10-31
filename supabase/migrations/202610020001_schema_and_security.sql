-- Tables (safe to re-run)
create sequence if not exists order_number_seq start 1001;
create table if not exists public.orders (
  id text primary key default nextval('order_number_seq')::text,
  name text not null, phone text not null, address text not null, governorate text not null,
  payment text not null default 'cod', items jsonb not null default '[]',
  subtotal numeric not null default 0, shipping numeric not null default 0, discount numeric not null default 0,
  coupon text, total numeric not null default 0, status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists orders_phone_idx on public.orders(phone);
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id text not null, size text not null default '', color text not null default '',
  stock integer not null default 0 check (stock >= 0), updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique,
  kind text not null check (kind in ('percentage','fixed')), value numeric not null check (value > 0),
  minimum_order numeric not null default 0, max_uses integer, used_count integer not null default 0,
  expires_at timestamptz, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id text, customer_phone text not null, created_at timestamptz not null default now(),
  unique (coupon_id, customer_phone)
);

-- RLS: no policies = anon/authenticated cannot touch anything. The server uses the service role.
alter table public.orders enable row level security;
alter table public.inventory enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;

-- Create order. Variants with no inventory rows are not tracked (Sanity inStock decides).
create or replace function public.create_order_atomic(payload jsonb, inventory_items jsonb, coupon_id uuid default null, coupon_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare created_id text; item jsonb;
begin
  for item in select * from jsonb_array_elements(inventory_items) loop
    update inventory set stock = stock - (item->>'qty')::integer, updated_at = now()
      where product_id = item->>'product_id' and color = coalesce(item->>'color','') and size = coalesce(item->>'size','')
        and stock >= (item->>'qty')::integer;
    if not found and exists (select 1 from inventory where product_id = item->>'product_id') then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end loop;
  insert into orders(name, phone, address, governorate, payment, items, subtotal, shipping, discount, coupon, total)
  values (payload->>'name', payload->>'phone', payload->>'address', payload->>'governorate', 'cod', payload->'items',
    (payload->>'subtotal')::numeric, (payload->>'shipping')::numeric, (payload->>'discount')::numeric, nullif(payload->>'coupon',''), (payload->>'total')::numeric)
  returning id into created_id;
  if coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = coupon_id and (max_uses is null or used_count < max_uses);
    if not found then raise exception 'COUPON_LIMIT_REACHED'; end if;
    insert into coupon_usages(coupon_id, order_id, customer_phone) values (coupon_id, created_id, coupon_phone);
  end if;
  return created_id;
end; $$;

-- Cancel: status + stock restore + coupon release in one transaction.
create or replace function public.cancel_order_atomic(p_id text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; it jsonb;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_phone is not null and (o.phone <> p_phone or o.status not in ('new','confirmed')) then raise exception 'NOT_ALLOWED'; end if;
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

revoke all on function public.create_order_atomic(jsonb,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.cancel_order_atomic(text,text) from public, anon, authenticated;
grant execute on function public.create_order_atomic(jsonb,jsonb,uuid,text) to service_role;
grant execute on function public.cancel_order_atomic(text,text) to service_role;
