-- KARIAKOO end-to-end: place order -> auto-dispatch -> accept -> deliver (PIN).
-- One transaction, always rolled back. "DISPATCH E2E OK: n checks passed".
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  v_shop uuid; prod_id uuid; res jsonb; v_pin text; v_order uuid;
  n bigint; ok boolean; txt text; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@dc.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, rider]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller'), (rider, 'rider');
  insert into public.riders (id, vehicle, plate, base_zone, status) values (rider, 'Motorcycle', 'R 1', 'kariakoo', 'approved');
  insert into public.rider_presence (rider_id, is_online, lng, lat) values (rider, true, 39.27, -6.82);
  insert into public.categories (slug, name, name_sw) values ('dc-test', 'DC test', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('dc-shop', seller, 'DC Shop', 'dc-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'dc-prod', 'DC Product', 'dc-test', 10000, 10) returning id into prod_id;
  insert into public.commission_rules (scope, rate_bps, effective_from, note) values ('default', 1000, now() - interval '1 day', 't');

  execute 'set local role authenticated';

  -- ------------------------------------------------------------ customer places an order
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  res := public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 2)),
    'kariakoo', 'My home', 'cod', 'k1');
  v_order := (res->>'order_id')::uuid;
  v_pin := res->>'pin';

  if v_pin ~ '^[0-9]{4}$' then passed := passed + 1; else failures := array_append(failures, 'no 4-digit PIN returned'); end if;
  -- Auto-dispatch moved the delivery to ASSIGNED.
  select status into txt from public.deliveries where order_id = v_order;
  if txt = 'ASSIGNED' then passed := passed + 1; else failures := array_append(failures, format('delivery not auto-dispatched (got %s)', txt)); end if;
  -- Customer can read their own PIN.
  select pin into txt from public.delivery_pins where order_id = v_order;
  if txt = v_pin then passed := passed + 1; else failures := array_append(failures, 'customer cannot read their PIN'); end if;

  -- ------------------------------------------------------------ rider side
  perform set_config('request.jwt.claims', json_build_object('sub', rider, 'role', 'authenticated')::text, true);
  select count(*) into n from public.delivery_pins where order_id = v_order;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider can read the customer PIN'); end if;
  select count(*) into n from public.delivery_offers where order_id = v_order and rider_id = rider and status = 'pending';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'rider was not auto-offered the job'); end if;

  perform public.rider_accept_offer(v_order);
  select status into txt from public.deliveries where order_id = v_order;
  if txt = 'ACCEPTED' then passed := passed + 1; else failures := array_append(failures, 'accept did not set ACCEPTED'); end if;

  perform public.rider_advance_delivery(v_order, 'PICKED_UP');
  perform public.rider_advance_delivery(v_order, 'IN_TRANSIT');

  -- Wrong PIN is refused.
  ok := false;
  begin perform public.rider_complete_delivery(v_order, '0000'); exception when invalid_parameter_value then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'wrong PIN completed the delivery'); end if;

  -- Correct PIN completes it.
  select public.rider_complete_delivery(v_order, v_pin) into txt;
  if txt = 'DELIVERED' then passed := passed + 1; else failures := array_append(failures, format('complete returned %s', txt)); end if;
  select status into txt from public.deliveries where order_id = v_order;
  if txt = 'DELIVERED' then passed := passed + 1; else failures := array_append(failures, 'delivery not DELIVERED'); end if;

  -- ------------------------------------------------------------ order reflects delivery
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  select status::text into txt from public.orders where id = v_order;
  if txt = 'delivered' then passed := passed + 1; else failures := array_append(failures, format('order status %s, expected delivered', txt)); end if;

  if array_length(failures, 1) is null then
    raise exception 'DISPATCH E2E OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'DISPATCH E2E FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
