-- Allow both sides of an active delivery call to see call state and WebRTC
-- signals, regardless of which side started the call.
create or replace function private.can_access_delivery_call(p_call uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.delivery_calls c
    join public.orders o on o.id = c.order_id
    join public.deliveries d on d.order_id = o.id
    where c.id = p_call
      and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      and (
        (c.caller_id = o.customer_id and c.recipient_id = d.rider_id)
        or
        (c.caller_id = d.rider_id and c.recipient_id = o.customer_id)
      )
      and (c.caller_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_access_delivery_call(uuid) from public, anon;
grant execute on function private.can_access_delivery_call(uuid) to authenticated;
