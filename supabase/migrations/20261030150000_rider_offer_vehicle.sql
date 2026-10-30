-- Fix: a pre-accept delivery offer showed the wrong vehicle (e.g. a Bajaji fare
-- was mislabelled Pikipiki) because RLS hides the order's instructions until the
-- rider accepts, so the offer card fell back to guessing the vehicle from the
-- payout amount. The chosen vehicle is stored as an "[Usafiri: <name> (...)]"
-- marker in the order instructions. This exposes JUST that vehicle name (not the
-- private instructions/address) for orders the caller has a pending offer on, so
-- the offer card can show the real vehicle.
create or replace function public.rider_offer_vehicles()
returns table (order_id uuid, vehicle text)
language sql stable security definer set search_path = '' as $$
  select o.id, btrim(substring(o.instructions from '\[Usafiri:\s*([^(]+)'))
  from public.delivery_offers off
  join public.orders o on o.id = off.order_id
  where off.rider_id = (select auth.uid())
    and off.status = 'pending'
    and off.expires_at > now()
    and o.instructions ~ '\[Usafiri:';
$$;

revoke execute on function public.rider_offer_vehicles() from public, anon;
grant execute on function public.rider_offer_vehicles() to authenticated;
