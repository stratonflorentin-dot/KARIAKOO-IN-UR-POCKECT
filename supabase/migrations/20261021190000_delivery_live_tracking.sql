-- Expose only the assigned rider's fresh location to the customer who owns
-- an active delivery. Raw rider_presence remains private to the rider/admin.
create or replace function public.customer_get_order_rider_location(
  p_order_id uuid
) returns table (
  lat double precision,
  lng double precision,
  updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.lat, p.lng, p.updated_at
  from public.orders o
  join public.deliveries d on d.order_id = o.id
  join public.rider_presence p on p.rider_id = d.rider_id
  where o.id = p_order_id
    and o.customer_id = (select auth.uid())
    and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
    and p.is_online
    and p.lat is not null
    and p.lng is not null
    and p.updated_at > now() - interval '2 minutes'
  limit 1;
$$;

revoke execute on function public.customer_get_order_rider_location(uuid) from public, anon;
grant execute on function public.customer_get_order_rider_location(uuid) to authenticated;
