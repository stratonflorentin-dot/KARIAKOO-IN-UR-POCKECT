-- Cancellation fee (pricing brief §1).
--
-- A cancellation past the grace window (after a rider accepted) incurs the
-- configured fee. We stamp deliveries.accepted_at via a BEFORE trigger so this
-- never has to touch the (actively-evolving) dispatch RPCs, and read the fee +
-- grace from the active pricing_configs. calculate_cancellation_fee is a pure
-- calculation (it returns the fee; it does not charge) so the UI and a future
-- cancellation flow share one authoritative rule.

alter table public.deliveries add column if not exists accepted_at timestamptz;

-- (No backfill: deliveries carries no historical accepted_at; the trigger below
-- stamps it going forward. Existing rows simply report "free" until re-accepted.)

create or replace function public.stamp_delivery_accepted_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'ACCEPTED' and old.status is distinct from 'ACCEPTED' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

create trigger deliveries_stamp_accepted_at
  before update of status on public.deliveries
  for each row execute function public.stamp_delivery_accepted_at();

create or replace function public.calculate_cancellation_fee(p_order uuid, p_user_role text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_customer uuid;
  v_rider uuid;
  v_accepted timestamptz;
  v_fee int;
  v_grace int;
  v_mins numeric := 0;
  fee int := 0;
  chargeable boolean := false;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if p_user_role not in ('customer', 'rider') then
    raise exception 'Role must be customer or rider' using errcode = '22023';
  end if;

  select o.customer_id, d.rider_id, d.accepted_at
    into v_customer, v_rider, v_accepted
    from public.orders o
    join public.deliveries d on d.order_id = o.id
    where o.id = p_order;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- Only this order's customer or its assigned rider may ask.
  if not (
    (p_user_role = 'customer' and v_customer = caller and private.has_role('customer'))
    or (p_user_role = 'rider' and v_rider = caller and private.has_role('rider'))
  ) then
    raise exception 'Not allowed to price this cancellation' using errcode = '42501';
  end if;

  select cancellation_fee_tzs, cancellation_grace_mins
    into v_fee, v_grace
    from public.pricing_configs where is_active limit 1;
  v_grace := coalesce(v_grace, 3);

  -- A fee applies to the customer cancelling past the grace window once a rider
  -- has accepted. Before acceptance, or within grace, cancellation is free.
  if p_user_role = 'customer' and v_accepted is not null then
    v_mins := extract(epoch from (now() - v_accepted)) / 60.0;
    if v_mins > v_grace then
      fee := coalesce(v_fee, 0);
      chargeable := true;
    end if;
  end if;

  return jsonb_build_object(
    'fee_tzs', fee,
    'chargeable', chargeable,
    'mins_since_accepted', round(v_mins),
    'grace_mins', v_grace
  );
end;
$$;

revoke execute on function public.calculate_cancellation_fee(uuid, text) from public, anon;
grant execute on function public.calculate_cancellation_fee(uuid, text) to authenticated;
