-- KARIAKOO role applications + admin approval.
--
-- A new user only ever gets the `customer` role (the handle_new_user trigger),
-- and user_roles has no write policy, so becoming a seller or rider must go
-- through trusted code. These SECURITY DEFINER functions are that path:
--  * a signed-in user applies to sell or ride — this grants the role (as a
--    PENDING shop/rider row) and creates their shop/rider record.
--  * an admin approves/suspends/rejects, flipping the shop/rider status.
-- The role grant plus a `pending` status means "applied, not yet live": RLS
-- for public catalog / dispatch already keys off `approved`, so a pending
-- seller/rider can sign in to their app but isn't visible to customers or
-- offered jobs until an admin approves them.

-- ---------------------------------------------------------------- helpers
-- A unique, valid shop slug (^[a-z0-9-]{3,80}$) from the shop name.
create function private.shop_slug(p_name text) returns text
language plpgsql set search_path = '' as $$
declare
  stem text;
  candidate text;
begin
  stem := regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g');
  stem := trim(both '-' from stem);
  if length(stem) < 2 then stem := 'shop'; end if;
  stem := left(stem, 60);
  loop
    candidate := stem || '-' || to_char(floor(random() * 9000 + 1000), 'FM0000');
    exit when not exists (select 1 from public.shops where slug = candidate);
  end loop;
  return candidate;
end;
$$;
revoke execute on function private.shop_slug(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- apply as seller
create function public.apply_as_seller(
  p_name text,
  p_category text,
  p_area text,
  p_address text
) returns public.shops
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  result public.shops;
begin
  if caller is null then
    raise exception 'Please sign in first' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' or char_length(p_name) < 2 then
    raise exception 'A shop name is required' using errcode = '23514';
  end if;
  if not exists (select 1 from public.categories where slug = p_category) then
    raise exception 'Unknown category' using errcode = '23503';
  end if;

  -- Idempotent: if they already have a shop, return it unchanged.
  select * into result from public.shops where owner_id = caller limit 1;
  if found then
    return result;
  end if;

  insert into public.user_roles (user_id, role) values (caller, 'seller')
    on conflict (user_id, role) do nothing;

  insert into public.shops (slug, owner_id, name, primary_category, area, address, status, verified, is_demo)
    values (private.shop_slug(p_name), caller, p_name, p_category, p_area, p_address, 'pending', false, false)
    returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------- apply as rider
create function public.apply_as_rider(
  p_vehicle text,
  p_plate text,
  p_base_zone text
) returns public.riders
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  result public.riders;
begin
  if caller is null then
    raise exception 'Please sign in first' using errcode = '42501';
  end if;
  if coalesce(btrim(p_vehicle), '') = '' or coalesce(btrim(p_plate), '') = '' then
    raise exception 'Vehicle and plate are required' using errcode = '23514';
  end if;

  select * into result from public.riders where id = caller;
  if found then
    return result;
  end if;

  insert into public.user_roles (user_id, role) values (caller, 'rider')
    on conflict (user_id, role) do nothing;

  insert into public.riders (id, vehicle, plate, base_zone, status)
    values (caller, p_vehicle, p_plate, p_base_zone, 'pending')
    returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------- admin approval
create function public.admin_set_shop_status(p_shop uuid, p_status public.shop_status)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.has_role('admin') then
    raise exception 'Only admins can moderate shops' using errcode = '42501';
  end if;
  update public.shops
    set status = p_status, verified = (p_status = 'approved')
    where id = p_shop;
  if not found then
    raise exception 'No such shop' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
    values ((select auth.uid()), 'shop_status', 'shop', p_shop::text, jsonb_build_object('status', p_status));
end;
$$;

create function public.admin_set_rider_status(p_rider uuid, p_status public.rider_status)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not private.has_role('admin') then
    raise exception 'Only admins can moderate riders' using errcode = '42501';
  end if;
  update public.riders set status = p_status where id = p_rider;
  if not found then
    raise exception 'No such rider' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
    values ((select auth.uid()), 'rider_status', 'rider', p_rider::text, jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------------- grants
revoke execute on function
  public.apply_as_seller(text, text, text, text),
  public.apply_as_rider(text, text, text),
  public.admin_set_shop_status(uuid, public.shop_status),
  public.admin_set_rider_status(uuid, public.rider_status)
  from public, anon;
grant execute on function
  public.apply_as_seller(text, text, text, text),
  public.apply_as_rider(text, text, text),
  public.admin_set_shop_status(uuid, public.shop_status),
  public.admin_set_rider_status(uuid, public.rider_status)
  to authenticated;
