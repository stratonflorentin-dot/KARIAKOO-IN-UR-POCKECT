-- Private customer-to-rider voice calls for an active delivery.
-- WebRTC media stays peer-to-peer; Supabase stores short-lived call state and
-- offer/answer/ICE signals. Both caller and callee must own this delivery.

create table public.delivery_calls (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  state text not null default 'ringing'
    check (state in ('ringing', 'accepted', 'declined', 'ended', 'missed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (caller_id <> recipient_id)
);
create unique index delivery_calls_one_active_per_order_idx
  on public.delivery_calls(order_id) where state in ('ringing', 'accepted');
create index delivery_calls_order_created_idx on public.delivery_calls(order_id, created_at desc);

create table public.delivery_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.delivery_calls(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice_candidate')),
  signal_data jsonb not null,
  created_at timestamptz not null default now(),
  check (pg_column_size(signal_data) <= 65536)
);
create index delivery_call_signals_call_idx on public.delivery_call_signals(call_id, id);

alter table public.delivery_calls enable row level security;
alter table public.delivery_call_signals enable row level security;
revoke all on public.delivery_calls, public.delivery_call_signals from public, anon, authenticated;
grant select on public.delivery_calls, public.delivery_call_signals to authenticated;

create or replace function private.can_access_delivery_call(p_call uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.delivery_calls c
    join public.orders o on o.id = c.order_id
    join public.deliveries d on d.order_id = o.id
    where c.id = p_call
      and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      and (
        (o.customer_id = (select auth.uid()) and c.recipient_id = d.rider_id)
        or
        (d.rider_id = (select auth.uid()) and c.recipient_id = o.customer_id)
      )
      and (c.caller_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_access_delivery_call(uuid) from public, anon;
grant execute on function private.can_access_delivery_call(uuid) to authenticated;

create policy delivery_calls_participants_read on public.delivery_calls
  for select to authenticated using (private.can_access_delivery_call(id));
create policy delivery_call_signals_participants_read on public.delivery_call_signals
  for select to authenticated using (private.can_access_delivery_call(call_id));

create or replace function public.delivery_call_start(p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  customer uuid;
  rider uuid;
  delivery_state public.delivery_status;
  recipient uuid;
  call_id uuid;
begin
  if caller is null then
    raise exception 'Sign in before calling' using errcode = '42501';
  end if;

  select o.customer_id, d.rider_id, d.status
    into customer, rider, delivery_state
    from public.orders o join public.deliveries d on d.order_id = o.id
    where o.id = p_order_id and o.is_demo = false;
  if not found or delivery_state not in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT') or rider is null then
    raise exception 'Calls are available only for an active delivery with an assigned rider' using errcode = '42501';
  end if;

  if caller = customer and private.has_role('customer') then
    recipient := rider;
  elsif caller = rider and private.has_role('rider') then
    recipient := customer;
  else
    raise exception 'Only this order’s customer and assigned rider can call' using errcode = '42501';
  end if;

  -- Stale rings are marked missed so a rider who lost connectivity does not
  -- block the customer from trying again later.
  update public.delivery_calls
    set state = case when state = 'ringing' then 'missed' else 'ended' end, updated_at = now()
    where order_id = p_order_id and (
      (state = 'ringing' and created_at < now() - interval '45 seconds')
      or (state = 'accepted' and updated_at < now() - interval '2 minutes')
    );
  delete from public.delivery_call_signals s using public.delivery_calls c
    where s.call_id = c.id and c.order_id = p_order_id and c.state in ('missed', 'ended', 'declined', 'failed');

  insert into public.delivery_calls(order_id, caller_id, recipient_id)
    values (p_order_id, caller, recipient)
    on conflict (order_id) where state in ('ringing', 'accepted') do nothing
    returning id into call_id;
  if call_id is null then
    raise exception 'A call for this delivery is already active' using errcode = '55000';
  end if;
  return call_id;
end;
$$;

create or replace function public.delivery_call_respond(p_call_id uuid, p_action text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  c public.delivery_calls;
  customer uuid;
  rider uuid;
  delivery_state public.delivery_status;
  next_state text;
begin
  if caller is null or p_action is null or p_action not in ('accept', 'decline', 'end', 'fail', 'heartbeat') then
    raise exception 'Invalid call action' using errcode = '22023';
  end if;
  select * into c from public.delivery_calls where id = p_call_id for update;
  if not found then raise exception 'Call not found' using errcode = 'P0002'; end if;
  select o.customer_id, d.rider_id, d.status into customer, rider, delivery_state
    from public.orders o join public.deliveries d on d.order_id = o.id where o.id = c.order_id;
  if delivery_state not in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
    or caller not in (customer, rider)
    or caller not in (c.caller_id, c.recipient_id) then
    raise exception 'You cannot update this call' using errcode = '42501';
  end if;

  if p_action = 'heartbeat' then
    if c.state <> 'accepted' then raise exception 'Call is not connected' using errcode = '55000'; end if;
    next_state := 'accepted';
  elsif p_action in ('accept', 'decline') then
    if caller <> c.recipient_id or c.state <> 'ringing' then
      raise exception 'Only the invited caller can respond to a ringing call' using errcode = '42501';
    end if;
    next_state := case when p_action = 'accept' then 'accepted' else 'declined' end;
  else
    if c.state not in ('ringing', 'accepted') then
      return c.state;
    end if;
    next_state := case when p_action = 'fail' then 'failed' else 'ended' end;
  end if;

  update public.delivery_calls set state = next_state, updated_at = now() where id = p_call_id;
  if next_state in ('declined', 'ended', 'failed') then
    delete from public.delivery_call_signals where call_id = p_call_id;
  end if;
  return next_state;
end;
$$;

create or replace function public.delivery_call_send_signal(
  p_call_id uuid,
  p_signal_type text,
  p_signal_data jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  c public.delivery_calls;
  signal_id bigint;
begin
  if caller is null or p_signal_type is null or p_signal_type not in ('offer', 'answer', 'ice_candidate')
    or p_signal_data is null or pg_column_size(p_signal_data) > 65536 then
    raise exception 'Invalid call signal' using errcode = '22023';
  end if;
  select * into c from public.delivery_calls where id = p_call_id;
  if not found or not private.can_access_delivery_call(p_call_id) then
    raise exception 'Call not found or not available to you' using errcode = '42501';
  end if;
  if p_signal_type = 'offer' and (caller <> c.caller_id or c.state <> 'ringing') then
    raise exception 'Only the caller can create the WebRTC offer' using errcode = '42501';
  elsif p_signal_type = 'answer' and (caller <> c.recipient_id or c.state <> 'accepted') then
    raise exception 'Only the recipient can answer an accepted call' using errcode = '42501';
  elsif p_signal_type = 'ice_candidate' and c.state not in ('ringing', 'accepted') then
    raise exception 'This call is no longer active' using errcode = '55000';
  end if;

  insert into public.delivery_call_signals(call_id, sender_id, signal_type, signal_data)
    values (p_call_id, caller, p_signal_type, p_signal_data)
    returning id into signal_id;
  return signal_id;
end;
$$;

revoke execute on function public.delivery_call_start(uuid) from public, anon;
revoke execute on function public.delivery_call_respond(uuid, text) from public, anon;
revoke execute on function public.delivery_call_send_signal(uuid, text, jsonb) from public, anon;
grant execute on function public.delivery_call_start(uuid) to authenticated;
grant execute on function public.delivery_call_respond(uuid, text) to authenticated;
grant execute on function public.delivery_call_send_signal(uuid, text, jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'delivery_calls') then
      alter publication supabase_realtime add table public.delivery_calls;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'delivery_call_signals') then
      alter publication supabase_realtime add table public.delivery_call_signals;
    end if;
  end if;
end;
$$;
