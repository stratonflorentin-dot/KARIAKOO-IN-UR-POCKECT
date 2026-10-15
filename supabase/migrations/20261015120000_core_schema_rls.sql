-- KARIAKOO core schema with Row Level Security (Phase 2).
--
-- Principles
--  * RLS is enabled on every table and denies by default; policies grant the minimum.
--  * Roles live in user_roles, which no client can write (no insert/update/delete policies).
--  * Money is bigint whole TZS; rates are integer basis points (1000 = 10%).
--  * Order items, commission rules and audit logs are immutable (triggers block changes).
--  * Orders are created only by trusted server code (Phase 4); clients have no insert policy.
--  * Helper functions are SECURITY DEFINER with an empty search_path to avoid hijacking.

-- ---------------------------------------------------------------- enums
create type public.app_role as enum ('customer', 'seller', 'rider', 'admin');
create type public.shop_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.product_status as enum ('active', 'archived');
create type public.rider_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.order_status as enum ('placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');
create type public.fulfillment_status as enum ('awaiting_seller', 'accepted', 'rejected', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled');
create type public.settlement_status as enum ('not_due', 'pending', 'settled');
create type public.delivery_status as enum ('PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- ---------------------------------------------------------------- people
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+255[67][0-9]{8}$'),
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------- catalog
create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  name_sw text not null,
  sort_order int not null default 0
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  primary_category text not null references public.categories (slug),
  area text not null,
  address text not null,
  description text not null default '',
  opening_hours text not null default '',
  status public.shop_status not null default 'pending',
  verified boolean not null default false,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count int not null default 0 check (review_count >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index shops_owner_idx on public.shops (owner_id);
create index shops_status_idx on public.shops (status);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  name text not null check (char_length(name) between 3 and 120),
  category text not null references public.categories (slug),
  price_tzs bigint not null check (price_tzs between 100 and 50000000),
  compare_at_tzs bigint check (compare_at_tzs is null or compare_at_tzs > price_tzs),
  stock int not null default 0 check (stock between 0 and 100000),
  unit text not null default 'piece',
  description text not null default '',
  highlights text[] not null default '{}',
  status public.product_status not null default 'active',
  sold_count int not null default 0 check (sold_count >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_shop_idx on public.products (shop_id);
create index products_category_idx on public.products (category);

create table public.riders (
  id uuid primary key references public.profiles (id) on delete cascade,
  vehicle text not null,
  plate text not null,
  base_zone text not null,
  status public.rider_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- commission
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('default', 'category', 'shop')),
  target_shop_id uuid references public.shops (id),
  target_category text references public.categories (slug),
  rate_bps int not null check (rate_bps between 0 and 10000),
  effective_from timestamptz not null,
  note text not null default '',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  check (
    (scope = 'default' and target_shop_id is null and target_category is null) or
    (scope = 'shop' and target_shop_id is not null and target_category is null) or
    (scope = 'category' and target_category is not null and target_shop_id is null)
  )
);

-- ---------------------------------------------------------------- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^KK-[0-9]{6}$'),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  zone text not null,
  address text not null,
  instructions text not null default '',
  status public.order_status not null default 'placed',
  payment_status public.payment_status not null default 'pending',
  payment_method text not null,
  delivery_fee_tzs bigint not null check (delivery_fee_tzs >= 0),
  idempotency_key text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  shop_id uuid not null references public.shops (id) on delete restrict,
  product_name text not null,
  unit_price_tzs bigint not null check (unit_price_tzs > 0),
  quantity int not null check (quantity between 1 and 20),
  commission_bps int not null check (commission_bps between 0 and 10000),
  commission_tzs bigint not null check (commission_tzs >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_shop_idx on public.order_items (shop_id);

create table public.fulfillment_groups (
  order_id uuid not null references public.orders (id) on delete restrict,
  shop_id uuid not null references public.shops (id) on delete restrict,
  status public.fulfillment_status not null default 'awaiting_seller',
  settlement_status public.settlement_status not null default 'not_due',
  rejection_reason text,
  updated_at timestamptz not null default now(),
  primary key (order_id, shop_id)
);
create index fulfillment_groups_shop_idx on public.fulfillment_groups (shop_id);

create table public.deliveries (
  order_id uuid primary key references public.orders (id) on delete restrict,
  rider_id uuid references public.riders (id) on delete set null,
  status public.delivery_status not null default 'PENDING_ASSIGNMENT',
  rider_payout_tzs bigint not null default 0 check (rider_payout_tzs >= 0),
  pin_hash text,
  updated_at timestamptz not null default now()
);
create index deliveries_rider_idx on public.deliveries (rider_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete restrict,
  label text not null,
  actor text not null check (actor in ('customer', 'seller', 'rider', 'admin', 'system')),
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text not null,
  reason text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helper functions
create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = r);
$$;

create function public.owns_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shops where id = p_shop and owner_id = (select auth.uid()));
$$;

create function public.is_order_customer(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where id = p_order and customer_id = (select auth.uid()));
$$;

create function public.is_assigned_rider(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.deliveries where order_id = p_order and rider_id = (select auth.uid()));
$$;

create function public.is_public_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shops where id = p_shop and status = 'approved');
$$;

revoke execute on function public.has_role, public.owns_shop, public.is_order_customer, public.is_assigned_rider, public.is_public_shop from public, anon;
grant execute on function public.has_role, public.owns_shop, public.is_order_customer, public.is_assigned_rider, public.is_public_shop to authenticated;
-- anon needs is_public_shop for catalog reads.
grant execute on function public.is_public_shop to anon;

-- ---------------------------------------------------------------- integrity triggers
create function public.block_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '42501';
end;
$$;

create trigger order_items_immutable before update or delete on public.order_items
  for each row execute function public.block_changes();
create trigger commission_rules_immutable before update or delete on public.commission_rules
  for each row execute function public.block_changes();
create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.block_changes();

-- Non-admins may not change moderation fields on their own shop.
create function public.guard_shop_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.has_role('admin') and (
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
create trigger shops_guard before update on public.shops
  for each row execute function public.guard_shop_update();

-- Sellers may not move products to another shop or fake sales counts.
create function public.guard_product_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.has_role('admin') and (
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
create trigger products_guard before update on public.products
  for each row execute function public.guard_product_update();

-- Riders may not approve themselves.
create function public.guard_rider_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.has_role('admin') and new.status is distinct from old.status then
    raise exception 'Only admins can change rider status' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger riders_guard before update on public.riders
  for each row execute function public.guard_rider_update();

-- Sellers can only move their group through the allowed fulfilment steps,
-- and never to picked_up / delivered or settlement changes.
create function public.guard_fulfillment_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  allowed boolean;
begin
  -- Trusted server code (service role) and admins are not restricted here.
  if current_user <> 'authenticated' or public.has_role('admin') then
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
create trigger fulfillment_groups_guard before update on public.fulfillment_groups
  for each row execute function public.guard_fulfillment_update();

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.riders enable row level security;
alter table public.commission_rules enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.fulfillment_groups enable row level security;
alter table public.deliveries enable row level security;
alter table public.order_status_history enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_roles: read only. Granting roles is done by trusted server code.
create policy "user_roles: read own or admin" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));

-- categories: public read
create policy "categories: public read" on public.categories for select to anon, authenticated using (true);

-- shops
create policy "shops: public read approved" on public.shops for select to anon, authenticated
  using (status = 'approved');
create policy "shops: owner reads own" on public.shops for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "shops: admin reads all" on public.shops for select to authenticated
  using (public.has_role('admin'));
create policy "shops: sellers apply" on public.shops for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'pending' and verified = false and is_demo = false and public.has_role('seller'));
create policy "shops: owner or admin updates" on public.shops for update to authenticated
  using (owner_id = (select auth.uid()) or public.has_role('admin'))
  with check (owner_id = (select auth.uid()) or public.has_role('admin'));

-- products
create policy "products: public read live" on public.products for select to anon, authenticated
  using (status = 'active' and public.is_public_shop(shop_id));
create policy "products: owner reads own" on public.products for select to authenticated
  using (public.owns_shop(shop_id));
create policy "products: admin reads all" on public.products for select to authenticated
  using (public.has_role('admin'));
create policy "products: owner inserts" on public.products for insert to authenticated
  with check (public.owns_shop(shop_id) and is_demo = false and sold_count = 0);
create policy "products: owner or admin updates" on public.products for update to authenticated
  using (public.owns_shop(shop_id) or public.has_role('admin'))
  with check (public.owns_shop(shop_id) or public.has_role('admin'));

-- riders
create policy "riders: read own or admin" on public.riders for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));
create policy "riders: register self" on public.riders for insert to authenticated
  with check (id = (select auth.uid()) and status = 'pending' and public.has_role('rider'));
