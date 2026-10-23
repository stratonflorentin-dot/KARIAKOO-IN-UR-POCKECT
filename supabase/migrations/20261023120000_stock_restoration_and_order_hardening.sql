-- Phase 2 (P0-1, P1-4, P2-5): inventory integrity + place_order hardening.
--
-- 1. Restore reserved stock when a fulfilment group is rejected or cancelled.
--    place_order reserves stock on every line; before this migration nothing
--    ever gave it back, so a seller rejection silently lost inventory forever.
--    A trigger on fulfillment_groups restores it exactly once per close, from
--    whatever path makes the change (seller RPC, admin, future cancellation).
-- 2. place_order rejects a blank idempotency key (a blank key made a later
--    genuine order silently return the first one as "reused").
-- 3. place_order locks each product row (FOR UPDATE) and decrements with a
--    guarded UPDATE, so a concurrency loser gets a clear "Not enough stock"
--    instead of a raw check-constraint error. (Oversell was already impossible
--    thanks to the stock >= 0 CHECK; this is about a correct, friendly failure.)

-- ---------------------------------------------------------------- stock restoration
-- Trigger-only function: fires on the table, never an API endpoint.
create or replace function public.restore_group_stock() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Give back exactly what this group's lines reserved, respecting the 100000 cap.
  update public.products p
     set stock = least(p.stock + s.qty, 100000)
    from (
      select product_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = new.order_id and shop_id = new.shop_id
      group by product_id
    ) s
   where p.id = s.product_id;

  insert into public.order_status_history (order_id, label, actor)
    values (
      new.order_id,
      case when new.status = 'rejected'
           then 'Stock restored after shop rejection'
           else 'Stock restored after cancellation' end,
      'system'
    );
  return new;
end;
$$;

revoke execute on function public.restore_group_stock() from public, anon, authenticated;

-- Fire only on the transition INTO a closed state, so stock is restored once.
create trigger fulfillment_groups_restore_stock
  after update on public.fulfillment_groups
  for each row
  when (
    new.status in ('rejected', 'cancelled')
    and old.status is distinct from new.status
    and old.status not in ('rejected', 'cancelled')
  )
  execute function public.restore_group_stock();

-- ---------------------------------------------------------------- place_order (hardened)
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
  -- A blank idempotency key would collide across unrelated orders.
  if coalesce(btrim(p_idempotency_key), '') = '' then
    raise exception 'A valid order request key is required' using errcode = '22023';
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

    -- Lock the product row so price and stock stay consistent and concurrent
    -- orders for the same product serialise instead of racing.
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
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

    -- Guarded decrement: a concurrent loser changes 0 rows and gets a clear message.
    update public.products set stock = stock - v_qty where id = v_product.id and stock >= v_qty;
    if not found then
      raise exception 'Not enough stock for %', v_product.name using errcode = '23514';
    end if;
    v_merch := v_merch + v_product.price_tzs * v_qty;
  end loop;

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
