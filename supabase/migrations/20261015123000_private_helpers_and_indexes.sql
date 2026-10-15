-- Hardening after Supabase advisor review.
-- 1. Move RLS helper functions into a private schema that the Data API does
--    not expose, so they can't be called as /rest/v1/rpc endpoints.
--    Policies reference functions by identity, so they keep working.
-- 2. Make the new-user trigger function non-callable.
-- 3. Index remaining foreign keys.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.has_role(public.app_role) set schema private;
alter function public.owns_shop(uuid) set schema private;
alter function public.is_order_customer(uuid) set schema private;
alter function public.is_assigned_rider(uuid) set schema private;
alter function public.is_public_shop(uuid) set schema private;

-- Trigger functions call the helper by name, so point them at the new schema.
create or replace function public.guard_shop_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.has_role('admin') and (
    new.status is distinct from old.status or
    new.verified is distinct from old.verified or
    new.owner_id is distinct from old.owner_id or
    new.rating is distinct from old.rating or
    new.review_count is distinct from old.review_count or
    new.is_demo is distinct from old.is_demo
  ) then
    raise exception 'Only admins can change shop status, verification, ownership or ratings' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.guard_product_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.has_role('admin') and (
    new.shop_id is distinct from old.shop_id or
    new.sold_count is distinct from old.sold_count or
    new.is_demo is distinct from old.is_demo
  ) then
    raise exception 'Not allowed to change shop, sales count or demo flag' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_rider_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not private.has_role('admin') and new.status is distinct from old.status then
    raise exception 'Only admins can change rider status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.guard_fulfillment_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  allowed boolean;
begin
  -- Trusted server code (service role) and admins are not restricted here.
  if current_user <> 'authenticated' or private.has_role('admin') then
    new.updated_at := now();
    return new;
  end if;
  if new.order_id is distinct from old.order_id or new.shop_id is distinct from old.shop_id
     or new.settlement_status is distinct from old.settlement_status then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  allowed := (old.status::text || '>' || new.status::text) in (
    'awaiting_seller>accepted',
    'awaiting_seller>rejected',
    'accepted>preparing',
    'preparing>ready_for_pickup'
  );
  if not allowed then
    raise exception 'Fulfilment step % -> % is not allowed for sellers', old.status, new.status using errcode = '42501';
  end if;
  if new.status = 'rejected' and coalesce(btrim(new.rejection_reason), '') = '' then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Trigger functions run from triggers only; nobody should call them via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_shop_update(), public.guard_product_update(), public.guard_rider_update(),
  public.guard_fulfillment_update(), public.block_changes() from public, anon, authenticated;

create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists commission_rules_created_by_idx on public.commission_rules (created_by);
create index if not exists commission_rules_category_idx on public.commission_rules (target_category);
create index if not exists commission_rules_shop_idx on public.commission_rules (target_shop_id);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists shops_primary_category_idx on public.shops (primary_category);
