-- Return only the customer's selected transport label to the owning seller.
-- Never expose the customer's free-form delivery instructions in the feed.
drop function public.seller_order_feed(uuid);

create function public.seller_order_feed(p_shop uuid)
returns table (
  order_id uuid,
  reference text,
  placed_at timestamptz,
  payment_status public.payment_status,
  zone text,
  transport_vehicle text,
  delivery_status public.delivery_status,
  fulfillment_status public.fulfillment_status,
  settlement_status public.settlement_status,
  items jsonb,
  merchandise_tzs bigint,
  commission_tzs bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('seller') or not private.owns_shop(p_shop) then
    raise exception 'Only this shop owner can view its order feed' using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.reference,
    o.created_at,
    o.payment_status,
    o.zone,
    nullif(btrim(substring(o.instructions from '\[Usafiri:\s*([^\(]+)')), ''),
    d.status,
    fg.status,
    fg.settlement_status,
    coalesce(
      jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitPriceTzs', i.unit_price_tzs,
        'quantity', i.quantity,
        'commissionBps', i.commission_bps,
        'commissionTzs', i.commission_tzs
      ) order by i.created_at) filter (where i.id is not null),
      '[]'::jsonb
    ),
    coalesce(sum(i.unit_price_tzs * i.quantity), 0)::bigint,
    coalesce(sum(i.commission_tzs), 0)::bigint
  from public.fulfillment_groups as fg
  join public.orders as o on o.id = fg.order_id
  left join public.deliveries as d on d.order_id = o.id
  left join public.order_items as i on i.order_id = o.id and i.shop_id = p_shop
  where fg.shop_id = p_shop
  group by o.id, d.status, fg.status, fg.settlement_status
  order by o.created_at desc;
end;
$$;

revoke execute on function public.seller_order_feed(uuid) from public, anon;
grant execute on function public.seller_order_feed(uuid) to authenticated;

-- The global job board is for genuinely unreserved work. A live offer moves a
-- delivery to ASSIGNED and is visible only to its target rider via riderOffers.
create or replace function public.rider_available_deliveries()
returns table (
  order_id uuid,
  reference text,
  placed_at timestamptz,
  payout_tzs bigint,
  pickup_names text,
  distance_km double precision,
  can_claim boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  rider_is_busy boolean;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can browse available deliveries' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.riders r
    join public.rider_presence p on p.rider_id = r.id
    where r.id = caller and r.status = 'approved' and p.is_online
  ) then
    return;
  end if;

  select exists (
    select 1 from public.deliveries active
    where active.rider_id = caller and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  ) into rider_is_busy;

  return query
  select d.order_id, o.reference, o.created_at, d.rider_payout_tzs,
    coalesce(pickups.names, 'Pickup location'), pickups.distance_km,
    not rider_is_busy
  from public.deliveries d
  join public.orders o on o.id = d.order_id
  join public.rider_presence rp on rp.rider_id = caller
  left join lateral (
    select string_agg(distinct sh.name, ', ' order by sh.name) as names,
      min(case when rp.lat is not null and rp.lng is not null
          and rp.updated_at >= now() - interval '2 minutes'
          and sh.lat is not null and sh.lng is not null
        then 6371 * 2 * asin(sqrt(least(1.0,
          sin(radians(sh.lat - rp.lat) / 2) ^ 2
          + cos(radians(rp.lat)) * cos(radians(sh.lat))
          * sin(radians(sh.lng - rp.lng) / 2) ^ 2
        ))) end) as distance_km
    from public.order_items oi
    join public.shops sh on sh.id = oi.shop_id
    where oi.order_id = d.order_id
  ) pickups on true
  where d.rider_id is null
    and d.status = 'PENDING_ASSIGNMENT'
    and o.customer_id <> caller
    and not exists (
      select 1 from public.delivery_offers live
      where live.order_id = d.order_id and live.status = 'pending' and live.expires_at > now()
    )
  order by pickups.distance_km nulls last, o.created_at, d.order_id;
end;
$$;
revoke all on function public.rider_available_deliveries() from public, anon;
grant execute on function public.rider_available_deliveries() to authenticated;

-- Keep claims atomic and reject stale or reserved job-board entries.
create or replace function public.rider_claim_delivery(p_order uuid)
returns public.delivery_status
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  d public.deliveries;
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can claim deliveries' using errcode = '42501';
  end if;
  perform 1 from public.riders r where r.id = caller and r.status = 'approved' for update;
  if not found then
    raise exception 'Rider is not approved' using errcode = '42501';
  end if;
  if not exists (select 1 from public.rider_presence p where p.rider_id = caller and p.is_online) then
    raise exception 'Go online before accepting a delivery.' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.deliveries active
    where active.rider_id = caller and active.order_id <> p_order
      and active.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  ) then
    raise exception 'Finish your current delivery before accepting another.' using errcode = '55000';
  end if;

  select * into d from public.deliveries where order_id = p_order for update;
  if not found or d.rider_id is not null or d.status <> 'PENDING_ASSIGNMENT'
    or exists (
      select 1 from public.delivery_offers live
      where live.order_id = p_order and live.status = 'pending' and live.expires_at > now()
    ) then
    raise exception 'This delivery was already claimed, reserved, or is no longer available.' using errcode = '55000';
  end if;

  update public.deliveries set rider_id = caller, status = 'ACCEPTED', updated_at = now()
    where order_id = p_order;
  update public.delivery_offers set status = 'cancelled', decided_at = now()
    where order_id = p_order and status = 'pending';
  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Rider accepted the delivery', 'rider');
  return 'ACCEPTED';
end;
$$;
revoke all on function public.rider_claim_delivery(uuid) from public, anon;
grant execute on function public.rider_claim_delivery(uuid) to authenticated;
