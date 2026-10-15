-- KARIAKOO Row Level Security isolation tests.
--
-- Run in the Supabase SQL editor (or via the MCP execute_sql tool). Everything
-- happens inside one transaction that is ALWAYS rolled back at the end by a
-- final RAISE, so no test data is left behind. The final message says either
-- "RLS OK: n checks passed" or lists the failures.
do $$
declare
  cust_a uuid := gen_random_uuid(); cust_b uuid := gen_random_uuid();
  sell_1 uuid := gen_random_uuid(); sell_2 uuid := gen_random_uuid();
  ride_1 uuid := gen_random_uuid(); ride_2 uuid := gen_random_uuid();
  admin_u uuid := gen_random_uuid();
  shop_1 uuid; shop_2 uuid; shop_3 uuid;
  prod_1 uuid; prod_2 uuid; prod_3 uuid;
  ord_1 uuid; ord_2 uuid;
  n bigint; ok boolean; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@rls.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[cust_a, cust_b, sell_1, sell_2, ride_1, ride_2, admin_u]) as u;
  insert into public.user_roles (user_id, role) values
    (sell_1, 'seller'), (sell_2, 'seller'), (ride_1, 'rider'), (ride_2, 'rider'), (admin_u, 'admin');
  insert into public.riders (id, vehicle, plate, base_zone, status) values
    (ride_1, 'Motorcycle', 'TEST 1', 'kariakoo', 'approved'), (ride_2, 'Motorcycle', 'TEST 2', 'ilala', 'approved');
  insert into public.categories (slug, name, name_sw) values ('rls-test', 'RLS test', 'Jaribio') on conflict do nothing;

  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('rls-shop-one', sell_1, 'Shop One', 'rls-test', 'kariakoo', 'A St', 'approved') returning id into shop_1;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('rls-shop-two', sell_2, 'Shop Two', 'rls-test', 'kariakoo', 'B St', 'approved') returning id into shop_2;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('rls-shop-pending', sell_2, 'Shop Pending', 'rls-test', 'kariakoo', 'C St', 'pending') returning id into shop_3;

  insert into public.products (shop_id, slug, name, category, price_tzs, stock) values (shop_1, 'rls-prod-one', 'Product One', 'rls-test', 10000, 5) returning id into prod_1;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock) values (shop_2, 'rls-prod-two', 'Product Two', 'rls-test', 20000, 5) returning id into prod_2;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock) values (shop_3, 'rls-prod-hidden', 'Product Hidden', 'rls-test', 30000, 5) returning id into prod_3;

  insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key)
    values ('KK-990001', cust_a, 'kariakoo', 'Home A', 'cod', 2000, 'k1') returning id into ord_1;
  insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key)
    values ('KK-990002', cust_b, 'ilala', 'Home B', 'cod', 3500, 'k2') returning id into ord_2;
  insert into public.order_items (order_id, product_id, shop_id, product_name, unit_price_tzs, quantity, commission_bps, commission_tzs) values
    (ord_1, prod_1, shop_1, 'Product One', 10000, 1, 1000, 1000),
    (ord_2, prod_2, shop_2, 'Product Two', 20000, 1, 1000, 2000);
  insert into public.fulfillment_groups (order_id, shop_id) values (ord_1, shop_1), (ord_2, shop_2);
  insert into public.deliveries (order_id, rider_id, status, rider_payout_tzs, pin_hash) values
    (ord_1, ride_1, 'ACCEPTED', 1500, 'hash-1'), (ord_2, ride_2, 'ACCEPTED', 2500, 'hash-2');
  insert into public.commission_rules (scope, rate_bps, effective_from, note) values ('default', 1000, now() - interval '1 day', 'test');

  -- ------------------------------------------------------------ anonymous visitor
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{}', true);
  select count(*) into n from public.products where slug like 'rls-%';
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('anon sees %s products, expected 2 (no pending-shop product)', n)); end if;
  select count(*) into n from public.orders;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'anon can read orders'); end if;
  select count(*) into n from public.shops where slug like 'rls-%';
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('anon sees %s shops, expected 2', n)); end if;

  -- ------------------------------------------------------------ customer A
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust_a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.orders;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('customer A sees %s orders, expected 1', n)); end if;
  select count(*) into n from public.orders where id = ord_2;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'customer A can read customer B''s order'); end if;
  select count(*) into n from public.order_items;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('customer A sees %s order items, expected 1', n)); end if;
  select count(*) into n from public.deliveries;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('customer A sees %s deliveries, expected 1', n)); end if;
  ok := false; begin perform pin_hash from public.deliveries; exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'customer can read delivery PIN hash'); end if;
  ok := false; begin insert into public.user_roles (user_id, role) values (cust_a, 'admin'); exception when others then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'customer granted themselves admin'); end if;
  ok := false; begin insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key) values ('KK-990003', cust_a, 'kariakoo', 'x', 'cod', 0, 'k3'); exception when others then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'customer inserted an order directly (must go through the server)'); end if;
  select count(*) into n from public.commission_rules;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'customer can read commission rules'); end if;
  update public.profiles set full_name = 'Hacked' where id = cust_b;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'customer edited another profile'); end if;

  -- ------------------------------------------------------------ seller 1
  perform set_config('request.jwt.claims', json_build_object('sub', sell_1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.order_items;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('seller 1 sees %s order items, expected 1', n)); end if;
  select count(*) into n from public.order_items where shop_id = shop_2;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 1 sees seller 2''s order items'); end if;
  select count(*) into n from public.orders;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller can read orders table (customer address/contact)'); end if;
  update public.products set price_tzs = 12000 where id = prod_1;
  get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'seller 1 could not update own product'); end if;
  update public.products set price_tzs = 1 where id = prod_2;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 1 changed seller 2''s product price'); end if;
  ok := false; begin update public.products set price_tzs = 50 where id = prod_1; exception when check_violation then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'price below TSh 100 accepted'); end if;
  ok := false; begin update public.shops set status = 'approved', verified = true where id = shop_1; exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'seller changed own shop verification'); end if;
  update public.fulfillment_groups set status = 'accepted' where order_id = ord_1 and shop_id = shop_1;
  get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'seller 1 could not accept own order'); end if;
  ok := false; begin update public.fulfillment_groups set status = 'delivered' where order_id = ord_1; exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'seller marked goods delivered'); end if;
  update public.fulfillment_groups set status = 'accepted' where order_id = ord_2;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 1 updated seller 2''s fulfilment'); end if;
  -- No update policy: RLS silently matches 0 rows (and the trigger blocks it anyway).
  ok := false; begin update public.order_items set unit_price_tzs = 1 where order_id = ord_1; get diagnostics n = row_count; ok := n = 0; exception when others then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'order item price snapshot was changed'); end if;

  -- ------------------------------------------------------------ rider 1
  perform set_config('request.jwt.claims', json_build_object('sub', ride_1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.orders;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('rider 1 sees %s orders, expected 1', n)); end if;
  select count(*) into n from public.deliveries where order_id = ord_2;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider 1 sees rider 2''s delivery'); end if;
  ok := false; begin update public.riders set status = 'suspended' where id = ride_1; exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider changed own approval status'); end if;
  update public.products set price_tzs = 1000 where id = prod_1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider changed a product price'); end if;
  select count(*) into n from public.commission_rules;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider can read commission rules'); end if;

  -- ------------------------------------------------------------ admin
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  select count(*) into n from public.orders where reference like 'KK-99%';
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('admin sees %s test orders, expected 2', n)); end if;
  insert into public.commission_rules (scope, rate_bps, effective_from, note, created_by) values ('default', 900, now() + interval '30 days', 'future', admin_u);
  passed := passed + 1;
  ok := false; begin update public.commission_rules set rate_bps = 1 where true; get diagnostics n = row_count; ok := n = 0; exception when others then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'commission rules were edited in place'); end if;
  ok := false; begin perform pin_hash from public.deliveries; exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'admin API role can read PIN hashes'); end if;

  -- ------------------------------------------------------------ result (always rolls back)
  if array_length(failures, 1) is null then
    raise exception 'RLS OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'RLS FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
