-- KARIAKOO stock-restoration + place_order hardening tests. One transaction,
-- always rolled back (final RAISE). Message: "STOCK RESTORATION OK: n checks
-- passed" or the failures.
--
-- Note on roles: mutations run as the acting role (customer, then seller) so
-- the SECURITY DEFINER RPCs see the right auth.uid(). Verification reads run
-- after `reset role`, because order_status_history RLS would otherwise hide a
-- row from a role that is neither the customer, the assigned rider, nor admin.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  v_shop uuid;
  prod_id uuid;
  v_order uuid;
  res jsonb;
  v_stock_after_order int;
  blank_refused boolean := false;
  n bigint; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@restock.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller');
  insert into public.categories (slug, name, name_sw) values ('restock-test', 'Restock test', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('restock-shop', seller, 'Restock Shop', 'restock-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'restock-prod', 'Restock Product', 'restock-test', 10000, 10) returning id into prod_id;
  insert into public.commission_rules (scope, rate_bps, effective_from, note)
    values ('default', 1000, now() - interval '1 day', 'test');

  -- ------------------------------------------------------------ customer places an order (reserves 3 of 10)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  res := public.place_order(
    jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 3)),
    'kariakoo', 'My home, Dar', 'cod', 'restock-idem-1');
  v_order := (res->>'order_id')::uuid;
  select stock into v_stock_after_order from public.products where id = prod_id;

  -- P1-4: a blank idempotency key is refused.
  begin
    perform public.place_order(
      jsonb_build_array(jsonb_build_object('product_id', prod_id, 'quantity', 1)),
      'kariakoo', 'My home, Dar', 'cod', '   ');
  exception when sqlstate '22023' then blank_refused := true; end;

  -- ------------------------------------------------------------ seller rejects the group
  perform set_config('request.jwt.claims', json_build_object('sub', seller, 'role', 'authenticated')::text, true);
  perform public.seller_update_fulfillment(v_order, 'rejected'::public.fulfillment_status, 'Out of stock today');

  -- ------------------------------------------------------------ verify (as owner, RLS off)
  execute 'reset role';

  if v_stock_after_order = 7 then passed := passed + 1; else failures := array_append(failures, format('after order stock is %s, expected 7', v_stock_after_order)); end if;
  if blank_refused then passed := passed + 1; else failures := array_append(failures, 'blank idempotency key was accepted'); end if;

  select stock into n from public.products where id = prod_id;
  if n = 10 then passed := passed + 1; else failures := array_append(failures, format('after rejection stock is %s, expected 10 (restored)', n)); end if;

  select count(*) into n from public.order_status_history
    where order_id = v_order and actor = 'system' and label ilike 'Stock restored%';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('expected 1 system restore history row, got %s', n)); end if;

  select count(*) into n from public.fulfillment_groups where order_id = v_order and shop_id = v_shop and status = 'rejected';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'fulfilment group was not rejected'); end if;

  -- ------------------------------------------------------------ result (always rolls back)
  if array_length(failures, 1) is null then
    raise exception 'STOCK RESTORATION OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'STOCK RESTORATION FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
