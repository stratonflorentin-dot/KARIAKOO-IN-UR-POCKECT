-- KARIAKOO delivery location-trail tests. One transaction, always rolled back
-- (final RAISE). Covers rider_ping_delivery_location: presence refresh, throttled
-- durable trail, authorization, and customer RLS on the trail.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  cust2 uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  v_shop uuid; prod uuid; order1 uuid;
  v_lat double precision; n bigint; ok boolean;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@dlp.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, cust2, rider]) as u;
  insert into public.user_roles (user_id, role) values (seller,'seller'),(rider,'rider');
  insert into public.riders (id, vehicle, plate, base_zone, status) values (rider,'boda','T1 AB','kariakoo','approved');
  insert into public.categories (slug,name,name_sw) values ('dlp-test','DLP','Jaribio') on conflict do nothing;
  insert into public.shops (slug,owner_id,name,primary_category,area,address,status)
    values ('dlp-shop',seller,'DLP Shop','dlp-test','kariakoo','A St','approved') returning id into v_shop;
  insert into public.products (shop_id,slug,name,category,price_tzs,stock)
    values (v_shop,'dlp-prod','DLP','dlp-test',10000,20) returning id into prod;
  insert into public.commission_rules (scope,rate_bps,effective_from,note) values ('default',1000,now()-interval '1 day','t');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',cust,'role','authenticated')::text, true);
  order1 := (public.place_order(jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',1)),'kariakoo','Home','cod','dlp-1')->>'order_id')::uuid;

  perform set_config('request.jwt.claims', json_build_object('sub',rider,'role','authenticated')::text, true);
  perform public.rider_set_presence(true, 39.0, -6.80);
  execute 'reset role';
  update public.deliveries set rider_id = rider, status='IN_TRANSIT' where order_id = order1;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',rider,'role','authenticated')::text, true);
  perform public.rider_ping_delivery_location(order1, -6.81, 39.27, 12.0);
  perform public.rider_ping_delivery_location(order1, -6.82, 39.28, 9.0);

  execute 'reset role';
  select lat into v_lat from public.rider_presence where rider_id = rider;
  if v_lat = -6.82 then passed:=passed+1; else failures:=array_append(failures,format('presence lat %s, expected -6.82', v_lat)); end if;
  select count(*) into n from public.delivery_location_pings where order_id = order1;
  if n = 1 then passed:=passed+1; else failures:=array_append(failures,format('trail rows %s, expected 1 (throttle)', n)); end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',cust,'role','authenticated')::text, true);
  ok:=false; begin perform public.rider_ping_delivery_location(order1,-6.8,39.2,5.0); exception when sqlstate '42501' then ok:=true; end;
  if ok then passed:=passed+1; else failures:=array_append(failures,'non-rider could ping'); end if;

  perform set_config('request.jwt.claims', json_build_object('sub',rider,'role','authenticated')::text, true);
  ok:=false; begin perform public.rider_ping_delivery_location(gen_random_uuid(),-6.8,39.2,5.0); exception when sqlstate '42501' then ok:=true; end;
  if ok then passed:=passed+1; else failures:=array_append(failures,'rider pinged an unassigned order'); end if;

  perform set_config('request.jwt.claims', json_build_object('sub',cust,'role','authenticated')::text, true);
  select count(*) into n from public.delivery_location_pings where order_id = order1;
  if n >= 1 then passed:=passed+1; else failures:=array_append(failures,'order customer cannot read trail'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub',cust2,'role','authenticated')::text, true);
  select count(*) into n from public.delivery_location_pings where order_id = order1;
  if n = 0 then passed:=passed+1; else failures:=array_append(failures,'another customer could read the trail'); end if;

  execute 'reset role';
  if array_length(failures,1) is null then
    raise exception 'LOCATION TRAIL OK: % checks passed (rolled back)', passed;
  else
    raise exception 'LOCATION TRAIL FAILED (% passed): %', passed, array_to_string(failures,' | ');
  end if;
end $$;
