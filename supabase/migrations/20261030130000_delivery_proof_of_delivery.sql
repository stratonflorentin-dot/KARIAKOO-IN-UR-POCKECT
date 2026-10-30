-- Proof of delivery: a photo the rider captures at hand-over, completing the
-- chain of custody (picked up -> live-tracked route -> PIN -> proof photo).
-- The photo lives in a PRIVATE storage bucket; only the order's customer, the
-- assigned rider, and admins can see it.

-- Who may see an order's delivery evidence.
create or replace function private.is_delivery_participant(p_order uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role('admin')
      or exists (select 1 from public.orders o where o.id = p_order and o.customer_id = (select auth.uid()))
      or exists (select 1 from public.deliveries d where d.order_id = p_order and d.rider_id = (select auth.uid()));
$$;
revoke all on function private.is_delivery_participant(uuid) from public, anon;
grant execute on function private.is_delivery_participant(uuid) to authenticated;

-- Private bucket (public = false): proof photos are evidence, not public assets.
insert into storage.buckets (id, name, public)
values ('delivery-proof', 'delivery-proof', false)
on conflict (id) do nothing;

-- Storage RLS: the assigned rider may upload under delivery-proof/{order_id}/...
-- during/after hand-over; participants may read; nobody may update/delete.
create policy "delivery-proof rider write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'delivery-proof'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1 from public.deliveries d
      where d.order_id = ((storage.foldername(name))[1])::uuid
        and d.rider_id = (select auth.uid())
        and d.status in ('PICKED_UP', 'IN_TRANSIT', 'DELIVERED')
    )
  );
create policy "delivery-proof participant read" on storage.objects for select to authenticated
  using (
    bucket_id = 'delivery-proof'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_delivery_participant(((storage.foldername(name))[1])::uuid)
  );

-- One record per uploaded proof. Written only through the RPC below.
create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  rider_id uuid not null references public.riders (id) on delete cascade,
  image_path text not null,                 -- object path within the delivery-proof bucket
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index delivery_proofs_order_idx on public.delivery_proofs (order_id, created_at desc);

alter table public.delivery_proofs enable row level security;
create policy "delivery_proofs participant read" on public.delivery_proofs for select to authenticated
  using (private.is_delivery_participant(order_id));

-- The rider records a proof after uploading the photo to the bucket. The path
-- must sit under this order's folder (one filename segment, no traversal).
create function public.rider_add_delivery_proof(
  p_order_id uuid,
  p_image_path text,
  p_note text default ''
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_status public.delivery_status;
  v_id uuid;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only the assigned rider can add delivery proof' using errcode = '42501';
  end if;
  select d.status into v_status
    from public.deliveries d
    where d.order_id = p_order_id and d.rider_id = caller;
  if not found or v_status not in ('PICKED_UP', 'IN_TRANSIT', 'DELIVERED') then
    raise exception 'No active delivery assigned to you for this order' using errcode = '42501';
  end if;
  if p_image_path !~ ('^' || p_order_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Proof image must be stored under this order' using errcode = '22023';
  end if;

  insert into public.delivery_proofs (order_id, rider_id, image_path, note)
    values (p_order_id, caller, p_image_path, left(coalesce(btrim(p_note), ''), 300))
    returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.rider_add_delivery_proof(uuid, text, text) from public, anon;
grant execute on function public.rider_add_delivery_proof(uuid, text, text) to authenticated;
