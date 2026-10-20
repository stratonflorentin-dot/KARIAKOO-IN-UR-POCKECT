-- KARIAKOO order-creation tests. One transaction, always rolled back (final
-- RAISE). Message: "PLACE ORDER OK: n checks passed" or the failures.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  v_shop uuid;
  prod_id uuid;
  res jsonb;
  n bigint; ok boolean; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@order.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller');
  insert into public.categories (slug, name, name_sw) values ('ord-test', 'Order test', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('ord-shop', seller, 'Order Shop', 'ord-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'ord-prod', 'Order Product', 'ord-test', 10000, 10) returning id into prod_id;
  insert into public.commission_rules (scope, rate_bps, effective_from, note)
    values ('default', 1000, now() - interval '1 day', 'test');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);

  -- ------------------------------------------------------------ place an order
  res := public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 2)),
    'kariakoo', 'My home, Dar', 'cod', 'idem-1', 'Leave at the gate');

  if (res->>'merchandise_tzs')::bigint = 20000 then passed := passed + 1; else failures := array_append(failures, format('merch total %s, expected 20000', res->>'merchandise_tzs')); end if;
  if (res->>'delivery_fee_tzs')::bigint = 2000 then passed := passed + 1; else failures := array_append(failures, 'wrong delivery fee for kariakoo'); end if;
  if (res->>'total_tzs')::bigint = 22000 then passed := passed + 1; else failures := array_append(failures, 'wrong total'); end if;

  select count(*) into n from public.orders where customer_id = cust;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('expected 1 order, got %s', n)); end if;

  -- Server-side price + commission (the client never sends a price).
  select count(*) into n from public.order_items where order_id = (res->>'order_id')::uuid
    and unit_price_tzs = 10000 and quantity = 2 and commission_bps = 1000 and commission_tzs = 2000;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'order item price/commission is wrong'); end if;

  select count(*) into n from public.fulfillment_groups fg where fg.order_id = (res->>'order_id')::uuid and fg.shop_id = v_shop;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'fulfilment group missing'); end if;

  select count(*) into n from public.deliveries where order_id = (res->>'order_id')::uuid and status = 'PENDING_ASSIGNMENT' and rider_payout_tzs = 2000;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'delivery row missing or wrong'); end if;

  -- Stock was reserved (10 - 2 = 8).
  select stock into n from public.products where id = prod_id;
  if n = 8 then passed := passed + 1; else failures := array_append(failures, format('stock is %s, expected 8', n)); end if;

  -- ------------------------------------------------------------ idempotency
  res := public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 2)),
    'kariakoo', 'My home, Dar', 'cod', 'idem-1');
  if (res->>'reused') = 'true' then passed := passed + 1; else failures := array_append(failures, 'repeated idempotency key was not reused'); end if;
  select count(*) into n from public.orders where customer_id = cust;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'idempotent retry created a second order'); end if;
  select stock into n from public.products where id = prod_id;
  if n = 8 then passed := passed + 1; else failures := array_append(failures, 'idempotent retry changed stock'); end if;

  -- ------------------------------------------------------------ overselling is refused (atomic)
  ok := false;
  begin
    perform public.place_order(
      jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 20)),
      'kariakoo', 'My home', 'cod', 'idem-2');
  exception when check_violation then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'oversold beyond available stock'); end if;
  select count(*) into n from public.orders where customer_id = cust;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'failed order left a partial row'); end if;

  -- ------------------------------------------------------------ result (always rolls back)
  if array_length(failures, 1) is null then
    raise exception 'PLACE ORDER OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PLACE ORDER FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
