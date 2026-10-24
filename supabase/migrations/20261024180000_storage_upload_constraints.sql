-- Enforce the same image upload limits at Storage as the seller UI does.
-- Browser-side validation improves feedback but is not a security boundary.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id in ('product-images', 'store-banners');
