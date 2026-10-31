-- Phase 2: authoritative check the rider app gates live discovery broadcasting on.
-- Returns whether the signed-in rider should appear in nearby discovery (online,
-- approved, and NOT already on an active delivery) plus their vehicle category.
-- Keeps availability server-authoritative so a rider on a trip never broadcasts
-- to the discovery map.
create or replace function public.rider_is_discoverable()
returns table (discoverable boolean, vehicle text)
language sql stable security definer set search_path = '' as $$
  select
    (
      private.has_role('rider')
      and exists (
        select 1 from public.riders r
        join public.rider_presence p on p.rider_id = r.id
        where r.id = (select auth.uid()) and r.status = 'approved' and p.is_online
      )
      and not exists (
        select 1 from public.deliveries d
        where d.rider_id = (select auth.uid()) and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
    ) as discoverable,
    (
      select case
        when lower(r.vehicle) ~ 'bajaj|tuk|tri' then 'bajaji'
        when lower(r.vehicle) ~ 'pickup|gari|carry|town' then 'pickup'
        when lower(r.vehicle) ~ 'lori|truck|canter' then 'lori_dogo'
        else 'pikipiki'
      end
      from public.riders r where r.id = (select auth.uid())
    ) as vehicle;
$$;

revoke all on function public.rider_is_discoverable() from public, anon;
grant execute on function public.rider_is_discoverable() to authenticated;
