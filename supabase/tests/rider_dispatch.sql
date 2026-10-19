-- KARIAKOO rider dispatch tests (Phase 6).
--
-- Exercises the offer / accept / decline / advance flow and its RLS. Like
-- rls_isolation.sql, everything runs in one transaction that ALWAYS rolls back
-- via a final RAISE, so no data is left behind. The final message is either
-- "DISPATCH OK: n checks passed" or a list of failures.
do $$
declare
  cust uuid := gen_random_uuid();
  ride_1 uuid := gen_random_uuid(); ride_2 uuid := gen_random_uuid();
  admin_u uuid := gen_random_uuid();
  shop_1 uuid; prod_1 uuid;
  ord_main uuid; ord_exp uuid;
  st public.delivery_status; n bigint; ok boolean; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@disp.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[cust, ride_1, ride_2, admin_u]) as u;
  insert into public.user_roles (user_id, role) values
    (ride_1, 'rider'), (ride_2, 'rider'), (admin_u, 'admin');
  insert into public.riders (id, vehicle, plate, base_zone, status) values
    (ride_1, 'Motorcycle', 'DSP 1', 'kariakoo', 'approved'),
    (ride_2, 'Motorcycle', 'DSP 2', 'kariakoo', 'approved');
  insert into public.categories (slug, name, name_sw) values ('disp-test', 'Dispatch test', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('disp-shop', cust, 'Dispatch Shop', 'disp-test', 'kariakoo', 'A St', 'approved') returning id into shop_1;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock)
    values (shop_1, 'disp-prod', 'Dispatch Product', 'disp-test', 10000, 5) returning id into prod_1;

  insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key)
    values ('KK-980001', cust, 'kariakoo', 'Home', 'cod', 2000, 'd1') returning id into ord_main;
  insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key)
    values ('KK-980002', cust, 'kariakoo', 'Home', 'cod', 2000, 'd2') returning id into ord_exp;
  insert into public.deliveries (order_id, status, rider_payout_tzs) values
    (ord_main, 'PENDING_ASSIGNMENT', 1500), (ord_exp, 'PENDING_ASSIGNMENT', 2000);
  -- An already-expired offer to rider 1 on ord_exp (inserted directly as owner).
  insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
    values (ord_exp, ride_1, 2000, 'pending', now() - interval '2 minutes', now() - interval '1 minute');

  execute 'set local role authenticated';

  -- ------------------------------------------------------------ dispatch offers (as admin)
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  perform public.offer_delivery(ord_main, ride_1, 30);
  perform public.offer_delivery(ord_main, ride_2, 30);
  select status into st from public.deliveries where order_id = ord_main;
  if st = 'ASSIGNED' then passed := passed + 1; else failures := array_append(failures, format('offer did not move delivery to ASSIGNED (got %s)', st)); end if;
  select count(*) into n from public.delivery_offers where order_id = ord_main;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('expected 2 offers on ord_main, got %s', n)); end if;

  -- ------------------------------------------------------------ rider 2 (offered, but loses the race later)
  perform set_config('request.jwt.claims', json_build_object('sub', ride_2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.delivery_offers;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('rider 2 sees %s offers, expected only their own 1', n)); end if;
  select count(*) into n from public.delivery_offers where rider_id = ride_1;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider 2 can see rider 1''s offers'); end if;
  -- A rider cannot hand out jobs.
  ok := false; begin perform public.offer_delivery(ord_main, ride_2, 30); exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider was allowed to call offer_delivery'); end if;
  -- No offer to rider 2 on ord_exp, so they cannot accept it.
  ok := false; begin perform public.rider_accept_offer(ord_exp); exception when no_data_found then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider 2 accepted an order with no offer to them'); end if;

  -- ------------------------------------------------------------ rider 1 accepts
  perform set_config('request.jwt.claims', json_build_object('sub', ride_1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.delivery_offers;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('rider 1 sees %s offers, expected 2', n)); end if;
  select count(*) into n from public.delivery_offers where status = 'pending' and expires_at > now();
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('rider 1 has %s live offers, expected 1', n)); end if;
  -- The stale offer is refused.
  ok := false; begin perform public.rider_accept_offer(ord_exp); exception when invalid_parameter_value then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'expired offer was accepted'); end if;
  -- The live one succeeds.
  select public.rider_accept_offer(ord_main) into st;
  if st = 'ACCEPTED' then passed := passed + 1; else failures := array_append(failures, format('accept returned %s, expected ACCEPTED', st)); end if;
  select status into st from public.deliveries where order_id = ord_main;
  if st = 'ACCEPTED' then passed := passed + 1; else failures := array_append(failures, format('delivery not ACCEPTED after accept (got %s)', st)); end if;

  -- ------------------------------------------------------------ rider 2 lost the race
  perform set_config('request.jwt.claims', json_build_object('sub', ride_2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.delivery_offers where status = 'pending';
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider 2''s offer stayed pending after rider 1 took the job'); end if;
  ok := false; begin perform public.rider_accept_offer(ord_main); exception when invalid_parameter_value then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider 2 accepted a job already taken'); end if;

  -- ------------------------------------------------------------ rider 1 advances the job
  perform set_config('request.jwt.claims', json_build_object('sub', ride_1, 'role', 'authenticated')::text, true);
  select public.rider_advance_delivery(ord_main, 'PICKED_UP') into st;
  if st = 'PICKED_UP' then passed := passed + 1; else failures := array_append(failures, 'could not move to PICKED_UP'); end if;
  select public.rider_advance_delivery(ord_main, 'IN_TRANSIT') into st;
  if st = 'IN_TRANSIT' then passed := passed + 1; else failures := array_append(failures, 'could not move to IN_TRANSIT'); end if;
  -- Completion is PIN-gated elsewhere, not reachable by advancing.
  ok := false; begin perform public.rider_advance_delivery(ord_main, 'DELIVERED'); exception when invalid_parameter_value then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider reached DELIVERED without the PIN'); end if;
  -- Cannot advance a job that is not theirs.
  ok := false; begin perform public.rider_advance_delivery(ord_exp, 'PICKED_UP'); exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'rider advanced a delivery not assigned to them'); end if;

  -- ------------------------------------------------------------ presence
  perform public.rider_set_presence(true, 39.27, -6.82);
  select count(*) into n from public.rider_presence where rider_id = ride_1 and is_online and lng is not null;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'rider 1 presence not recorded'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub', ride_2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.rider_presence where rider_id = ride_1;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'rider 2 can see rider 1''s location'); end if;
  perform public.rider_set_presence(true, 39.28, -6.81);
  select count(*) into n from public.rider_presence;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('rider 2 sees %s presence rows, expected only own 1', n)); end if;

  -- ------------------------------------------------------------ admin oversight
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  select count(*) into n from public.rider_presence;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('admin sees %s presence rows, expected 2', n)); end if;
  select count(*) into n from public.delivery_offers where order_id = ord_main;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, 'admin cannot see all offers'); end if;
  -- Offering a delivery that is already accepted is refused.
  ok := false; begin perform public.offer_delivery(ord_main, ride_2, 30); exception when invalid_parameter_value then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'offered a delivery that was already accepted'); end if;

  -- ------------------------------------------------------------ result (always rolls back)
  if array_length(failures, 1) is null then
    raise exception 'DISPATCH OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'DISPATCH FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
