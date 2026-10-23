-- Phase 2 / brief §3: Supabase Storage for product photos and store banners.
--
-- Two public-read buckets. Writes are owner-scoped: an object's first path
-- segment must be a shop id the caller owns, so a seller can only upload under
-- their own shop's folder (product-images/{shop_id}/... ). Admins may also
-- write for moderation. Public read lets the storefront load images by URL.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true),
       ('store-banners', 'store-banners', true)
on conflict (id) do nothing;

-- A shop's banner image (optional). Product photos use products.image_url.
alter table public.shops
  add column if not exists banner_url text
  check (banner_url is null or banner_url ~ '^https://[^\s]+$');

-- ---------------------------------------------------------------- read (public)
create policy "product-images public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "store-banners public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'store-banners');

-- ---------------------------------------------------------------- owner-scoped writes
-- The ~ check short-circuits before the uuid cast so a non-uuid folder is
-- simply denied rather than erroring.
create policy "product-images owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );
create policy "product-images owner update" on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );
create policy "product-images owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );

create policy "store-banners owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-banners'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );
create policy "store-banners owner update" on storage.objects for update to authenticated
  using (
    bucket_id = 'store-banners'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );
create policy "store-banners owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-banners'
    and (
      private.has_role('admin')
      or ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and private.owns_shop(((storage.foldername(name))[1])::uuid))
    )
  );
