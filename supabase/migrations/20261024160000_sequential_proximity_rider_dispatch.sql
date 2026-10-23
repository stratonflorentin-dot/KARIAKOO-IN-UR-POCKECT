-- Give each rider one offer at a time, serialize accepts, and choose the
-- closest currently available rider to the order's pickup shops.

-- The previous dispatcher broadcast a job to every online rider. Cancel those
-- short-lived offers before adding uniqueness rules; waiting jobs are reissued
-- by rider_refresh_offers below.
drop trigger if exists deliveries_auto_dispatch_requeue on public.deliveries;
update public.delivery_offers
  set status = 'cancelled', decided_at = now()
  where status = 'pending';
update public.deliveries
  set status = 'PENDING_ASSIGNMENT', updated_at = now()
  where rider_id is null and status = 'ASSIGNED';

-- An old rider may have accepted multiple jobs before the guard existed.
-- Return extra not-yet-picked-up jobs to the queue; never reassign a parcel
-- that has already been picked up or is in transit.
update public.delivery_offers o
  set status = 'cancelled', decided_at = now()
  where o.status = 'accepted'
    and o.order_id in (
      select order_id from (
        select order_id,
          status,
          row_number() over (
            partition by rider_id
            order by case when status in ('PICKED_UP', 'IN_TRANSIT') then 0 else 1 end,
              updated_at, order_id
          ) as job_number
        from public.deliveries
        where rider_id is not null and status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      ) ranked
      where job_number > 1 and status = 'ACCEPTED'
    );
update public.deliveries d
  set rider_id = null, status = 'PENDING_ASSIGNMENT', updated_at = now()
  where d.order_id in (
    select order_id from (
      select order_id,
        status,
        row_number() over (
          partition by rider_id
          order by case when status in ('PICKED_UP', 'IN_TRANSIT') then 0 else 1 end,
            updated_at, order_id
        ) as job_number
      from public.deliveries
      where rider_id is not null and status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
    ) ranked
    where job_number > 1 and status = 'ACCEPTED'
  );

create unique index if not exists delivery_offers_one_pending_order_idx
  on public.delivery_offers (order_id) where status = 'pending';
create unique index if not exists delivery_offers_one_pending_rider_idx
  on public.delivery_offers (rider_id) where status = 'pending';

-- Internal helper. It tries riders in distance order and the partial unique
-- indexes make concurrent dispatch requests safe across different orders.
create or replace function private.dispatch_order_nearest(p_order uuid, p_ttl int default 45)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  d public.deliveries;
  candidate record;
  offer_id uuid;
