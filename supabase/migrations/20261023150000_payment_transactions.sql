-- Phase 2 (brief §9): payment ledger + reconciliation foundations.
--
-- A provider-independent, immutable transaction ledger linked to orders, plus a
-- server-side function that records an event and advances orders.payment_status
-- through a validated state machine. No live provider is wired here: this is the
-- safe foundation (ledger, idempotency, audit, reconciliation primitive). COD
-- collection and manual admin reconciliation use it today; a verified provider
-- webhook (service role) would use the same path later. Nothing fabricates a
-- successful payment.

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('mpesa', 'mixx', 'airtelmoney', 'halopesa', 'cod')),
  kind text not null check (kind in ('initiated', 'succeeded', 'failed', 'refunded', 'cod_collected')),
  amount_tzs bigint not null check (amount_tzs >= 0),
  provider_ref text,                 -- external transaction id; null for COD/manual
  note text not null default '',
  recorded_by uuid references public.profiles (id),  -- actor; null = system/webhook
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  -- Idempotency: a provider's transaction id can be recorded once. NULLs are
  -- distinct in Postgres, so COD/manual rows with no ref never collide.
  unique (provider, provider_ref)
);
create index payment_transactions_order_idx on public.payment_transactions (order_id);

alter table public.payment_transactions enable row level security;
-- Written only by the SECURITY DEFINER function below (no write policies).
create policy "payment_tx: customer reads own" on public.payment_transactions for select to authenticated
  using (private.is_order_customer(order_id));
create policy "payment_tx: admin reads all" on public.payment_transactions for select to authenticated
  using (private.has_role('admin'));

-- Ledger rows are immutable (append-only audit trail).
create trigger payment_transactions_immutable before update or delete on public.payment_transactions
  for each row execute function public.block_changes();

-- Record a payment event and advance the order's payment_status atomically.
-- Admin-only for now (manual reconciliation + COD collection); a verified
-- webhook would call an equivalent trusted path. The transition is validated,
-- so a browser redirect can never flip a payment to successful.
create function public.record_payment_transaction(
  p_order uuid,
  p_provider text,
  p_kind text,
  p_amount bigint,
  p_provider_ref text default null,
  p_note text default '',
  p_payload jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  v_current public.payment_status;
  v_target public.payment_status;
  v_id uuid;
begin
  if caller is null or not private.has_role('admin') then
    raise exception 'Only admins can record payment transactions' using errcode = '42501';
  end if;

  v_target := case p_kind
    when 'initiated' then 'pending'
    when 'succeeded' then 'successful'
    when 'cod_collected' then 'successful'
    when 'failed' then 'failed'
    when 'refunded' then 'refunded'
    else null
  end::public.payment_status;
  if v_target is null then
    raise exception 'Unknown payment event %', p_kind using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Payment amount must be zero or more' using errcode = '22023';
  end if;

  select payment_status into v_current from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if not (
    (v_current = 'pending' and v_target in ('pending', 'successful', 'failed')) or
    (v_current = 'failed' and v_target in ('pending', 'failed', 'successful')) or
    (v_current = 'successful' and v_target in ('successful', 'refunded')) or
    (v_current = 'refunded' and v_target = 'refunded')
  ) then
    raise exception 'Payment transition % -> % is not allowed', v_current, v_target using errcode = '22023';
  end if;

  insert into public.payment_transactions (order_id, provider, kind, amount_tzs, provider_ref, note, recorded_by, payload)
    values (p_order, p_provider, p_kind, p_amount, nullif(btrim(p_provider_ref), ''), coalesce(p_note, ''), caller, coalesce(p_payload, '{}'))
    returning id into v_id;

  update public.orders set payment_status = v_target where id = p_order;

  insert into public.order_status_history (order_id, label, actor)
    values (p_order, 'Payment ' || p_kind || ' (' || p_provider || ')', 'admin');
  return v_id;
end;
$$;

revoke execute on function public.record_payment_transaction(uuid, text, text, bigint, text, text, jsonb) from public, anon;
grant execute on function public.record_payment_transaction(uuid, text, text, bigint, text, text, jsonb) to authenticated;
