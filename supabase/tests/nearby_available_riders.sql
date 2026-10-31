-- KARIAKOO nearby-rider discovery test. One transaction, always rolled back
-- (final RAISE). nearby_available_riders returns only eligible riders (online,
-- approved, fresh, not on an active delivery, within radius), nearest-first, as
-- DE-IDENTIFIED snapped points, with working vehicle + radius filters.
do $$
declare
  cust uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid(); r5 uuid := gen_random_uuid(); r6 uuid := gen_random_uuid();
  clat double precision := -6.8161; clng double precision := 39.2803;
  v_order uuid; n bigint; v_first text; v_approx double precision;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text||'@nr.test','authenticated','authenticated','{}'::jsonb
  from unnest(array[cust,r1,r2,r3,r4,r5,r6]) u;
  insert into public.riders (id,vehicle,plate,base_zone,status) values
    (r1,'Bajaji ya Mizigo','T1','kariakoo','approved'),
    (r2,'boda','T2','kariakoo','approved'),
    (r3,'pickup','T3','kariakoo','approved'),
    (r4,'boda','T4','kariakoo','approved'),
    (r5,'boda','T5','kariakoo','approved'),
    (r6,'boda','T6','kariakoo','approved');
  insert into public.rider_presence (rider_id,is_online,lat,lng,updated_at) values
    (r1,true,-6.8185,39.2803, now()),                     -- ~267 m, eligible
    (r2,true,-6.8251,39.2803, now()),                     -- ~1 km, eligible
    (r3,true,-6.8170,39.2803, now()),                     -- busy (active delivery)
    (r4,true,-6.8170,39.2804, now()-interval '5 minutes'),-- stale
    (r5,false,-6.8170,39.2805, now()),                    -- offline
    (r6,true,-6.9000,39.2803, now());                     -- ~9 km, out of radius
  insert into public.orders (reference,customer_id,zone,address,payment_method,delivery_fee_tzs,idempotency_key)
    values ('KK-222222',cust,'kariakoo','Home','cod',2000,'nr-1') returning id into v_order;
  insert into public.deliveries (order_id,rider_id,status,rider_payout_tzs) values (v_order,r3,'IN_TRANSIT',2000);

  select count(*) into n from public.nearby_available_riders(clat,clng,5000,null);
  if n = 2 then passed:=passed+1; else failures:=array_append(failures,format('got %s riders, expected 2', n)); end if;

  select vehicle into v_first from public.nearby_available_riders(clat,clng,5000,null) limit 1;
  if v_first = 'bajaji' then passed:=passed+1; else failures:=array_append(failures,format('nearest is %s, expected bajaji', v_first)); end if;

  select approx_lat into v_approx from public.nearby_available_riders(clat,clng,5000,'bajaji');
  if v_approx <> -6.8185 and abs(v_approx - (-6.818)) < 0.0005 then passed:=passed+1; else failures:=array_append(failures,format('approx_lat %s not de-identified', v_approx)); end if;

  select count(*) into n from public.nearby_available_riders(clat,clng,5000,'bajaji');
  if n = 1 then passed:=passed+1; else failures:=array_append(failures,format('bajaji filter got %s, expected 1', n)); end if;
  select count(*) into n from public.nearby_available_riders(clat,clng,5000,'pickup');
  if n = 0 then passed:=passed+1; else failures:=array_append(failures,format('pickup filter got %s, expected 0', n)); end if;

  select count(*) into n from public.nearby_available_riders(clat,clng,500,null);
  if n = 1 then passed:=passed+1; else failures:=array_append(failures,format('500m radius got %s, expected 1', n)); end if;

  if array_length(failures,1) is null then
    raise exception 'NEARBY RIDERS OK: % checks passed (rolled back)', passed;
  else
    raise exception 'NEARBY RIDERS FAILED (% passed): %', passed, array_to_string(failures,' | ');
  end if;
end $$;