begin
  if p_ttl < 5 or p_ttl > 300 then
    raise exception 'Offer TTL must be between 5 and 300 seconds' using errcode = '22003';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.rider_id is not null or d.status not in ('PENDING_ASSIGNMENT', 'ASSIGNED') then
    return 0;
  end if;
  if exists (
    select 1 from public.delivery_offers o
    where o.order_id = p_order and o.status = 'pending' and o.expires_at > now()
  ) then
    return 0;
  end if;

  for candidate in
    select p.rider_id
    from public.rider_presence p
    join public.riders ri on ri.id = p.rider_id
    join public.orders ord on ord.id = p_order
    left join lateral (
      select min(6371 * 2 * asin(sqrt(least(1.0,
        sin(radians(sh.lat - p.lat) / 2) ^ 2
        + cos(radians(p.lat)) * cos(radians(sh.lat))
        * sin(radians(sh.lng - p.lng) / 2) ^ 2
      )))) as distance_km
      from public.order_items oi
      join public.shops sh on sh.id = oi.shop_id
      where oi.order_id = p_order
        and p.lat is not null and p.lng is not null
        and p.updated_at >= now() - interval '2 minutes'
        and sh.lat is not null and sh.lng is not null
    ) proximity on true
    where p.is_online
      and ri.status = 'approved'
      and p.rider_id <> ord.customer_id
      and not exists (
        select 1 from public.deliveries active
        where active.rider_id = p.rider_id
          and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
      and not exists (
        select 1 from public.delivery_offers live
        where live.rider_id = p.rider_id and live.status = 'pending' and live.expires_at > now()
      )
      and not exists (
        select 1 from public.delivery_offers declined
        where declined.order_id = p_order
          and declined.rider_id = p.rider_id
          and declined.status = 'declined'
      )
    order by (proximity.distance_km is null), proximity.distance_km nulls last,
      p.updated_at desc, p.rider_id
    for update of p skip locked
  loop
    offer_id := null;
    begin
      insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
        values (p_order, candidate.rider_id, d.rider_payout_tzs, 'pending', now(), now() + make_interval(secs => p_ttl))
      on conflict (order_id, rider_id) do update
        set status = 'pending', payout_tzs = excluded.payout_tzs,
            offered_at = now(), expires_at = excluded.expires_at, decided_at = null
        where public.delivery_offers.status in ('declined', 'expired', 'cancelled')
      returning id into offer_id;
    exception when unique_violation then
      -- Another order won this rider's single offer slot while we were sorting.
      offer_id := null;
    end;

    if offer_id is not null then
      update public.deliveries
        set status = 'ASSIGNED', updated_at = now()
        where order_id = p_order and rider_id is null;
      return 1;
    end if;
  end loop;

  return 0;
end;
$$;
revoke all on function private.dispatch_order_nearest(uuid, int) from public, anon, authenticated;

-- Keep the customer/admin entry point while dispatching to a single nearest
-- rider rather than broadcasting the delivery to all riders.
create or replace function public.auto_dispatch_delivery(p_order uuid, p_ttl int default 45)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is not null and not private.has_role('admin') and not private.is_order_customer(p_order) then
    raise exception 'Not allowed to dispatch this order' using errcode = '42501';
  end if;
  return private.dispatch_order_nearest(p_order, p_ttl);
end;
$$;
revoke execute on function public.auto_dispatch_delivery(uuid, int) from public, anon;
grant execute on function public.auto_dispatch_delivery(uuid, int) to authenticated;

-- Refresh all queued orders through the shared nearest-rider dispatcher. This
-- lets a free rider receive the next job after finishing the current one.
create or replace function public.rider_refresh_offers()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  waiting record;
  offers_for_caller integer := 0;
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

  update public.delivery_offers
    set status = 'expired', decided_at = now()
    where status = 'pending' and expires_at <= now();

  update public.deliveries d
    set status = 'PENDING_ASSIGNMENT', updated_at = now()
    where d.rider_id is null and d.status = 'ASSIGNED'
      and not exists (
        select 1 from public.delivery_offers o
        where o.order_id = d.order_id and o.status = 'pending' and o.expires_at > now()
      );

  for waiting in
    select d.order_id
    from public.deliveries d
    where d.rider_id is null and d.status in ('PENDING_ASSIGNMENT', 'ASSIGNED')
      and not exists (
        select 1 from public.delivery_offers o
        where o.order_id = d.order_id and o.status = 'pending' and o.expires_at > now()
      )
    order by d.updated_at, d.order_id
    limit 100
  loop
    perform private.dispatch_order_nearest(waiting.order_id, 45);
  end loop;

  select count(*) into offers_for_caller
    from public.delivery_offers o
    where o.rider_id = caller and o.status = 'pending' and o.expires_at > now();
  return offers_for_caller;
end;
$$;
revoke execute on function public.rider_refresh_offers() from public, anon;
grant execute on function public.rider_refresh_offers() to authenticated;

-- Serialize a rider's acceptance requests and refuse a second active job.
create or replace function public.rider_accept_offer(p_order uuid)
returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  o public.delivery_offers;
  d public.deliveries;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can accept offers' using errcode = '42501';
  end if;

  perform 1 from public.riders r where r.id = caller and r.status = 'approved' for update;
  if not found then
    raise exception 'Rider is not approved' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.deliveries active
    where active.rider_id = caller and active.order_id <> p_order
      and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  ) then
    raise exception 'Finish your current delivery before accepting another.' using errcode = '55000';
  end if;

  select * into o from public.delivery_offers
    where order_id = p_order and rider_id = caller for update;
  if not found then
    raise exception 'No offer for you on this order' using errcode = 'P0002';
  end if;
  if o.status <> 'pending' then
    raise exception 'This offer is already %', o.status using errcode = '22023';
  end if;
  if o.expires_at <= now() then
    update public.delivery_offers set status = 'expired', decided_at = now() where id = o.id;
    raise exception 'This offer has expired' using errcode = '22023';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.rider_id is not null and d.rider_id <> caller then
    update public.delivery_offers set status = 'cancelled', decided_at = now() where id = o.id;
    raise exception 'Another rider already took this delivery' using errcode = '22023';
  end if;
  if d.status not in ('PENDING_ASSIGNMENT', 'ASSIGNED') then
    raise exception 'Delivery is no longer available (%)', d.status using errcode = '22023';
  end if;

  update public.deliveries
    set rider_id = caller, status = 'ACCEPTED', updated_at = now()
    where order_id = p_order;
  update public.delivery_offers set status = 'accepted', decided_at = now() where id = o.id;
  update public.delivery_offers set status = 'cancelled', decided_at = now()
    where order_id = p_order and id <> o.id and status = 'pending';
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Rider accepted the delivery', 'rider');
  return 'ACCEPTED';
