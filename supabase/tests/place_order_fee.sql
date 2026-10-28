-- place_order server-computed delivery fee tests. One transaction, always
-- rolled back (final RAISE). Confirms p_delivery_fee_tzs is used as-is, floored
-- at the config minimum, and falls back to the zone fee when null.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  v_shop uuid; prod uuid; res jsonb; n bigint; passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@fee.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller');
  insert into public.categories (slug, name, name_sw) values ('fee-test', 'Fee', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('fee-shop', seller, 'Fee Shop', 'fee-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'fee-prod', 'Fee Product', 'fee-test', 10000, 50) returning id into prod;
  insert into public.commission_rules (scope, rate_bps, effective_from, note) values ('default', 1000, now() - interval '1 day', 'test');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);

  res := public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'fee-1', '', 7500);
  if (res->>'delivery_fee_tzs')::int = 7500 then passed := passed + 1; else failures := array_append(failures, 'supplied fee not used: ' || res::text); end if;

  res := public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'fee-2', '', 500);
  if (res->>'delivery_fee_tzs')::int = 2000 then passed := passed + 1; else failures := array_append(failures, 'fee not floored to minimum: ' || res::text); end if;

  res := public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'fee-3', '', null);
  if (res->>'delivery_fee_tzs')::int = 2000 then passed := passed + 1; else failures := array_append(failures, 'null fee did not use zone fallback: ' || res::text); end if;

  execute 'reset role';
  select delivery_fee_tzs into n from public.orders where idempotency_key = 'fee-1' and customer_id = cust;
  if n = 7500 then passed := passed + 1; else failures := array_append(failures, format('stored order fee %s, expected 7500', n)); end if;
  select rider_payout_tzs into n from public.deliveries d join public.orders o on o.id = d.order_id where o.idempotency_key = 'fee-1' and o.customer_id = cust;
  if n = 7500 then passed := passed + 1; else failures := array_append(failures, format('rider payout %s, expected 7500', n)); end if;

  if array_length(failures, 1) is null then
    raise exception 'PLACE_ORDER FEE OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PLACE_ORDER FEE FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
