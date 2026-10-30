-- KARIAKOO offer-vehicle test. One transaction, always rolled back (final RAISE).
-- rider_offer_vehicles exposes the chosen transport vehicle (parsed from the
-- order's [Usafiri: ...] marker) only for orders the caller has a pending offer
-- on, so the pre-accept offer card shows the real vehicle.
do $$
declare
  cust uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  rider2 uuid := gen_random_uuid();
  v_order uuid; v_vehicle text; n bigint;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@veh.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[cust, rider, rider2]) as u;
  insert into public.user_roles (user_id, role) values (rider,'rider'),(rider2,'rider');
  insert into public.riders (id, vehicle, plate, base_zone, status)
    values (rider,'bajaji','T1 AB','kariakoo','approved'),(rider2,'boda','T2 CD','kariakoo','approved');

  insert into public.orders (reference, customer_id, zone, address, payment_method, delivery_fee_tzs, idempotency_key, instructions)
    values ('KK-111111', cust, 'kariakoo', 'Home', 'cod', 5977, 'veh-1',
            '[Usafiri: Bajaji ya Mizigo (TSh 5,977)] leave at the gate') returning id into v_order;
  -- status ASSIGNED so the auto-dispatch trigger does not create competing offers
  insert into public.deliveries (order_id, status, rider_payout_tzs) values (v_order, 'ASSIGNED', 5977);
  insert into public.delivery_offers (order_id, rider_id, payout_tzs, status, offered_at, expires_at)
    values (v_order, rider, 5977, 'pending', now(), now() + interval '45 seconds');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',rider,'role','authenticated')::text, true);
  select vehicle into v_vehicle from public.rider_offer_vehicles() where order_id = v_order;
  if v_vehicle = 'Bajaji ya Mizigo' then passed:=passed+1; else failures:=array_append(failures, format('got vehicle "%s", expected "Bajaji ya Mizigo"', v_vehicle)); end if;

  perform set_config('request.jwt.claims', json_build_object('sub',rider2,'role','authenticated')::text, true);
  select count(*) into n from public.rider_offer_vehicles();
  if n = 0 then passed:=passed+1; else failures:=array_append(failures,'non-offered rider saw an offer vehicle'); end if;

  execute 'reset role';
  if array_length(failures,1) is null then
    raise exception 'OFFER VEHICLE OK: % checks passed (rolled back)', passed;
  else
    raise exception 'OFFER VEHICLE FAILED (% passed): %', passed, array_to_string(failures,' | ');
  end if;
end $$;
