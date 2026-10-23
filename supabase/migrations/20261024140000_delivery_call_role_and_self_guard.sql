-- Identify the active UI role for multi-role users and give a clear response
-- instead of letting the caller/recipient check constraint fail for self-jobs.
drop function public.delivery_call_start(uuid);

create function public.delivery_call_start(
  p_order_id uuid,
  p_as_role text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  customer uuid;
  rider uuid;
  delivery_state public.delivery_status;
  caller_role text;
  recipient uuid;
  call_id uuid;
begin
  if caller is null then
    raise exception 'Sign in before calling' using errcode = '42501';
  end if;

  if p_as_role is not null and p_as_role not in ('customer', 'rider') then
    raise exception 'Choose customer or rider call mode' using errcode = '22023';
  end if;

  select o.customer_id, d.rider_id, d.status
    into customer, rider, delivery_state
    from public.orders o join public.deliveries d on d.order_id = o.id
    where o.id = p_order_id and o.is_demo = false;
  if not found or delivery_state not in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT') or rider is null then
    raise exception 'Calls are available only for an active delivery with an assigned rider' using errcode = '42501';
  end if;

  caller_role := p_as_role;
  if caller_role is null then
    if caller = customer and caller = rider then
      raise exception 'This delivery is assigned to your own account. The customer and rider need different accounts to call.' using errcode = '22023';
    elsif caller = customer and private.has_role('customer') then
      caller_role := 'customer';
    elsif caller = rider and private.has_role('rider') then
      caller_role := 'rider';
    else
      raise exception 'Only this order customer or assigned rider can call' using errcode = '42501';
    end if;
  end if;

  if caller_role = 'customer' and caller = customer and private.has_role('customer') then
    recipient := rider;
  elsif caller_role = 'rider' and caller = rider and private.has_role('rider') then
    recipient := customer;
  else
    raise exception 'Your account is not the customer or assigned rider for this delivery' using errcode = '42501';
  end if;

  if recipient = caller then
    raise exception 'This delivery is assigned to your own account. The customer and rider need different accounts to call.' using errcode = '22023';
  end if;

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

revoke execute on function public.delivery_call_start(uuid, text) from public, anon;
grant execute on function public.delivery_call_start(uuid, text) to authenticated;

-- Never dispatch an order to the same account that placed it: a customer and
-- rider with one user id cannot call each other or hand a parcel to themselves.
create or replace function public.auto_dispatch_delivery(p_order uuid, p_ttl int default 45) returns int
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
  n int := 0;
  r record;
begin
  if caller is not null and not private.has_role('admin') and not private.is_order_customer(p_order) then
    raise exception 'Not allowed to dispatch this order' using errcode = '42501';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.status <> 'PENDING_ASSIGNMENT' then return 0; end if;

  for r in
    select p.rider_id
    from public.rider_presence p
    join public.riders ri on ri.id = p.rider_id
    join public.orders o on o.id = p_order
    where p.is_online
      and ri.status = 'approved'
      and p.rider_id <> o.customer_id
      and not exists (
        select 1 from public.deliveries dd
        where dd.rider_id = p.rider_id and dd.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
  loop
    insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
      values (p_order, r.rider_id, d.rider_payout_tzs, 'pending', now(), now() + make_interval(secs => p_ttl))
    on conflict (order_id, rider_id) do update
      set status = 'pending', payout_tzs = excluded.payout_tzs, offered_at = now(),
          expires_at = now() + make_interval(secs => p_ttl), decided_at = null
      where public.delivery_offers.status in ('declined', 'expired', 'cancelled');
    n := n + 1;
  end loop;

  if n > 0 then
    update public.deliveries set status = 'ASSIGNED', updated_at = now() where order_id = p_order;
  end if;
  return n;
end;
$$;

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
  ) then return 0; end if;

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

  select d.* into target
    from public.deliveries d
    join public.orders ord on ord.id = d.order_id
    where ord.customer_id <> caller
      and d.rider_id is null
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

  if not found then return 0; end if;

  insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
    values (target.order_id, caller, target.rider_payout_tzs, 'pending', now(), now() + interval '45 seconds')
    on conflict (order_id, rider_id) do update
      set status = 'pending', payout_tzs = excluded.payout_tzs,
          offered_at = now(), expires_at = excluded.expires_at, decided_at = null
      where public.delivery_offers.status in ('expired', 'cancelled')
    returning id into created_id;

  if created_id is null then return 0; end if;
  update public.deliveries set status = 'ASSIGNED', updated_at = now() where order_id = target.order_id;
  return 1;
end;
$$;

-- Rider refreshes can requeue orders after offers expire. Re-dispatch when an
-- accepted-but-not-picked-up assignment is explicitly returned to the queue.
create trigger deliveries_auto_dispatch_requeue
  after update of status on public.deliveries
  for each row
  when (new.status = 'PENDING_ASSIGNMENT' and old.status is distinct from new.status)
  execute function public.trg_auto_dispatch();

-- Repair existing self-assignments that have not left the accepted stage.
-- The trigger above will offer these to other online riders; if none are online,
-- they remain safely queued for the next rider refresh.
update public.delivery_offers o
  set status = 'cancelled', decided_at = now()
  from public.deliveries d
  join public.orders ord on ord.id = d.order_id
  where o.order_id = d.order_id
    and o.rider_id = d.rider_id
    and ord.customer_id = d.rider_id
    and d.status = 'ACCEPTED'
    and o.status in ('pending', 'accepted');

update public.deliveries d
  set rider_id = null, status = 'PENDING_ASSIGNMENT', updated_at = now()
  from public.orders ord
  where ord.id = d.order_id
    and ord.customer_id = d.rider_id
    and d.status = 'ACCEPTED';
