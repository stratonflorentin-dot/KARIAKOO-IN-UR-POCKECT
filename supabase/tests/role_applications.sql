-- KARIAKOO role-application + admin-approval tests.
-- Runs in one transaction that always rolls back (final RAISE). Message is
-- "ROLE APPS OK: n checks passed" or lists failures.
do $$
declare
  cust uuid := gen_random_uuid();
  admin_u uuid := gen_random_uuid();
  shop_id uuid;
  n bigint; ok boolean; txt text; passed int := 0; failures text[] := '{}';
begin
  -- ------------------------------------------------------------ seed (as owner)
  -- Inserting the auth users fires handle_new_user → profile + customer role.
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  select u, u::text || '@roleapp.test', 'authenticated', 'authenticated', '{}'::jsonb
  from unnest(array[cust, admin_u]) as u;
  insert into public.user_roles (user_id, role) values (admin_u, 'admin');
  insert into public.categories (slug, name, name_sw) values ('app-test', 'App test', 'Jaribio') on conflict do nothing;

  execute 'set local role authenticated';

  -- ------------------------------------------------------------ customer applies to sell
  perform set_config('request.jwt.claims', json_build_object('sub', cust, 'role', 'authenticated')::text, true);
  select count(*) into n from public.user_roles where user_id = cust and role = 'seller';
  if n = 0 then passed := passed + 1; else failures := array_append(failures, 'customer already had seller role'); end if;

  perform public.apply_as_seller('Test Shop', 'app-test', 'kariakoo', 'A Street');
  select count(*) into n from public.user_roles where user_id = cust and role = 'seller';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'apply_as_seller did not grant the seller role'); end if;
  select count(*) into n from public.shops where owner_id = cust and status = 'pending';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, format('expected 1 pending shop, got %s', n)); end if;
  select id into shop_id from public.shops where owner_id = cust limit 1;

  -- Idempotent: applying again does not create a second shop.
  perform public.apply_as_seller('Test Shop 2', 'app-test', 'kariakoo', 'B Street');
  select count(*) into n from public.shops where owner_id = cust;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'apply_as_seller created a duplicate shop'); end if;

  -- ------------------------------------------------------------ customer applies to ride
  perform public.apply_as_rider('Motorcycle', 'T 123 ABC', 'kariakoo');
  select count(*) into n from public.user_roles where user_id = cust and role = 'rider';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'apply_as_rider did not grant the rider role'); end if;
  select count(*) into n from public.riders where id = cust and status = 'pending';
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'apply_as_rider did not create a pending rider row'); end if;

  -- ------------------------------------------------------------ non-admin cannot approve
  ok := false;
  begin perform public.admin_set_shop_status(shop_id, 'approved'); exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'a non-admin approved a shop'); end if;
  ok := false;
  begin perform public.admin_set_rider_status(cust, 'approved'); exception when insufficient_privilege then ok := true; end;
  if ok then passed := passed + 1; else failures := array_append(failures, 'a non-admin approved a rider'); end if;
  -- The shop must still be pending after the blocked call.
  select status into txt from public.shops where id = shop_id;
  if txt = 'pending' then passed := passed + 1; else failures := array_append(failures, format('shop status changed to %s without admin', txt)); end if;

  -- ------------------------------------------------------------ admin approves
  perform set_config('request.jwt.claims', json_build_object('sub', admin_u, 'role', 'authenticated')::text, true);
  perform public.admin_set_shop_status(shop_id, 'approved');
  select status into txt from public.shops where id = shop_id;
  if txt = 'approved' then passed := passed + 1; else failures := array_append(failures, format('shop not approved (got %s)', txt)); end if;
  select count(*) into n from public.shops where id = shop_id and verified;
  if n = 1 then passed := passed + 1; else failures := array_append(failures, 'approved shop was not verified'); end if;

  perform public.admin_set_rider_status(cust, 'approved');
  select status into txt from public.riders where id = cust;
  if txt = 'approved' then passed := passed + 1; else failures := array_append(failures, format('rider not approved (got %s)', txt)); end if;

  -- ------------------------------------------------------------ result (always rolls back)
  if array_length(failures, 1) is null then
    raise exception 'ROLE APPS OK: % checks passed (test data rolled back)', passed;
  else
    raise exception 'ROLE APPS FAILED (% passed): %', passed, array_to_string(failures, ' | ');
  end if;
end;
$$;