create policy "riders: update own or admin" on public.riders for update to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'))
  with check (id = (select auth.uid()) or public.has_role('admin'));

-- commission rules: admin only, append-only
create policy "commission_rules: admin read" on public.commission_rules for select to authenticated
  using (public.has_role('admin'));
create policy "commission_rules: admin add" on public.commission_rules for insert to authenticated
  with check (public.has_role('admin') and created_by = (select auth.uid()));

-- orders: no client inserts (server creates orders in Phase 4)
create policy "orders: customer reads own" on public.orders for select to authenticated
  using (customer_id = (select auth.uid()));
create policy "orders: assigned rider reads" on public.orders for select to authenticated
  using (public.is_assigned_rider(id));
create policy "orders: admin reads all" on public.orders for select to authenticated
  using (public.has_role('admin'));

-- order items
create policy "order_items: customer reads own" on public.order_items for select to authenticated
  using (public.is_order_customer(order_id));
create policy "order_items: seller reads own shop lines" on public.order_items for select to authenticated
  using (public.owns_shop(shop_id));
create policy "order_items: assigned rider reads" on public.order_items for select to authenticated
  using (public.is_assigned_rider(order_id));
create policy "order_items: admin reads all" on public.order_items for select to authenticated
  using (public.has_role('admin'));

