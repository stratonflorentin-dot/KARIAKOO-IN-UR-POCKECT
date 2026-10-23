-- Let a rider read pickup shop details for a delivery assigned to them,
-- including shops that are not publicly listed yet. This exposes no shop to
-- riders who do not have an assignment containing that shop.
drop policy if exists "shops: assigned rider reads pickup shops" on public.shops;
create policy "shops: assigned rider reads pickup shops" on public.shops
  for select to authenticated
  using (
    public.has_role('rider')
    and exists (
      select 1
      from public.order_items oi
      where oi.shop_id = shops.id
        and public.is_assigned_rider(oi.order_id)
    )
  );
