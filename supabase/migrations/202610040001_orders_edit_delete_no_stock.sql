-- Tulip: orders no longer touch stock (availability lives in Sanity), customers/admin can edit order items,
-- admin can delete an order for good. Safe to re-run. Run AFTER 202610030001_*.sql.

-- 1) Create order — no inventory any more.
drop function if exists public.create_order_atomic(jsonb, jsonb, uuid, text);
drop function if exists public.create_order_atomic(jsonb, uuid, text);

create or replace function public.create_order_atomic(payload jsonb, coupon_id uuid default null, coupon_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare created_id text; attempt int := 0;
begin
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

-- 2) Cancel — status + coupon release only.
create or replace function public.cancel_order_atomic(p_id text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_phone is not null and (o.phone <> p_phone or o.status not in ('new','confirmed','cancelled')) then raise exception 'NOT_ALLOWED'; end if;
  if p_phone is null and o.status = 'delivered' then raise exception 'NOT_ALLOWED'; end if;
  if o.status = 'cancelled' then return to_jsonb(o); end if;
  update coupons set used_count = greatest(used_count - 1, 0) where id in (select coupon_id from coupon_usages where order_id = o.id);
  delete from coupon_usages where order_id = o.id;
  update orders set status = 'cancelled' where id = o.id returning * into o;
  return to_jsonb(o);
end; $$;

-- 3) Edit an order (items, totals, delivery details) in one locked step.
--    p_phone set  -> customer: phone must match and the order must be new/confirmed.
--    p_phone null -> admin: any order that is not cancelled/delivered.
--    p_patch only needs the keys that change: name, phone, address, governorate, items, subtotal, shipping, discount, total.
create or replace function public.update_order_atomic(p_id text, p_phone text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_phone is not null and (o.phone <> p_phone or o.status not in ('new','confirmed')) then raise exception 'NOT_ALLOWED'; end if;
  if p_phone is null and o.status in ('cancelled','delivered') then raise exception 'NOT_ALLOWED'; end if;
  update orders set
    name        = coalesce(p_patch->>'name', name),
    phone       = coalesce(p_patch->>'phone', phone),
    address     = coalesce(p_patch->>'address', address),
    governorate = coalesce(p_patch->>'governorate', governorate),
    items       = case when p_patch ? 'items' then p_patch->'items' else items end,
    subtotal    = coalesce((p_patch->>'subtotal')::numeric, subtotal),
    shipping    = coalesce((p_patch->>'shipping')::numeric, shipping),
    discount    = coalesce((p_patch->>'discount')::numeric, discount),
    total       = coalesce((p_patch->>'total')::numeric, total)
  where id = o.id returning * into o;
  return to_jsonb(o);
end; $$;

-- 4) Delete an order permanently (admin). A live order gives its coupon use back first.
create or replace function public.delete_order_atomic(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status <> 'cancelled' then
    update coupons set used_count = greatest(used_count - 1, 0) where id in (select coupon_id from coupon_usages where order_id = o.id);
  end if;
  delete from coupon_usages where order_id = o.id;
  delete from orders where id = o.id;
  return true;
end; $$;

revoke all on function public.create_order_atomic(jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.cancel_order_atomic(text,text) from public, anon, authenticated;
revoke all on function public.update_order_atomic(text,text,jsonb) from public, anon, authenticated;
revoke all on function public.delete_order_atomic(text) from public, anon, authenticated;
grant execute on function public.create_order_atomic(jsonb,uuid,text) to service_role;
grant execute on function public.cancel_order_atomic(text,text) to service_role;
grant execute on function public.update_order_atomic(text,text,jsonb) to service_role;
grant execute on function public.delete_order_atomic(text) to service_role;

-- The old stock table is no longer used by the app. It is left in place so nothing is lost;
-- to remove it for good run:  drop table if exists public.inventory;