-- fulfilment groups
create policy "fulfillment: customer reads own" on public.fulfillment_groups for select to authenticated
  using (public.is_order_customer(order_id));
create policy "fulfillment: seller reads own shop" on public.fulfillment_groups for select to authenticated
  using (public.owns_shop(shop_id));
create policy "fulfillment: assigned rider reads" on public.fulfillment_groups for select to authenticated
  using (public.is_assigned_rider(order_id));
create policy "fulfillment: admin reads all" on public.fulfillment_groups for select to authenticated
  using (public.has_role('admin'));
create policy "fulfillment: seller or admin updates" on public.fulfillment_groups for update to authenticated
  using (public.owns_shop(shop_id) or public.has_role('admin'))
  with check (public.owns_shop(shop_id) or public.has_role('admin'));

-- deliveries (status changes go through server functions in Phase 6)
create policy "deliveries: customer reads own" on public.deliveries for select to authenticated
  using (public.is_order_customer(order_id));
create policy "deliveries: rider reads assigned" on public.deliveries for select to authenticated
  using (rider_id = (select auth.uid()));
create policy "deliveries: admin reads all" on public.deliveries for select to authenticated
  using (public.has_role('admin'));
-- Nobody reads the PIN hash through the API, whatever their row access.
revoke select on public.deliveries from anon, authenticated;
grant select (order_id, rider_id, status, rider_payout_tzs, updated_at) on public.deliveries to authenticated;

-- status history
create policy "history: customer reads own" on public.order_status_history for select to authenticated
  using (public.is_order_customer(order_id));
create policy "history: assigned rider reads" on public.order_status_history for select to authenticated
  using (public.is_assigned_rider(order_id));
create policy "history: admin reads all" on public.order_status_history for select to authenticated
  using (public.has_role('admin'));

-- audit logs: admin read only; written by trusted server functions
create policy "audit_logs: admin read" on public.audit_logs for select to authenticated
  using (public.has_role('admin'));

-- ---------------------------------------------------------------- new users
-- Every new auth user gets a profile and the customer role. Other roles are
-- granted only by trusted server code after verification.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
