-- KARIAKOO public-catalog demo isolation test. One transaction, always rolled
-- back (final RAISE). Confirms the public-read RLS policies hide is_demo rows
-- from the anon role while still exposing real approved shops/products.
do $$
declare
  owner uuid := gen_random_uuid();
  real_shop uuid; demo_shop uuid; real_prod uuid; demo_prod uuid;
  n bigint; passed int := 0; failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
    values (owner, owner::text || '@demo.test', 'authenticated', 'authenticated', '{}'::jsonb);
  insert into public.categories (slug, name, name_sw) values ('demo-test', 'Demo', 'Jaribio') on conflict do nothing;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status, is_demo)
    values ('real-demoshop', owner, 'Real Shop', 'demo-test', 'kariakoo', 'A St', 'approved', false) returning id into real_shop;
  insert into public.shops (slug, owner_id, name, primary_category, area, address, status, is_demo)
    values ('demo-demoshop', owner, 'Demo Shop', 'demo-test', 'kariakoo', 'A St', 'approved', true) returning id into demo_shop;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock, status, is_demo)
    values (real_shop, 'real-demoprod', 'Real Product', 'demo-test', 1000, 5, 'active', false) returning id into real_prod;
  insert into public.products (shop_id, slug, name, category, price_tzs, stock, status, is_demo)
    values (demo_shop, 'demo-demoprod', 'Demo Product', 'demo-test', 1000, 5, 'active', true) returning id into demo_prod;

  -- Read as an anonymous visitor (the public storefront).
  set local role anon;

  select count(*) into n from public.products where id = demo_prod;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'demo product is visible to anon'); end if;
  select count(*) into n from public.products where id = real_prod;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'real product is not visible to anon'); end if;
  select count(*) into n from public.shops where id = demo_shop;
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'demo shop is visible to anon'); end if;
  select count(*) into n from public.shops where id = real_shop;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'real shop is not visible to anon'); end if;

  reset role;
  if array_length(failures, 1) is null then
    raise exception 'PUBLIC DEMO ISOLATION OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'PUBLIC DEMO ISOLATION FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
