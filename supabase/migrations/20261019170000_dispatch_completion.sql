-- KARIAKOO auto-dispatch + delivery completion.
--
-- Closes the loop: placing an order now offers its delivery to online riders
-- automatically, the customer gets a 4-digit PIN, and the rider completes the
-- delivery by entering that PIN.

-- ---------------------------------------------------------------- customer PIN
-- The PIN the customer reads and gives to the rider on hand-over. Only the
-- order's customer can read it (RLS); riders never can. It is written only by
-- place_order (SECURITY DEFINER), so there is no write policy.
create table public.delivery_pins (
  order_id uuid primary key references public.deliveries (order_id) on delete cascade,
  pin text not null check (pin ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);
alter table public.delivery_pins enable row level security;
create policy "delivery_pins: customer reads own" on public.delivery_pins for select to authenticated
  using (private.is_order_customer(order_id));

-- ---------------------------------------------------------------- auto-dispatch
-- Offer a pending delivery to every online, approved rider who is free. Called
-- by the trigger below (during the customer's place_order) and callable by the
-- order's customer or an admin to re-dispatch. Offers are written directly
-- (trusted path), so it does not go through offer_delivery's admin-only gate.
create function public.auto_dispatch_delivery(p_order uuid, p_ttl int default 45) returns int
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
  if not found or d.status <> 'PENDING_ASSIGNMENT' then
    return 0;
  end if;

  for r in
    select p.rider_id
    from public.rider_presence p
    join public.riders ri on ri.id = p.rider_id
    where p.is_online
      and ri.status = 'approved'
      and not exists (
        select 1 from public.deliveries dd
        where dd.rider_id = p.rider_id and dd.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      )
  loop
    insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
      values (p_order, r.rider_id, d.rider_payout_tzs, 'pending', now(), now() + make_interval(secs => p_ttl))
    on conflict (order_id, rider_id) do update
      set status = 'pending', payout_tzs = excluded.payout_tzs, offered_at = now(),
          expires_at = excluded.expires_at, decided_at = null
      where public.delivery_offers.status in ('declined', 'expired', 'cancelled');
    n := n + 1;
  end loop;

  if n > 0 then
    update public.deliveries set status = 'ASSIGNED', updated_at = now() where order_id = p_order;
  end if;
  return n;
end;
$$;

-- Fire auto-dispatch whenever a new PENDING_ASSIGNMENT delivery appears.
create function public.trg_auto_dispatch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'PENDING_ASSIGNMENT' then
    perform public.auto_dispatch_delivery(new.order_id);
  end if;
  return new;
end;
$$;
create trigger deliveries_auto_dispatch after insert on public.deliveries
  for each row execute function public.trg_auto_dispatch();

-- ---------------------------------------------------------------- place_order (adds the PIN)
create or replace function public.place_order(
  p_items jsonb,
  p_zone text,
  p_address text,
  p_payment_method text,
  p_idempotency_key text,
  p_instructions text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_order uuid;
  v_ref text;
  v_fee int;
  v_pin text;
  v_item jsonb;
  v_product public.products;
  v_qty int;
  v_bps int;
  v_merch bigint := 0;
  existing public.orders;
begin
  if caller is null then
    raise exception 'Please sign in to order' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty' using errcode = '23514';
  end if;
  if coalesce(btrim(p_address), '') = '' then
    raise exception 'A delivery address is required' using errcode = '23514';
  end if;

  select * into existing from public.orders where customer_id = caller and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', existing.id, 'reference', existing.reference, 'reused', true);
  end if;

  v_fee := case p_zone
    when 'kariakoo' then 2000
    when 'ilala' then 2500
    when 'kinondoni' then 3500
    when 'ubungo' then 4000
    when 'temeke' then 4000
    when 'kigamboni' then 5000
    else 3000
  end;

  loop
    v_ref := 'KK-' || to_char(floor(random() * 900000 + 100000), 'FM000000');
    exit when not exists (select 1 from public.orders where reference = v_ref);
  end loop;

  insert into public.orders (reference, customer_id, zone, address, instructions, payment_method, delivery_fee_tzs, idempotency_key)
    values (v_ref, caller, p_zone, p_address, coalesce(p_instructions, ''), p_payment_method, v_fee, p_idempotency_key)
    returning id into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Each item needs a quantity of 1 to 20' using errcode = '23514';
    end if;

    select * into v_product from public.products where id = (v_item->>'product_id')::uuid;
    if not found or v_product.status <> 'active' or not private.is_public_shop(v_product.shop_id) then
      raise exception 'A product in your cart is no longer available' using errcode = '23514';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Not enough stock for %', v_product.name using errcode = '23514';
    end if;

    v_bps := coalesce(
      (select rate_bps from public.commission_rules where scope = 'shop' and target_shop_id = v_product.shop_id and effective_from <= now() order by effective_from desc limit 1),
      (select rate_bps from public.commission_rules where scope = 'category' and target_category = v_product.category and effective_from <= now() order by effective_from desc limit 1),
      (select rate_bps from public.commission_rules where scope = 'default' and effective_from <= now() order by effective_from desc limit 1),
      1000);

    insert into public.order_items (order_id, product_id, shop_id, product_name, unit_price_tzs, quantity, commission_bps, commission_tzs)
      values (v_order, v_product.id, v_product.shop_id, v_product.name, v_product.price_tzs, v_qty, v_bps,
              round(v_product.price_tzs::numeric * v_qty * v_bps / 10000));

    insert into public.fulfillment_groups (order_id, shop_id) values (v_order, v_product.shop_id)
      on conflict (order_id, shop_id) do nothing;

    update public.products set stock = stock - v_qty where id = v_product.id;
    v_merch := v_merch + v_product.price_tzs * v_qty;
  end loop;

  -- Delivery (the AFTER INSERT trigger auto-dispatches it) + the customer PIN.
  insert into public.deliveries (order_id, status, rider_payout_tzs)
    values (v_order, 'PENDING_ASSIGNMENT', v_fee);
  v_pin := to_char(floor(random() * 9000 + 1000), 'FM0000');
  insert into public.delivery_pins (order_id, pin) values (v_order, v_pin);

  insert into public.order_status_history (order_id, label, actor)
    values (v_order, 'Order placed', 'customer');

  return jsonb_build_object(
    'order_id', v_order,
    'reference', v_ref,
    'merchandise_tzs', v_merch,
    'delivery_fee_tzs', v_fee,
    'total_tzs', v_merch + v_fee,
    'pin', v_pin
  );
end;
$$;

-- ---------------------------------------------------------------- complete with PIN
create function public.rider_complete_delivery(p_order uuid, p_pin text) returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
  v_pin text;
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

  select pin into v_pin from public.delivery_pins where order_id = p_order;
  if v_pin is null or v_pin <> coalesce(btrim(p_pin), '') then
    raise exception 'That PIN is not correct' using errcode = '22023';
  end if;

  update public.deliveries set status = 'DELIVERED', updated_at = now() where order_id = p_order;
  update public.orders set status = 'delivered' where id = p_order;
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Delivered — customer PIN verified', 'rider');
  return 'DELIVERED';
end;
$$;

-- ---------------------------------------------------------------- grants
revoke execute on function
  public.auto_dispatch_delivery(uuid, int),
  public.rider_complete_delivery(uuid, text)
  from public, anon;
grant execute on function
  public.auto_dispatch_delivery(uuid, int),
  public.rider_complete_delivery(uuid, text)
  to authenticated;
revoke execute on function public.trg_auto_dispatch() from public, anon, authenticated;
