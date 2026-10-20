-- KARIAKOO order creation.
--
-- Orders are created ONLY through this SECURITY DEFINER function — the orders /
-- order_items / fulfillment_groups / deliveries tables have no client insert
-- policy. The function never trusts a client price: it reads every unit price
-- and commission rate from the database, so a tampered cart cannot change what
-- is charged or what the shop is owed.
--
-- One call creates the order, its line items (one per product), a fulfilment
-- group per shop, and a delivery row (PENDING_ASSIGNMENT, ready for dispatch).
-- Stock is reserved. Payments and the delivery PIN come in later phases, so the
-- order starts `placed` / `pending` and the delivery PIN hash stays null.

create function public.place_order(
  p_items jsonb,            -- [{ "product_id": uuid, "quantity": int }, ...]
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

  -- Idempotency: a repeated key returns the first order instead of a duplicate.
  select * into existing from public.orders where customer_id = caller and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', existing.id, 'reference', existing.reference, 'reused', true);
  end if;

  -- Delivery fee is decided by the server from the zone, never sent by the client.
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

    -- Most specific commission rule wins: shop, then category, then default.
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

  insert into public.deliveries (order_id, status, rider_payout_tzs)
    values (v_order, 'PENDING_ASSIGNMENT', v_fee);

  insert into public.order_status_history (order_id, label, actor)
    values (v_order, 'Order placed', 'customer');

  return jsonb_build_object(
    'order_id', v_order,
    'reference', v_ref,
    'merchandise_tzs', v_merch,
    'delivery_fee_tzs', v_fee,
    'total_tzs', v_merch + v_fee
  );
end;
$$;

revoke execute on function public.place_order(jsonb, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text) to authenticated;
