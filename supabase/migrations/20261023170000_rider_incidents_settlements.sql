-- Phase 2 / brief §1: rider incident (SOS) reporting + daily settlement
-- reconciliation — the database-backed records the SafetyButton and earnings
-- need (emergency call links alone are not a persistence layer).

-- ---------------------------------------------------------------- delivered_at
-- A clean completion timestamp for settlement aggregation + a settled marker so
-- a delivery is never paid out twice.
alter table public.deliveries add column if not exists delivered_at timestamptz;
alter table public.deliveries add column if not exists rider_settled_at timestamptz;

update public.deliveries d
  set delivered_at = h.at
  from (
    select order_id, max(created_at) as at
    from public.order_status_history
    where label ilike '%deliver%'
    group by order_id
  ) h
  where h.order_id = d.order_id and d.status = 'DELIVERED' and d.delivered_at is null;

-- rider_complete_delivery now stamps delivered_at (same signature/return).
create or replace function public.rider_complete_delivery(p_order uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
  v_pin text;
  v_attempts int;
  v_locked timestamptz;
  v_max int := 5;
  v_window interval := interval '15 minutes';
begin
  if not private.has_role('rider') then
    raise exception 'Only riders can complete a delivery' using errcode = '42501';
  end if;
  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.rider_id is distinct from caller then
    raise exception 'This delivery is not assigned to you' using errcode = '42501';
  end if;
  if d.status <> 'IN_TRANSIT' then
    raise exception 'The delivery must be in transit to complete' using errcode = '22023';
  end if;

  select pin, attempts, locked_until into v_pin, v_attempts, v_locked
    from public.delivery_pins where order_id = p_order for update;

  if v_locked is not null and v_locked > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_at', v_locked);
  end if;
  if v_locked is not null and v_locked <= now() then
    v_attempts := 0;
  end if;

  if v_pin is null or v_pin <> coalesce(btrim(p_pin), '') then
    v_attempts := coalesce(v_attempts, 0) + 1;
    update public.delivery_pins
      set attempts = v_attempts,
          locked_until = case when v_attempts >= v_max then now() + v_window else null end
      where order_id = p_order;
    if v_attempts >= v_max then
      return jsonb_build_object('ok', false, 'error', 'locked', 'retry_at', now() + v_window);
    end if;
    return jsonb_build_object('ok', false, 'error', 'incorrect', 'attempts_left', v_max - v_attempts);
  end if;

  update public.delivery_pins set attempts = 0, locked_until = null where order_id = p_order;
  update public.deliveries set status = 'DELIVERED', delivered_at = now(), updated_at = now() where order_id = p_order;
  update public.orders set status = 'delivered' where id = p_order;
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Delivered — customer PIN verified', 'rider');
  return jsonb_build_object('ok', true, 'status', 'DELIVERED');
end;
$$;

-- ---------------------------------------------------------------- incidents (SOS)
create type public.incident_kind as enum ('sos', 'accident', 'theft', 'harassment', 'vehicle', 'other');
create type public.incident_status as enum ('open', 'acknowledged', 'resolved');

create table public.rider_incidents (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  kind public.incident_kind not null,
  status public.incident_status not null default 'open',
  note text not null default '' check (char_length(note) <= 500),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  created_at timestamptz not null default now(),
  acknowledged_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
create index rider_incidents_rider_idx on public.rider_incidents (rider_id);
create index rider_incidents_open_idx on public.rider_incidents (status) where status <> 'resolved';

alter table public.rider_incidents enable row level security;
create policy "rider_incidents: rider reads own" on public.rider_incidents for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "rider_incidents: admin reads all" on public.rider_incidents for select to authenticated
  using (private.has_role('admin'));

-- A rider files an incident (SOS). Written only through this function.
create function public.rider_report_incident(
  p_kind text,
  p_note text default '',
  p_order uuid default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_id uuid;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can report an incident' using errcode = '42501';
  end if;
  if p_kind not in ('sos', 'accident', 'theft', 'harassment', 'vehicle', 'other') then
    raise exception 'Unknown incident type %', p_kind using errcode = '22023';
  end if;
  -- Only attach an order the rider is actually assigned to.
  if p_order is not null and not exists (
    select 1 from public.deliveries where order_id = p_order and rider_id = caller
  ) then
    p_order := null;
  end if;

  insert into public.rider_incidents (rider_id, order_id, kind, note, lat, lng)
    values (caller, p_order, p_kind::public.incident_kind, left(coalesce(btrim(p_note), ''), 500), p_lat, p_lng)
    returning id into v_id;
  return v_id;
end;
$$;

-- An admin acknowledges or resolves an incident.
create function public.admin_update_incident(
  p_id uuid,
  p_status text,
  p_note text default null
) returns public.incident_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_current public.incident_status;
  v_target public.incident_status;
begin
  if caller is null or not private.has_role('admin') then
    raise exception 'Only admins can update an incident' using errcode = '42501';
  end if;
  if p_status not in ('acknowledged', 'resolved') then
    raise exception 'Unknown incident status %', p_status using errcode = '22023';
  end if;
  v_target := p_status::public.incident_status;

  select status into v_current from public.rider_incidents where id = p_id for update;
  if not found then
    raise exception 'Incident not found' using errcode = 'P0002';
  end if;
  -- open -> acknowledged -> resolved, and open -> resolved.
  if not (
    (v_current = 'open' and v_target in ('acknowledged', 'resolved')) or
    (v_current = 'acknowledged' and v_target = 'resolved')
  ) then
    raise exception 'Incident transition % -> % is not allowed', v_current, v_target using errcode = '22023';
  end if;

  update public.rider_incidents
    set status = v_target,
        acknowledged_by = caller,
        note = case when p_note is null then note else left(btrim(p_note), 500) end,
        updated_at = now()
    where id = p_id;
  return v_target;
end;
$$;

-- ---------------------------------------------------------------- settlements
create type public.rider_settlement_status as enum ('pending', 'paid');

create table public.rider_settlements (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (id) on delete restrict,
  period_date date not null,                     -- the Dar es Salaam delivery day
  deliveries_count int not null check (deliveries_count >= 0),
  gross_tzs bigint not null check (gross_tzs >= 0),
  status public.rider_settlement_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (rider_id, period_date)                 -- one settlement per rider per day
);
create index rider_settlements_rider_idx on public.rider_settlements (rider_id);

alter table public.rider_settlements enable row level security;
create policy "rider_settlements: rider reads own" on public.rider_settlements for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "rider_settlements: admin reads all" on public.rider_settlements for select to authenticated
  using (private.has_role('admin'));

-- Settle a rider's deliveries for one Dar es Salaam day. Idempotent: only
-- DELIVERED, not-yet-settled deliveries count, and a (rider, day) can settle
-- once. Returns the settlement + totals.
create function public.admin_settle_rider_day(p_rider uuid, p_date date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_count int;
  v_gross bigint;
  v_id uuid;
begin
  if caller is null or not private.has_role('admin') then
    raise exception 'Only admins can settle a rider' using errcode = '42501';
  end if;

  -- Lock the matching unsettled deliveries first (Dar es Salaam is UTC+3), so a
  -- concurrent settlement for the same day waits and then finds nothing.
  perform 1 from public.deliveries
  where rider_id = p_rider
    and status = 'DELIVERED'
    and rider_settled_at is null
    and (delivered_at + interval '3 hours')::date = p_date
  for update;

  select count(*), coalesce(sum(rider_payout_tzs), 0)
    into v_count, v_gross
  from public.deliveries
  where rider_id = p_rider
    and status = 'DELIVERED'
    and rider_settled_at is null
    and (delivered_at + interval '3 hours')::date = p_date;

  if v_count = 0 then
    raise exception 'No unsettled deliveries for this rider on %', p_date using errcode = 'P0002';
  end if;

  insert into public.rider_settlements (rider_id, period_date, deliveries_count, gross_tzs, created_by)
    values (p_rider, p_date, v_count, v_gross, caller)
    returning id into v_id;

  update public.deliveries
    set rider_settled_at = now()
  where rider_id = p_rider
    and status = 'DELIVERED'
    and rider_settled_at is null
    and (delivered_at + interval '3 hours')::date = p_date;

  return jsonb_build_object('settlement_id', v_id, 'deliveries_count', v_count, 'gross_tzs', v_gross);
end;
$$;

create function public.admin_mark_settlement_paid(p_id uuid) returns public.rider_settlement_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_current public.rider_settlement_status;
begin
  if caller is null or not private.has_role('admin') then
    raise exception 'Only admins can mark a settlement paid' using errcode = '42501';
  end if;
  select status into v_current from public.rider_settlements where id = p_id for update;
  if not found then
    raise exception 'Settlement not found' using errcode = 'P0002';
  end if;
  if v_current <> 'pending' then
    raise exception 'Settlement is already %', v_current using errcode = '22023';
  end if;
  update public.rider_settlements set status = 'paid', paid_at = now() where id = p_id;
  return 'paid';
end;
$$;

-- ---------------------------------------------------------------- grants
revoke execute on function
  public.rider_report_incident(text, text, uuid, double precision, double precision),
  public.admin_update_incident(uuid, text, text),
  public.admin_settle_rider_day(uuid, date),
  public.admin_mark_settlement_paid(uuid)
  from public, anon;
grant execute on function
  public.rider_report_incident(text, text, uuid, double precision, double precision),
  public.admin_update_incident(uuid, text, text),
  public.admin_settle_rider_day(uuid, date),
  public.admin_mark_settlement_paid(uuid)
  to authenticated;
