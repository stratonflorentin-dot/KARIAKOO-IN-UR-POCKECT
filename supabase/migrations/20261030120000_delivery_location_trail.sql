-- Anti-theft live-location trail: a timestamped history of the assigned rider's
-- position while a parcel is in transit. The live dot already lives in
-- rider_presence (ephemeral, overwritten); this adds a durable trail so a
-- missing parcel can be investigated ("where was the rider, and when").
--
-- Privacy: a row is written only during an ACTIVE delivery the rider is assigned
-- to (ACCEPTED/PICKED_UP/IN_TRANSIT). Readable only by the order's customer, the
-- assigned rider, and admins. Retention: prune old rows out of band (e.g. a
-- scheduled job deleting recorded_at < now() - 90 days) — kept simple here.

create table public.delivery_location_pings (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  rider_id uuid not null references public.riders (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m real check (accuracy_m is null or accuracy_m >= 0),
  recorded_at timestamptz not null default now()
);
create index delivery_location_pings_order_idx on public.delivery_location_pings (order_id, recorded_at desc);

alter table public.delivery_location_pings enable row level security;
-- Written only through the RPC below (no insert/update/delete policies).
create policy "dlp: customer reads own order trail" on public.delivery_location_pings for select to authenticated
  using (private.is_order_customer(order_id));
create policy "dlp: assigned rider reads own trail" on public.delivery_location_pings for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "dlp: admin reads all" on public.delivery_location_pings for select to authenticated
  using (private.has_role('admin'));

-- The rider's app calls this every ~20s while a delivery is in transit. It keeps
-- the live dot (rider_presence) fresh AND appends to the durable trail, throttled
-- so a chatty client can't flood the table.
create function public.rider_ping_delivery_location(
  p_order_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy real default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_status public.delivery_status;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only the assigned rider can share a delivery location' using errcode = '42501';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordinates out of range' using errcode = '22003';
  end if;

  select d.status into v_status
    from public.deliveries d
    where d.order_id = p_order_id and d.rider_id = caller;
  if not found or v_status not in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT') then
    raise exception 'No active delivery assigned to you for this order' using errcode = '42501';
  end if;

  -- Keep the live dot fresh (same row the customer tracking map reads).
  update public.rider_presence
    set lat = p_lat, lng = p_lng, updated_at = now()
    where rider_id = caller;

  -- Append to the durable trail, at most one row per order per ~15 seconds.
  if not exists (
    select 1 from public.delivery_location_pings
    where order_id = p_order_id and recorded_at > now() - interval '15 seconds'
  ) then
    insert into public.delivery_location_pings (order_id, rider_id, lat, lng, accuracy_m)
      values (p_order_id, caller, p_lat, p_lng, p_accuracy);
  end if;
end;
$$;

revoke execute on function public.rider_ping_delivery_location(uuid, double precision, double precision, real) from public, anon;
grant execute on function public.rider_ping_delivery_location(uuid, double precision, double precision, real) to authenticated;
