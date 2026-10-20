-- Seller order inbox and fulfilment actions.
-- Sellers receive only their shop's order lines and operational fields. In
-- particular, this feed omits customer names, phone numbers, and street address.

create function public.seller_order_feed(p_shop uuid)
returns table (
  order_id uuid,
  reference text,
  placed_at timestamptz,
  payment_status public.payment_status,
  zone text,
  delivery_status public.delivery_status,
  fulfillment_status public.fulfillment_status,
  settlement_status public.settlement_status,
  items jsonb,
  merchandise_tzs bigint,
  commission_tzs bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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

create function public.seller_update_fulfillment(
  p_order uuid,
  p_to public.fulfillment_status,
  p_reason text default null
) returns public.fulfillment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current_status public.fulfillment_status;
  shop uuid;
begin
  if caller is null or not private.has_role('seller') then
    raise exception 'Only a signed-in seller can update fulfilment' using errcode = '42501';
  end if;

  select fg.shop_id, fg.status into shop, current_status
  from public.fulfillment_groups as fg
  join public.shops as s on s.id = fg.shop_id
  where fg.order_id = p_order and s.owner_id = caller
  for update of fg;

  if not found then
    raise exception 'This order is not for your shop' using errcode = '42501';
  end if;

  if not (
    (current_status = 'awaiting_seller' and p_to in ('accepted', 'rejected')) or
    (current_status = 'accepted' and p_to = 'preparing') or
    (current_status = 'preparing' and p_to = 'ready_for_pickup')
  ) then
    raise exception 'This fulfilment step is not allowed' using errcode = '22023';
  end if;

  if p_to = 'rejected' and (coalesce(length(btrim(p_reason)), 0) < 3 or length(p_reason) > 250) then
    raise exception 'Add a rejection reason between 3 and 250 characters' using errcode = '23514';
  end if;

  update public.fulfillment_groups
  set status = p_to,
      rejection_reason = case when p_to = 'rejected' then btrim(p_reason) else null end,
      updated_at = now()
  where order_id = p_order and shop_id = shop;

  insert into public.order_status_history (order_id, label, actor)
  values (
    p_order,
    case p_to
      when 'accepted' then 'Shop accepted the order'
      when 'rejected' then 'Shop rejected the order'
      when 'preparing' then 'Shop is preparing the order'
      when 'ready_for_pickup' then 'Order is ready for pickup'
      else 'Shop updated the order'
    end,
    'seller'
  );

  return p_to;
end;
$$;

revoke execute on function public.seller_update_fulfillment(uuid, public.fulfillment_status, text) from public, anon;
grant execute on function public.seller_update_fulfillment(uuid, public.fulfillment_status, text) to authenticated;
