-- Let a seller deliberately publish their shop's pickup coordinates.
-- Approved shop coordinates are already visible on the customer storefront;
-- assigned riders read them for pickup navigation.

create or replace function public.seller_set_shop_location(
  p_lat double precision,
  p_lng double precision
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('seller') then
    raise exception 'Only sellers can update a shop location' using errcode = '42501';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Provide both coordinates or clear both' using errcode = '22023';
  end if;
  if p_lat is not null and (p_lat < -90 or p_lat > 90) then
    raise exception 'Latitude out of range' using errcode = '22003';
  end if;
  if p_lng is not null and (p_lng < -180 or p_lng > 180) then
    raise exception 'Longitude out of range' using errcode = '22003';
  end if;

  update public.shops
    set lat = p_lat, lng = p_lng
    where owner_id = caller and is_demo = false;

  if not found then
    raise exception 'No business shop is linked to this seller' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.seller_set_shop_location(double precision, double precision) from public, anon;
grant execute on function public.seller_set_shop_location(double precision, double precision) to authenticated;
