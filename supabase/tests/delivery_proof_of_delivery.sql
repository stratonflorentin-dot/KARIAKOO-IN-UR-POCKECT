-- KARIAKOO proof-of-delivery tests. One transaction, always rolled back (final
-- RAISE). Covers rider_add_delivery_proof: path scoping (cross-order + traversal
-- rejected), rider-only authorization, and participant RLS on delivery_proofs.
do $$
declare
  seller uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  cust2 uuid := gen_random_uuid();
  rider uuid := gen_random_uuid();
  v_shop uuid; prod uuid; order1 uuid; v_id uuid; n bigint; ok boolean;
  passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@pod.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[seller, cust, cust2, rider]) as u;
  insert into public.user_roles (user_id, role) values (seller,'seller'),(rider,'rider');
  insert into public.riders (id, vehicle, plate, base_zone, status) values (rider,'boda','T1 AB','kariakoo','approved');
  insert into public.categories (slug,name,name_sw) values ('pod-test','POD','Jaribio') on conflict do nothing;
  insert into public.shops (slug,owner_id,name,primary_category,area,address,status)
    values ('pod-shop',seller,'POD Shop','pod-test','kariakoo','A St','approved') returning id into v_shop;
  insert into public.products (shop_id,slug,name,category,price_tzs,stock)
    values (v_shop,'pod-prod','POD','pod-test',10000,20) returning id into prod;
  insert into public.commission_rules (scope,rate_bps,effective_from,note) values ('default',1000,now()-interval '1 day','t');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',cust,'role','authenticated')::text, true);
  order1 := (public.place_order(jsonb_build_array(jsonb_build_object('product_id',prod,'quantity',1)),'kariakoo','Home','cod','pod-1')->>'order_id')::uuid;

  execute 'reset role';
  update public.deliveries set rider_id = rider, status='IN_TRANSIT' where order_id = order1;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub',rider,'role','authenticated')::text, true);
  v_id := public.rider_add_delivery_proof(order1, order1::text || '/photo.jpg', 'Handed to customer');
  if v_id is not null then passed:=passed+1; else failures:=array_append(failures,'proof not created'); end if;

  ok:=false; begin perform public.rider_add_delivery_proof(order1, gen_random_uuid()::text || '/x.jpg', ''); exception when sqlstate '22023' then ok:=true; end;
  if ok then passed:=passed+1; else failures:=array_append(failures,'cross-order path accepted'); end if;

  ok:=false; begin perform public.rider_add_delivery_proof(order1, order1::text || '/../evil.jpg', ''); exception when sqlstate '22023' then ok:=true; end;
  if ok then passed:=passed+1; else failures:=array_append(failures,'path traversal accepted'); end if;

  perform set_config('request.jwt.claims', json_build_object('sub',cust,'role','authenticated')::text, true);
  ok:=false; begin perform public.rider_add_delivery_proof(order1, order1::text || '/x.jpg', ''); exception when sqlstate '42501' then ok:=true; end;
  if ok then passed:=passed+1; else failures:=array_append(failures,'non-rider added proof'); end if;

  select count(*) into n from public.delivery_proofs where order_id = order1;
  if n >= 1 then passed:=passed+1; else failures:=array_append(failures,'order customer cannot read proof'); end if;
  perform set_config('request.jwt.claims', json_build_object('sub',cust2,'role','authenticated')::text, true);
  select count(*) into n from public.delivery_proofs where order_id = order1;
  if n = 0 then passed:=passed+1; else failures:=array_append(failures,'another customer read the proof'); end if;

  execute 'reset role';
  if array_length(failures,1) is null then
    raise exception 'PROOF OF DELIVERY OK: % checks passed (rolled back)', passed;
  else
    raise exception 'PROOF OF DELIVERY FAILED (% passed): %', passed, array_to_string(failures,' | ');
  end if;
end $$;
