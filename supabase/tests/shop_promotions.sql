-- KARIAKOO shop-promotions RLS tests. One transaction, always rolled back.
-- "PROMOS OK: n checks passed" or the failures.
do $$
declare
  sell_1 uuid := gen_random_uuid();
  sell_2 uuid := gen_random_uuid();
  cust uuid := gen_random_uuid();
  admin_u uuid := gen_random_uuid();
  shop_1 uuid; shop_2 uuid; promo_1 uuid;
  n bigint; ok boolean; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@promo.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[sell_1, sell_2, cust, admin_u]) as u;
  insert into public.user_roles (user_id, role) values (sell_1, 'seller'), (sell_2, 'seller'), (admin_u, 'admin');
  insert into public.categories (slug, name, name_sw) values ('promo-test', 'Promo test', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('promo-shop-1', sell_1, 'Promo Shop 1', 'promo-test', 'kariakoo', 'A St', 'approved') returning id into shop_1;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status)
    values ('promo-shop-2', sell_2, 'Promo Shop 2', 'promo-test', 'kariakoo', 'B St', 'approved') returning id into shop_2;

  execute 'set local role authenticated';

  -- ------------------------------------------------------------ seller 1 posts promotions
  perform set_config('request.jwt.claims', json_build_object('sub', sell_1, 'role', 'authenticated')::text, true);
  insert into public.shop_promotions (shop_id, kind, title, body, expires_at)
    values (shop_1, 'status', 'Fresh stock today!', 'New kitenge just arrived.', now() + interval '12 hours') returning id into promo_1;
  insert into public.shop_promotions (shop_id, kind, body, expires_at)
    values (shop_1, 'status', 'Yesterday''s flash sale', now() - interval '1 hour'); -- expired
  insert into public.shop_promotions (shop_id, kind, title, image_url)
    values (shop_1, 'branding', 'Our shop', 'https://example.com/banner.jpg'); -- no expiry

  select count(*) into n from public.shop_promotions where shop_id = shop_1;
  if n = 3 then passed := passed + 1; else failures := array_append(failures, format('seller 1 sees %s own promos, expected 3', n)); end if;

  -- A seller cannot post for someone else's shop.
  ok := false;
  begin
    insert into public.shop_promotions (shop_id, kind, body) values (shop_2, 'status', 'hijack');
  exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'seller 1 posted to seller 2''s shop'); end if;

  -- ------------------------------------------------------------ public visitor
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{}', true);
  select count(*) into n from public.shop_promotions where shop_id = shop_1;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('anon sees %s live promos, expected 2 (not the expired one)', n)); end if;

  -- ------------------------------------------------------------ customer (same as public)
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shop_promotions where shop_id = shop_1;
  if n = 2 then passed := passed + 1; else failures := array_append(failures, format('customer sees %s live promos, expected 2', n)); end if;

  -- ------------------------------------------------------------ seller 2 can't touch seller 1's
  perform set_config('request.jwt.claims', json_build_object('sub', sell_2, 'role', 'authenticated')::text, true);
  update public.shop_promotions set title = 'hacked' where id = promo_1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 2 edited seller 1''s promo'); end if;
  delete from public.shop_promotions where id = promo_1;
  get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 2 deleted seller 1''s promo'); end if;
  select count(*) into n from public.shop_promotions where shop_id = shop_2;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'seller 2 has unexpected promos'); end if;

  -- ------------------------------------------------------------ seller 1 manages own
  perform set_config('request.jwt.claims', json_build_object('sub', sell_1, 'role', 'authenticated')::text, true);
  update public.shop_promotions set title = 'Fresh stock — updated' where id = promo_1;
  get diagnostics n = row_count;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'seller 1 could not edit own promo'); end if;

  -- ------------------------------------------------------------ admin oversight
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  select count(*) into n from public.shop_promotions where shop_id = shop_1;
  if n = 3 then passed := passed + 1; else failures := array_append(failures, format('admin sees %s promos, expected 3', n)); end if;

  if array_length(failures, 1) is null then
    raise exception 'PROMOS OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PROMOS FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
