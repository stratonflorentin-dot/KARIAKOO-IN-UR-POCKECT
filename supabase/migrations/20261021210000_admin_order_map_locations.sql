-- Give administrators map pins for an order without opening raw location tables.
-- Rider coordinates are returned only for active deliveries and recent GPS fixes.
create or replace function public.admin_get_order_map_locations(
  p_order_id uuid
) returns table (
  kind text,
  lat double precision,
  lng double precision
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.has_role('admin') then
    raise exception 'Only admins can view order map locations' using errcode = '42501';
  end if;

  return query
    select 'rider'::text, p.lat, p.lng
    from public.deliveries d
    join public.rider_presence p on p.rider_id = d.rider_id
    where d.order_id = p_order_id
      and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      and p.is_online
      and p.lat is not null and p.lng is not null
      and p.updated_at > now() - interval '2 minutes'
    union all
    select 'dropoff'::text, l.lat, l.lng
    from public.order_dropoff_locations l
    where l.order_id = p_order_id;
end;
$$;

revoke execute on function public.admin_get_order_map_locations(uuid) from public, anon;
grant execute on function public.admin_get_order_map_locations(uuid) to authenticated;
