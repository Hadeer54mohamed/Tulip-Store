
create or replace function public.create_order_atomic(payload jsonb, inventory_items jsonb, coupon_id uuid default null, coupon_phone text default null)
returns text language plpgsql security definer set search_path = public as $$
declare created_id text;
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(inventory_items) loop
    update inventory set stock = stock - (item->>'qty')::integer, updated_at = now()
      where product_id = item->>'product_id' and color = coalesce(item->>'color','') and size = coalesce(item->>'size','') and stock >= (item->>'qty')::integer;
    if not found then raise exception 'INSUFFICIENT_STOCK'; end if;
  end loop;
  insert into orders(name, phone, address, governorate, payment, items, subtotal, shipping, discount, coupon, total)
  values (payload->>'name', payload->>'phone', payload->>'address', payload->>'governorate', 'cod', payload->'items', (payload->>'subtotal')::numeric, (payload->>'shipping')::numeric, (payload->>'discount')::numeric, nullif(payload->>'coupon',''), (payload->>'total')::numeric)
  returning id into created_id;
  if coupon_id is not null then
    update coupons set used_count = used_count + 1 where id = coupon_id and (max_uses is null or used_count < max_uses);
    if not found then raise exception 'COUPON_LIMIT_REACHED'; end if;
    insert into coupon_usages(coupon_id, order_id, customer_phone) values (coupon_id, created_id, coupon_phone);
  end if;
  return created_id;
exception when others then raise;
end; $$;
revoke all on function public.create_order_atomic(jsonb,jsonb,uuid,text) from public, anon, authenticated;
grant execute on function public.create_order_atomic(jsonb,jsonb,uuid,text) to service_role;
