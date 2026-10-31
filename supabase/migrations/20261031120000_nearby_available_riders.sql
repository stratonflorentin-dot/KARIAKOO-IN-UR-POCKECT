-- Nearby rider discovery for the pre-order customer map. Returns COARSE,
-- DE-IDENTIFIED points only (vehicle category + a position snapped to a ~200 m
-- grid + real distance) — never a rider id or raw GPS row — so a customer can
-- see "riders near me" without being able to track any individual rider. Precise
-- live GPS stays reserved for the rider assigned to the customer's own order
-- (customer_get_order_rider_location). Eligibility matches dispatch: online,
-- approved, fresh (<90 s), and not already on an active delivery.

create index if not exists rider_presence_live_idx on public.rider_presence (lat, lng) where is_online;

create or replace function public.nearby_available_riders(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 5000,
  p_vehicle text default null
) returns table (vehicle text, approx_lat double precision, approx_lng double precision, distance_m integer)
language sql stable security definer set search_path = '' as $$
  with p as (
    select p_lat as lat, p_lng as lng,
           greatest(200, least(coalesce(p_radius_m, 5000), 20000)) as radius
  ),
  box as (
    select lat, lng, radius,
           radius / 111320.0 as dlat,
           (radius / 111320.0) / greatest(cos(radians(lat)), 0.01) as dlng
    from p
  ),
  elig as (
    select
      case
        when lower(r.vehicle) ~ 'bajaj|tuk|tri' then 'bajaji'
        when lower(r.vehicle) ~ 'pickup|gari|carry|town' then 'pickup'
        when lower(r.vehicle) ~ 'lori|truck|canter' then 'lori_dogo'
        else 'pikipiki'
      end as veh,
      pr.lat as rlat, pr.lng as rlng,
      (2 * 6371000 * asin(sqrt(
        power(sin(radians(pr.lat - box.lat) / 2), 2) +
        cos(radians(box.lat)) * cos(radians(pr.lat)) * power(sin(radians(pr.lng - box.lng) / 2), 2)
      )))::int as dm
    from public.rider_presence pr
    join public.riders r on r.id = pr.rider_id
    cross join box
    where pr.is_online
      and r.status = 'approved'
      and pr.updated_at > now() - interval '90 seconds'
      and pr.lat is not null and pr.lng is not null
      and pr.lat between box.lat - box.dlat and box.lat + box.dlat
      and pr.lng between box.lng - box.dlng and box.lng + box.dlng
      and not exists (
        select 1 from public.deliveries d
        where d.rider_id = pr.rider_id and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
  )
  select
    e.veh,
    round(e.rlat / 0.002) * 0.002,   -- snap to ~200 m grid (privacy)
    round(e.rlng / 0.002) * 0.002,
    e.dm
  from elig e cross join p
  where e.dm <= p.radius
    and (p_vehicle is null or e.veh = p_vehicle)
  order by e.dm
  limit 50;
$$;

revoke all on function public.nearby_available_riders(double precision, double precision, integer, text) from public;
-- De-identified discovery is safe for signed-in customers and guest browsers.
grant execute on function public.nearby_available_riders(double precision, double precision, integer, text) to anon, authenticated;
