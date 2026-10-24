-- Let the signed-in customer app detect an active call even when the customer
-- is browsing a page other than the order detail screen.
create or replace function public.delivery_call_incoming_poll()
returns table (
  order_id uuid,
  order_reference text,
  caller_id uuid,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.order_id, o.reference, c.caller_id, c.created_at
  from public.delivery_calls c
  join public.orders o on o.id = c.order_id
  join public.deliveries d on d.order_id = o.id
  where c.recipient_id = (select auth.uid())
    and c.state = 'ringing'
    and c.created_at >= now() - interval '45 seconds'
    and o.is_demo = false
    and d.rider_id = c.caller_id
    and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  order by c.created_at desc
  limit 1;
$$;
revoke all on function public.delivery_call_incoming_poll() from public, anon;
grant execute on function public.delivery_call_incoming_poll() to authenticated;
