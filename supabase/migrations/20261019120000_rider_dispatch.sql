-- KARIAKOO rider dispatch (Phase 6).
--
-- Turns the deliveries table into a live, Bolt-style job flow WITHOUT ever
-- touching another company's systems: everything here runs on our own
-- database.
--
-- The model
--  * rider_presence  — is a rider online, and where are they right now.
--  * delivery_offers — a job offered to a specific rider, with a countdown.
--
-- The rules (same spirit as the rest of the schema)
--  * Riders can READ their own presence and their own offers, nothing else.
--  * Riders NEVER write these tables directly. Every change — going online,
--    accepting a job, moving it to picked-up/in-transit — goes through a
--    SECURITY DEFINER function below that enforces the state machine and
--    checks "is this really your job" on the server. A rider cannot steal a
--    job, accept an expired offer, or skip a step by calling the REST API.
--  * Offers are created by dispatch (admins or trusted server code), not by
--    riders, so a rider can't invent a job for themselves.

-- ---------------------------------------------------------------- enums
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- ---------------------------------------------------------------- presence
-- One row per rider. Location is the rider's real device GPS, sent while they
-- are online; it is null when we don't have a fresh fix. No fake coordinates.
create table public.rider_presence (
  rider_id uuid primary key references public.riders (id) on delete cascade,
  is_online boolean not null default false,
  lng double precision check (lng is null or lng between -180 and 180),
  lat double precision check (lat is null or lat between -90 and 90),
  updated_at timestamptz not null default now()
);
create index rider_presence_online_idx on public.rider_presence (is_online) where is_online;

-- ---------------------------------------------------------------- offers
create table public.delivery_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.deliveries (order_id) on delete cascade,
  rider_id uuid not null references public.riders (id) on delete cascade,
  -- The payout shown to the rider, frozen at offer time so it can't shift.
  payout_tzs bigint not null check (payout_tzs >= 0),
  status public.offer_status not null default 'pending',
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  check (expires_at > offered_at),
  -- A rider is offered a given order at most once; re-offers reuse the row.
  unique (order_id, rider_id)
);
create index delivery_offers_rider_idx on public.delivery_offers (rider_id);
create index delivery_offers_order_idx on public.delivery_offers (order_id);
-- Fast lookup of a rider's live offers.
create index delivery_offers_live_idx on public.delivery_offers (rider_id, status) where status = 'pending';

-- ---------------------------------------------------------------- state-machine functions
-- All of these are SECURITY DEFINER with an empty search_path (the pattern the
-- rest of the schema uses). They run as the table owner, so they bypass RLS on
-- purpose — the gate is the explicit role / ownership check inside each one.

