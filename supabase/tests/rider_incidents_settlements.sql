-- KARIAKOO rider incidents + settlement tests. One transaction, always rolled
-- back (final RAISE). Covers SOS reporting + admin resolution transitions and
-- idempotent daily settlement reconciliation.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  admin uuid := gen_random_uuid();
  v_shop uuid; prod uuid; order1 uuid; order2 uuid;
  inc uuid; res jsonb; settle_id uuid; v text; n bigint; ok boolean;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@ri.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, rider, admin]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller'), (rider, 'rider'), (admin, 'admin');
  insert into public.riders (id, vehicle, plate, base_zone, status) values (rider, 'boda', 'T1 AB', 'kariakoo', 'approved');
  insert into public.categories (slug, name, name_sw) values ('ri-test', 'RI', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('ri-shop', seller, 'RI Shop', 'ri-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'ri-prod', 'RI Product', 'ri-test', 10000, 20) returning id into prod;
  insert into public.commission_rules (scope, rate_bps, effective_from, note) values ('default', 1000, now() - interval '1 day', 'test');

  -- two orders (kariakoo payout 2000 each)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  order1 := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'ri-1')->>'order_id')::uuid;
  order2 := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'ri-2')->>'order_id')::uuid;

  -- force both delivered on 2026-10-20 (Dar date), assigned to the rider
  execute 'reset role';
  update public.deliveries set rider_id = rider, status = 'DELIVERED', delivered_at = '2026-10-20 12:00:00+00'
    where order_id in (order1, order2);

  -- ---- incidents ----
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', rider, 'role', 'authenticated')::text, true);
  inc := public.rider_report_incident('sos', 'Need help near market', order1, -6.82, 39.27);

  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  ok := false;
  begin perform public.rider_report_incident('sos'); exception when sqlstate '42501' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'non-rider could report incident'); end if;

  execute 'reset role';
  select count(*) into n from public.rider_incidents where id = inc and kind = 'sos' and status = 'open' and rider_id = rider and order_id = order1;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'SOS incident not recorded as expected'); end if;

  -- admin acknowledge then resolve; then an invalid backward transition
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  v := public.admin_update_incident(inc, 'acknowledged');
  if v = 'acknowledged' then passed := passed + 1; else failures := array_append(failures, 'acknowledge failed'); end if;
  v := public.admin_update_incident(inc, 'resolved');
  if v = 'resolved' then passed := passed + 1; else failures := array_append(failures, 'resolve failed'); end if;
  ok := false;
  begin perform public.admin_update_incident(inc, 'acknowledged'); exception when sqlstate '22023' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'resolved -> acknowledged was allowed'); end if;

  -- ---- settlement ----
  res := public.admin_settle_rider_day(rider, '2026-10-20');
  if (res->>'deliveries_count')::int = 2 and (res->>'gross_tzs')::bigint = 4000 then passed := passed + 1;
    else failures := array_append(failures, 'settlement totals wrong: ' || res::text); end if;
  settle_id := (res->>'settlement_id')::uuid;

  -- re-settling the same day finds nothing (idempotent)
  ok := false;
  begin perform public.admin_settle_rider_day(rider, '2026-10-20'); exception when sqlstate 'P0002' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 're-settlement was allowed'); end if;

  -- mark paid, then marking again fails
  v := public.admin_mark_settlement_paid(settle_id);
  if v = 'paid' then passed := passed + 1; else failures := array_append(failures, 'mark paid failed'); end if;
  ok := false;
  begin perform public.admin_mark_settlement_paid(settle_id); exception when sqlstate '22023' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'double paid was allowed'); end if;

  -- non-admin cannot settle
  perform set_config('request.jwt.claims', json_build_object('sub', rider, 'role', 'authenticated')::text, true);
  ok := false;
  begin perform public.admin_settle_rider_day(rider, '2026-10-20'); exception when sqlstate '42501' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'non-admin could settle'); end if;

  execute 'reset role';
  if array_length(failures, 1) is null then
    raise exception 'RIDER OPS OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'RIDER OPS FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
