-- Keep active call state and WebRTC signals visible to exactly the two
-- participants, regardless of who started the call. This repairs databases
-- where the original policy only let customers read calls they initiated.
create or replace function private.can_access_delivery_call(p_call uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.delivery_calls c
    join public.orders o on o.id = c.order_id
    join public.deliveries d on d.order_id = o.id
    where c.id = p_call
      and o.is_demo = false
      and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
      and (
        (c.caller_id = o.customer_id and c.recipient_id = d.rider_id)
        or (c.caller_id = d.rider_id and c.recipient_id = o.customer_id)
      )
      and (c.caller_id = (select auth.uid()) or c.recipient_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_access_delivery_call(uuid) from public, anon;
grant execute on function private.can_access_delivery_call(uuid) to authenticated;

-- Incoming rings and accepted caller state are fetched through a narrow RPC so
-- delivery_calls table policy drift cannot silently hide the invite.
create or replace function public.delivery_call_poll(p_order_id uuid)
returns table (
  id uuid,
  order_id uuid,
  caller_id uuid,
  recipient_id uuid,
  state text,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.order_id, c.caller_id, c.recipient_id, c.state, c.created_at
  from public.delivery_calls c
  join public.orders o on o.id = c.order_id
  join public.deliveries d on d.order_id = o.id
  where c.order_id = p_order_id
    and o.is_demo = false
    and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
    and (
      (c.recipient_id = (select auth.uid()) and c.state = 'ringing'
        and c.created_at >= now() - interval '45 seconds')
      or (c.caller_id = (select auth.uid()) and c.state = 'accepted')
    )
    and (
      (c.caller_id = o.customer_id and c.recipient_id = d.rider_id)
      or (c.caller_id = d.rider_id and c.recipient_id = o.customer_id)
    )
  order by c.created_at desc
  limit 1;
$$;
revoke all on function public.delivery_call_poll(uuid) from public, anon;
grant execute on function public.delivery_call_poll(uuid) to authenticated;
