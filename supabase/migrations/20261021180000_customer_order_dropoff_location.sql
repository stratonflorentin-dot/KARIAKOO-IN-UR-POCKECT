-- Customers may attach precise delivery coordinates to their own orders.
-- Rider access to the coordinates follows the existing orders RLS rules.
create table public.order_dropoff_locations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);
alter table public.order_dropoff_locations enable row level security;
revoke all on public.order_dropoff_locations from public, anon, authenticated;
grant select on public.order_dropoff_locations to authenticated;

create policy order_dropoff_locations_customer_read on public.order_dropoff_locations
  for select to authenticated using (customer_id = (select auth.uid()));
create policy order_dropoff_locations_assigned_rider_read on public.order_dropoff_locations
  for select to authenticated using (
    private.has_role('rider') and exists (
      select 1 from public.deliveries d
      where d.order_id = order_dropoff_locations.order_id
        and d.rider_id = (select auth.uid())
    )
  );

create or replace function public.customer_set_order_dropoff_location(
  p_order_id uuid,
  p_lat double precision,
  p_lng double precision
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('customer') then
    raise exception 'Only customers can set a delivery location' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'Provide both coordinates' using errcode = '22023';
  end if;
  if p_lat < -90 or p_lat > 90 then
    raise exception 'Latitude out of range' using errcode = '22003';
  end if;
  if p_lng < -180 or p_lng > 180 then
    raise exception 'Longitude out of range' using errcode = '22003';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id and customer_id = caller and is_demo = false) then
    raise exception 'Order not found for this customer' using errcode = 'P0002';
  end if;

  insert into public.order_dropoff_locations (order_id, customer_id, lat, lng, updated_at)
    values (p_order_id, caller, p_lat, p_lng, now())
    on conflict (order_id) do update
      set lat = excluded.lat, lng = excluded.lng, updated_at = now()
      where public.order_dropoff_locations.customer_id = caller;
end;
$$;

revoke execute on function public.customer_set_order_dropoff_location(uuid, double precision, double precision) from public, anon;
grant execute on function public.customer_set_order_dropoff_location(uuid, double precision, double precision) to authenticated;
