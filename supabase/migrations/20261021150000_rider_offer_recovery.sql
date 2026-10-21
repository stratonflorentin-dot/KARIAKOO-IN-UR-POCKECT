-- Keep dispatch working when riders come online after an order is placed,
-- and requeue offers that expire before anyone accepts them.

create or replace function public.rider_refresh_offers()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  target public.deliveries;
  created_id uuid;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can refresh delivery offers' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.riders r
    join public.rider_presence p on p.rider_id = r.id
    where r.id = caller and r.status = 'approved' and p.is_online
  ) then
    return 0;
  end if;

  -- Expire stale offers globally, then return unaccepted deliveries to the
  -- dispatch queue once no rider has a live offer for them.
  update public.delivery_offers
    set status = 'expired', decided_at = now()
    where status = 'pending' and expires_at <= now();

  update public.deliveries d
    set status = 'PENDING_ASSIGNMENT', updated_at = now()
    where d.rider_id is null
      and d.status = 'ASSIGNED'
      and not exists (
        select 1 from public.delivery_offers o
        where o.order_id = d.order_id and o.status = 'pending' and o.expires_at > now()
      );

  -- Send one oldest waiting order at a time to this rider. SKIP LOCKED makes
  -- concurrent rider refreshes safe; the next poll picks up the next order.
  select d.* into target
    from public.deliveries d
    where d.rider_id is null
      and d.status = 'PENDING_ASSIGNMENT'
      and not exists (
        select 1 from public.delivery_offers o
        where o.order_id = d.order_id and o.status = 'pending' and o.expires_at > now()
      )
      and not exists (
        select 1 from public.delivery_offers o
        where o.order_id = d.order_id and o.rider_id = caller and o.status = 'declined'
      )
      and not exists (
        select 1 from public.deliveries active
        where active.rider_id = caller and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
    order by d.updated_at, d.order_id
    for update of d skip locked
    limit 1;

  if not found then
    return 0;
  end if;

  insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
    values (target.order_id, caller, target.rider_payout_tzs, 'pending', now(), now() + interval '45 seconds')
    on conflict (order_id, rider_id) do update
      set status = 'pending', payout_tzs = excluded.payout_tzs,
          offered_at = now(), expires_at = excluded.expires_at, decided_at = null
      where public.delivery_offers.status in ('expired', 'cancelled')
    returning id into created_id;

  if created_id is not null then
    update public.deliveries
      set status = 'ASSIGNED', updated_at = now()
      where order_id = target.order_id;
    return 1;
  end if;

  return 0;
end;
$$;

create or replace function public.rider_set_presence(
  p_online boolean,
  p_lng double precision default null,
  p_lat double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if not private.has_role('rider') then
    raise exception 'Only riders can set presence' using errcode = '42501';
  end if;
  if not exists (select 1 from public.riders where id = caller and status = 'approved') then
    raise exception 'Rider is not approved' using errcode = '42501';
  end if;
  if p_lng is not null and (p_lng < -180 or p_lng > 180) then
    raise exception 'Longitude out of range' using errcode = '22003';
  end if;
  if p_lat is not null and (p_lat < -90 or p_lat > 90) then
    raise exception 'Latitude out of range' using errcode = '22003';
  end if;

  insert into public.rider_presence (rider_id, is_online, lng, lat, updated_at)
    values (caller, p_online, p_lng, p_lat, now())
  on conflict (rider_id) do update
    set is_online = excluded.is_online,
        lng = coalesce(excluded.lng, public.rider_presence.lng),
        lat = coalesce(excluded.lat, public.rider_presence.lat),
        updated_at = now();

  if p_online then
    perform public.rider_refresh_offers();
  end if;
end;
$$;

revoke execute on function public.rider_refresh_offers() from public, anon;
grant execute on function public.rider_refresh_offers() to authenticated;
revoke execute on function public.rider_set_presence(boolean, double precision, double precision) from public, anon;
grant execute on function public.rider_set_presence(boolean, double precision, double precision) to authenticated;
