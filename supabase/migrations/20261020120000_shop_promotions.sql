-- KARIAKOO seller advertising: shop promotions / "statuses".
--
-- Sellers advertise their business the way they do on WhatsApp/TikTok: short
-- "status" posts, teasers for upcoming products, and branding. A promotion is
-- owned by a shop; sellers create and manage their own (RLS, like products).
-- Customers see only promotions from APPROVED shops that haven't expired.

create type public.promotion_kind as enum ('status', 'teaser', 'branding');

create table public.shop_promotions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind public.promotion_kind not null default 'status',
  title text check (title is null or char_length(title) <= 120),
  body text check (body is null or char_length(body) <= 600),
  -- Photos live in Supabase Storage; only https URLs are stored.
  image_url text check (image_url is null or image_url ~ '^https://[^\s]+$'),
  -- Optional link to one of the shop's products.
  link_product_id uuid references public.products (id) on delete set null,
  -- Null expiry = always-on (e.g. branding). Statuses set a short expiry.
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  -- A promotion must say something.
  check (coalesce(btrim(title), '') <> '' or coalesce(btrim(body), '') <> '' or image_url is not null)
);
create index shop_promotions_shop_idx on public.shop_promotions (shop_id);
create index shop_promotions_live_idx on public.shop_promotions (expires_at);

alter table public.shop_promotions enable row level security;

-- Customers / visitors: live promotions from approved shops only.
create policy "promos: public read live" on public.shop_promotions for select to anon, authenticated
  using (private.is_public_shop(shop_id) and (expires_at is null or expires_at > now()));
-- A seller sees all their own promotions, including expired ones.
create policy "promos: owner reads own" on public.shop_promotions for select to authenticated
  using (private.owns_shop(shop_id));
create policy "promos: admin reads all" on public.shop_promotions for select to authenticated
  using (private.has_role('admin'));

-- Sellers manage only their own shop's promotions.
create policy "promos: owner inserts" on public.shop_promotions for insert to authenticated
  with check (private.owns_shop(shop_id));
create policy "promos: owner updates" on public.shop_promotions for update to authenticated
  using (private.owns_shop(shop_id)) with check (private.owns_shop(shop_id));
create policy "promos: owner deletes" on public.shop_promotions for delete to authenticated
  using (private.owns_shop(shop_id));