-- Rider goes online/offline and (optionally) reports their current location.
create function public.rider_set_presence(
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
        -- Keep the last known fix if this ping carried no coordinates.
        lng = coalesce(excluded.lng, public.rider_presence.lng),
        lat = coalesce(excluded.lat, public.rider_presence.lat),
        updated_at = now();
end;
$$;

-- Dispatch offers a job to a rider for p_ttl_seconds. Admins or trusted server
-- code only — a rider can never call this to hand themselves a job.
create function public.offer_delivery(
  p_order uuid,
  p_rider uuid,
  p_ttl_seconds int default 30
) returns public.delivery_offers
language plpgsql security definer set search_path = '' as $$
declare
  d public.deliveries;
  result public.delivery_offers;
begin
  -- current_user is the function owner here (SECURITY DEFINER), so it can't
  -- tell callers apart. Gate on the caller's JWT instead: a logged-in user
  -- (auth.uid() set) must be an admin; trusted server code uses the service
  -- key, which has no uid and passes.
  if (select auth.uid()) is not null and not private.has_role('admin') then
    raise exception 'Only dispatch can offer deliveries' using errcode = '42501';
  end if;
  if p_ttl_seconds < 5 or p_ttl_seconds > 300 then
    raise exception 'Offer TTL must be between 5 and 300 seconds' using errcode = '22003';
  end if;
  if not exists (select 1 from public.riders where id = p_rider and status = 'approved') then
    raise exception 'Rider is not approved' using errcode = '42501';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found then
    raise exception 'No delivery for order %', p_order using errcode = 'P0002';
  end if;
  if d.status not in ('PENDING_ASSIGNMENT', 'ASSIGNED') then
    raise exception 'Delivery % is already %', p_order, d.status using errcode = '22023';
  end if;

  insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
    values (p_order, p_rider, d.rider_payout_tzs, 'pending', now(), now() + make_interval(secs => p_ttl_seconds))
  on conflict (order_id, rider_id) do update
    -- Re-offer only if the previous offer is no longer live.
    set status = 'pending',
        payout_tzs = excluded.payout_tzs,
        offered_at = now(),
        expires_at = excluded.expires_at,
        decided_at = null
    where public.delivery_offers.status in ('declined', 'expired', 'cancelled')
    returning * into result;

  if result.id is null then
    raise exception 'Rider % already has a live offer for order %', p_rider, p_order using errcode = '23505';
  end if;

  -- Mark the delivery as out for assignment while offers are live.
  if d.status = 'PENDING_ASSIGNMENT' then
    update public.deliveries set status = 'ASSIGNED', updated_at = now() where order_id = p_order;
  end if;

  return result;
end;
$$;

-- Rider accepts an offer. Atomic: the first rider to accept wins, everyone
-- else's offer for that order is cancelled, and an expired offer is refused.
create function public.rider_accept_offer(p_order uuid) returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  o public.delivery_offers;
  d public.deliveries;
begin
  if not private.has_role('rider') then
    raise exception 'Only riders can accept offers' using errcode = '42501';
  end if;

  -- Lock this rider's offer first, then the delivery, to avoid races.
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
  if d.rider_id is not null and d.rider_id <> caller then
    update public.delivery_offers set status = 'cancelled', decided_at = now() where id = o.id;
    raise exception 'Another rider already took this delivery' using errcode = '22023';
  end if;
  if d.status not in ('PENDING_ASSIGNMENT', 'ASSIGNED') then
    raise exception 'Delivery is no longer available (%).', d.status using errcode = '22023';
  end if;

  update public.deliveries
    set rider_id = caller, status = 'ACCEPTED', updated_at = now()
    where order_id = p_order;

  update public.delivery_offers set status = 'accepted', decided_at = now() where id = o.id;
  -- Pull the job back from every other rider it was offered to.
  update public.delivery_offers set status = 'cancelled', decided_at = now()
    where order_id = p_order and id <> o.id and status = 'pending';

  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Rider accepted the delivery', 'rider');

  return 'ACCEPTED';
end;
$$;

-- Rider declines an offer; it simply frees them from it.
create function public.rider_decline_offer(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  o public.delivery_offers;
begin
  if not private.has_role('rider') then
    raise exception 'Only riders can decline offers' using errcode = '42501';
  end if;
  select * into o from public.delivery_offers
    where order_id = p_order and rider_id = caller for update;
  if not found then
    raise exception 'No offer for you on this order' using errcode = 'P0002';
  end if;
  if o.status <> 'pending' then
    raise exception 'This offer is already %', o.status using errcode = '22023';
  end if;
  update public.delivery_offers set status = 'declined', decided_at = now() where id = o.id;
end;
$$;

-- Rider moves an accepted job forward: ACCEPTED -> PICKED_UP -> IN_TRANSIT.
-- Reaching DELIVERED is deliberately NOT here: completion needs the customer's
-- PIN, which is verified by its own server function later.
create function public.rider_advance_delivery(p_order uuid, p_to public.delivery_status)
  returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
  allowed boolean;
begin
  if not private.has_role('rider') then
    raise exception 'Only riders can update a delivery' using errcode = '42501';
  end if;
  select * into d from public.deliveries where order_id = p_order for update;
  -- is distinct from, not <>, so an unassigned (null rider_id) delivery is
  -- still rejected rather than slipping through as "unknown".
  if not found or d.rider_id is distinct from caller then
    raise exception 'This delivery is not assigned to you' using errcode = '42501';
  end if;
  allowed := (d.status::text || '>' || p_to::text) in ('ACCEPTED>PICKED_UP', 'PICKED_UP>IN_TRANSIT');
  if not allowed then
    raise exception 'Step % -> % is not allowed', d.status, p_to using errcode = '22023';
  end if;

  update public.deliveries set status = p_to, updated_at = now() where order_id = p_order;
  insert into public.order_status_history (order_id, label, actor)
    values (p_order,
      case p_to when 'PICKED_UP' then 'Rider picked up the order' else 'Rider is on the way' end,
      'rider');
  return p_to;
end;
$$;

-- These functions ARE the rider's controlled write path, so authenticated
-- users may call them; the role/ownership checks inside do the gating.
revoke execute on function
  public.rider_set_presence(boolean, double precision, double precision),
  public.offer_delivery(uuid, uuid, int),
  public.rider_accept_offer(uuid),
  public.rider_decline_offer(uuid),
  public.rider_advance_delivery(uuid, public.delivery_status)
  from public, anon;
grant execute on function
  public.rider_set_presence(boolean, double precision, double precision),
  public.rider_accept_offer(uuid),
  public.rider_decline_offer(uuid),
  public.rider_advance_delivery(uuid, public.delivery_status)
  to authenticated;
-- offer_delivery is dispatch-only: admins (checked inside) and trusted server
-- code. It is still granted to authenticated because the admin check lives in
-- the body; non-admins are refused there.
grant execute on function public.offer_delivery(uuid, uuid, int) to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.rider_presence enable row level security;
alter table public.delivery_offers enable row level security;

-- Presence: a rider sees only their own; admins see all. No write policies —
-- the only writer is rider_set_presence (SECURITY DEFINER).
create policy "presence: read own" on public.rider_presence for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "presence: admin reads all" on public.rider_presence for select to authenticated
  using (private.has_role('admin'));

-- Offers: a rider sees only offers made to them; admins see all. No write
-- policies — offers are created and changed only by the functions above.
create policy "offers: read own" on public.delivery_offers for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "offers: admin reads all" on public.delivery_offers for select to authenticated
  using (private.has_role('admin'));