end;
$$;
revoke execute on function public.rider_accept_offer(uuid) from public, anon;
grant execute on function public.rider_accept_offer(uuid) to authenticated;

-- Every approved online rider can browse the complete open queue. We expose
-- only a public order reference, pickup shop names, payout and approximate
-- pickup distance; customer delivery details remain hidden until claim.
create or replace function public.rider_available_deliveries()
returns table (
  order_id uuid,
  reference text,
  placed_at timestamptz,
  payout_tzs bigint,
  pickup_names text,
  distance_km double precision,
  can_claim boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  rider_is_busy boolean;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can browse available deliveries' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.riders r
    join public.rider_presence p on p.rider_id = r.id
    where r.id = caller and r.status = 'approved' and p.is_online
  ) then
    return;
  end if;

  select exists (
    select 1 from public.deliveries active
    where active.rider_id = caller and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  ) into rider_is_busy;

  return query
  select d.order_id, o.reference, o.created_at, d.rider_payout_tzs,
    coalesce(pickups.names, 'Pickup location'), pickups.distance_km,
    not rider_is_busy
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  join public.rider_presence rp on rp.rider_id = caller
  left join lateral (
    select string_agg(distinct sh.name, ', ' order by sh.name) as names,
      min(case when rp.lat is not null and rp.lng is not null
          and rp.updated_at >= now() - interval '2 minutes'
          and sh.lat is not null and sh.lng is not null
        then 6371 * 2 * asin(sqrt(least(1.0,
          sin(radians(sh.lat - rp.lat) / 2) ^ 2
          + cos(radians(rp.lat)) * cos(radians(sh.lat))
          * sin(radians(sh.lng - rp.lng) / 2) ^ 2
        ))) end) as distance_km
    from public.order_items oi
    join public.shops sh on sh.id = oi.shop_id
    where oi.order_id = d.order_id
  ) pickups on true
  where d.rider_id is null
    and d.status in ('PENDING_ASSIGNMENT', 'ASSIGNED')
    and o.customer_id <> caller
  order by pickups.distance_km nulls last, o.created_at, d.order_id;
end;
$$;
revoke all on function public.rider_available_deliveries() from public, anon;
grant execute on function public.rider_available_deliveries() to authenticated;

-- A board claim is atomic. Locking the rider row serializes their claims;
-- locking the delivery row makes the first rider win a concurrent race.
create or replace function public.rider_claim_delivery(p_order uuid)
returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can claim deliveries' using errcode = '42501';
  end if;
  perform 1 from public.riders r where r.id = caller and r.status = 'approved' for update;
  if not found then
    raise exception 'Rider is not approved' using errcode = '42501';
  end if;
  if not exists (select 1 from public.rider_presence p where p.rider_id = caller and p.is_online) then
    raise exception 'Go online before accepting a delivery.' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.deliveries active
    where active.rider_id = caller and active.order_id <> p_order
      and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  ) then
    raise exception 'Finish your current delivery before accepting another.' using errcode = '55000';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.rider_id is not null or d.status not in ('PENDING_ASSIGNMENT', 'ASSIGNED') then
    raise exception 'This delivery was already claimed or is no longer available.' using errcode = '55000';
  end if;

  update public.deliveries set rider_id = caller, status = 'ACCEPTED', updated_at = now()
    where order_id = p_order;
  update public.delivery_offers set status = 'cancelled', decided_at = now()
    where order_id = p_order and status = 'pending';
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Rider accepted the delivery', 'rider');
  return 'ACCEPTED';
end;
$$;
revoke all on function public.rider_claim_delivery(uuid) from public, anon;
grant execute on function public.rider_claim_delivery(uuid) to authenticated;
