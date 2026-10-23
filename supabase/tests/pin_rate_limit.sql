-- KARIAKOO delivery-PIN rate-limit tests. One transaction, always rolled back
-- (final RAISE). Confirms rider_complete_delivery locks after 5 wrong attempts,
-- rejects even a correct PIN while locked, and still completes on a correct PIN.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  v_shop uuid; prod uuid;
  order_a uuid; order_b uuid;
  pin_a text; pin_b text; wrong_a text;
  res jsonb; i int;
  v_status public.delivery_status;
  passed int := 0; failures text[] := '{}';
begin
  -- seed (auth.users trigger creates profiles + customer role)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@pin.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, rider]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller'), (rider, 'rider');
  insert into public.riders (id, vehicle, plate, base_zone, status)
    values (rider, 'boda', 'T123 ABC', 'kariakoo', 'approved');
  insert into public.categories (slug, name, name_sw) values ('pin-test', 'Pin', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('pin-shop', seller, 'Pin Shop', 'pin-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'pin-prod', 'Pin Product', 'pin-test', 10000, 10) returning id into prod;
  insert into public.commission_rules (scope, rate_bps, effective_from, note)
    values ('default', 1000, now() - interval '1 day', 'test');

  -- customer places two orders
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  order_a := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'pin-a')->>'order_id')::uuid;
  order_b := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'pin-b')->>'order_id')::uuid;

  -- owner: read PINs and put both deliveries in transit for the rider
  execute 'reset role';
  select pin into pin_a from public.delivery_pins where order_id = order_a;
  select pin into pin_b from public.delivery_pins where order_id = order_b;
  wrong_a := case when pin_a = '0000' then '1111' else '0000' end;
  update public.deliveries set rider_id = rider, status = 'IN_TRANSIT' where order_id in (order_a, order_b);

  -- act as the rider
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', rider, 'role', 'authenticated')::text, true);

  -- 1st wrong attempt: incorrect, 4 left
  res := public.rider_complete_delivery(order_a, wrong_a);
  if res->>'ok' = 'false' and res->>'error' = 'incorrect' and (res->>'attempts_left')::int = 4
    then passed := passed + 1; else failures := array_append(failures, 'first wrong attempt wrong: ' || res::text); end if;

  -- attempts 2..5
  for i in 2..5 loop
    res := public.rider_complete_delivery(order_a, wrong_a);
  end loop;
  -- 5th (last loop) should be locked
  if res->>'ok' = 'false' and res->>'error' = 'locked'
    then passed := passed + 1; else failures := array_append(failures, '5th attempt not locked: ' || res::text); end if;

  -- correct PIN while locked is still refused
  res := public.rider_complete_delivery(order_a, pin_a);
  if res->>'ok' = 'false' and res->>'error' = 'locked'
    then passed := passed + 1; else failures := array_append(failures, 'correct PIN accepted during lockout: ' || res::text); end if;

  -- delivery B: correct PIN completes
  res := public.rider_complete_delivery(order_b, pin_b);
  if res->>'ok' = 'true' and res->>'status' = 'DELIVERED'
    then passed := passed + 1; else failures := array_append(failures, 'correct PIN did not complete: ' || res::text); end if;

  -- verify as owner
  execute 'reset role';
  select status into v_status from public.deliveries where order_id = order_a;
  if v_status = 'IN_TRANSIT' then passed := passed + 1; else failures := array_append(failures, format('locked delivery A is %s, expected IN_TRANSIT', v_status)); end if;
  select status into v_status from public.deliveries where order_id = order_b;
  if v_status = 'DELIVERED' then passed := passed + 1; else failures := array_append(failures, format('delivery B is %s, expected DELIVERED', v_status)); end if;

  if array_length(failures, 1) is null then
    raise exception 'PIN RATE LIMIT OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PIN RATE LIMIT FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
