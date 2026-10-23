-- Phase 2 (P1-3): rate-limit the delivery PIN against brute force.
--
-- rider_complete_delivery checks a 4-digit PIN (10k combinations). Before this
-- migration there was no attempt limit, so the assigned rider could brute-force
-- completion. We cannot raise on a wrong PIN and still keep a counter (the RAISE
-- would roll the increment back), so the function now RETURNS jsonb and only
-- raises for authorization/state errors. After 5 wrong attempts the PIN locks
-- for 15 minutes; a correct PIN resets the counter.
--
-- The PIN stays plaintext on purpose: the customer must read it from
-- delivery_pins (RLS scopes that read to the customer) to give it to the rider,
-- so a one-way hash is incompatible with that display. RLS + the rate limit are
-- the controls; deliveries.pin_hash remains unused.

alter table public.delivery_pins
  add column if not exists attempts int not null default 0,
  add column if not exists locked_until timestamptz;

-- Return type changes (delivery_status -> jsonb), so drop and recreate.
drop function if exists public.rider_complete_delivery(uuid, text);

create function public.rider_complete_delivery(p_order uuid, p_pin text) returns jsonb
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

  -- Still inside an active lockout window.
  if v_locked is not null and v_locked > now() then
    return jsonb_build_object('ok', false, 'error', 'locked', 'retry_at', v_locked);
  end if;
  -- Lockout elapsed: start a fresh count.
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

  -- Correct PIN: complete the delivery and reset the counter.
  update public.delivery_pins set attempts = 0, locked_until = null where order_id = p_order;
  update public.deliveries set status = 'DELIVERED', updated_at = now() where order_id = p_order;
  update public.orders set status = 'delivered' where id = p_order;
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Delivered — customer PIN verified', 'rider');
  return jsonb_build_object('ok', true, 'status', 'DELIVERED');
end;
$$;

revoke execute on function public.rider_complete_delivery(uuid, text) from public, anon;
grant execute on function public.rider_complete_delivery(uuid, text) to authenticated;
