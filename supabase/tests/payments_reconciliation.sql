-- KARIAKOO payment-ledger tests. One transaction, always rolled back (final
-- RAISE). Confirms record_payment_transaction enforces admin-only access, a
-- validated status state machine, idempotency on provider_ref, immutability of
-- ledger rows, and customer RLS on the ledger.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  admin uuid := gen_random_uuid();
  v_shop uuid; prod uuid; order_a uuid; order_b uuid;
  tx uuid; v_status public.payment_status; n bigint; ok boolean;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@pay.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, admin]) as u;
  insert into public.user_roles (user_id, role) values (seller, 'seller'), (admin, 'admin');
  insert into public.categories (slug, name, name_sw) values ('pay-test', 'Pay', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('pay-shop', seller, 'Pay Shop', 'pay-test', 'kariakoo', 'A St', 'approved') returning id into v_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (v_shop, 'pay-prod', 'Pay Product', 'pay-test', 10000, 10) returning id into prod;
  insert into public.commission_rules (scope, rate_bps, effective_from, note)
    values ('default', 1000, now() - interval '1 day', 'test');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  order_a := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'pay-a')->>'order_id')::uuid;
  order_b := (public.place_order(jsonb_build_array(jsonb_build_object('product_id', prod, 'quantity', 1)), 'kariakoo', 'Home', 'cod', 'pay-b')->>'order_id')::uuid;

  -- non-admin cannot record a transaction
  ok := false;
  begin perform public.record_payment_transaction(order_a, 'cod', 'cod_collected', 10000);
  exception when sqlstate '42501' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'customer was allowed to record a payment'); end if;

  -- admin records COD collection -> order becomes successful
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  tx := public.record_payment_transaction(order_a, 'cod', 'cod_collected', 10000, null, 'rider collected');
  execute 'reset role';
  select payment_status into v_status from public.orders where id = order_a;
  if v_status = 'successful' then passed := passed + 1; else failures := array_append(failures, format('after cod_collected status is %s', v_status)); end if;

  -- invalid transition: refund (ok) then succeeded (rejected from refunded)
  perform set_config('request.jwt.claims', json_build_object('sub', admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.record_payment_transaction(order_a, 'cod', 'refunded', 10000, null, 'refund');
  ok := false;
  begin perform public.record_payment_transaction(order_a, 'mpesa', 'succeeded', 10000, 'x-1');
  exception when sqlstate '22023' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'refunded -> succeeded was allowed'); end if;

  -- idempotency: the same provider_ref cannot be recorded twice
  perform public.record_payment_transaction(order_b, 'mpesa', 'succeeded', 10000, 'ref-dup');
  ok := false;
  begin perform public.record_payment_transaction(order_b, 'mpesa', 'succeeded', 10000, 'ref-dup');
  exception when unique_violation then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'duplicate provider_ref was accepted'); end if;

  -- immutability of ledger rows
  execute 'reset role';
  ok := false;
  begin update public.payment_transactions set note = 'tamper' where id = tx;
  exception when sqlstate '42501' then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'payment_transactions row was mutable'); end if;

  -- RLS: the order's customer can read its ledger rows
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  select count(*) into n from public.payment_transactions where order_id = order_a;
  if n >= 1 then passed := passed + 1; else failures := array_append(failures, 'customer cannot read own payment ledger'); end if;

  execute 'reset role';
  if array_length(failures, 1) is null then
    raise exception 'PAYMENTS RECONCILIATION OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PAYMENTS RECONCILIATION FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
