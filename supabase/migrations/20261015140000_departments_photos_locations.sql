-- Departments (men / women / kids / unisex), product types, product photos
-- and shop map locations.

create type public.audience as enum ('men', 'women', 'kids', 'unisex');

alter table public.products
  add column audience public.audience,
  add column product_type text check (product_type is null or product_type ~ '^[a-z-]{3,30}$'),
  -- Photos are stored in Supabase Storage; only https URLs are accepted.
  add column image_url text check (image_url is null or image_url ~ '^https://[^\s]+$');

create index products_audience_type_idx on public.products (audience, product_type);

alter table public.shops
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lng double precision check (lng is null or lng between -180 and 180);
