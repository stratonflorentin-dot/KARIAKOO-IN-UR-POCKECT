-- Phase 2 (P0-2): make the public catalog boundary a database rule, not just app code.
--
-- The customer UI already filters is_demo=false in catalog-source.ts, but the
-- public-read RLS policies did not — so demo shops/products were still readable
-- through a direct PostgREST call with the (public) publishable key. Add
-- is_demo = false to both public-read policies so the database is the boundary.
-- Owner/admin read policies are unchanged (sellers/admins still see demo rows).

alter policy "shops: public read approved" on public.shops
  using (status = 'approved' and is_demo = false);

alter policy "products: public read live" on public.products
  using (status = 'active' and is_demo = false and private.is_public_shop(shop_id));
