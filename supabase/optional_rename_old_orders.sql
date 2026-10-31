-- OPTIONAL — run once, only if you have old orders numbered 1, 2, 1001... and want TULIP-###### numbers for them.
-- Not in /migrations on purpose so it never runs by accident. Orders keep their data; coupon usage rows follow the new number.
begin;

create temporary table _tulip_rename on commit drop as
select id as old_id, public.generate_tulip_order_id() as new_id
from public.orders
where id !~ '^TULIP-[0-9]{6}$';

-- generate_tulip_order_id() only checks existing rows, so make sure the batch itself has no duplicates.
do $$
begin
  if (select count(*) from _tulip_rename) <> (select count(distinct new_id) from _tulip_rename) then
    raise exception 'Duplicate generated numbers — just run this script again.';
  end if;
end $$;

update public.coupon_usages u set order_id = r.new_id from _tulip_rename r where u.order_id = r.old_id;
update public.orders o set id = r.new_id from _tulip_rename r where o.id = r.old_id;

commit;
