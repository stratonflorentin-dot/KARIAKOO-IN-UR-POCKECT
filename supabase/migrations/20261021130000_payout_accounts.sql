-- Payout accounts: the mobile-money wallet a seller or rider is paid into.
-- In Tanzania, payouts settle to M-Pesa / Mixx / Airtel Money / HaloPesa / T-Pesa
-- wallets, identified by the phone number. A user keeps one payout account;
-- the optional TIN lets us put their TRA number on statements. Nobody sees
-- anyone else's payout details — each row is readable and writable only by its
-- owner (admins read all for reconciliation).

create type public.payout_provider as enum ('mpesa', 'mixx', 'airtelmoney', 'halopesa', 'tpesa');

create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider public.payout_provider not null,
  -- 9 national digits (e.g. 742123456); validated in the app before it gets here.
  msisdn text not null check (msisdn ~ '^[67][0-9]{8}$'),
  holder_name text not null check (char_length(holder_name) between 2 and 120),
  tin text check (tin ~ '^[0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

-- The owner manages their own payout account.
create policy "own payout account read" on public.payout_accounts
  for select using ((select auth.uid()) = user_id);
create policy "own payout account upsert" on public.payout_accounts
  for insert with check ((select auth.uid()) = user_id);
create policy "own payout account update" on public.payout_accounts
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Admins read every payout account for settlement and reconciliation.
create policy "admin reads payout accounts" on public.payout_accounts
  for select using (private.has_role('admin'));

-- Keep updated_at honest on every write.
create or replace function public.touch_payout_account() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger payout_account_touch
  before update on public.payout_accounts
  for each row execute function public.touch_payout_account();

-- Trigger function: fires on the table only, never meant as an API endpoint.
revoke execute on function public.touch_payout_account() from public, anon, authenticated;
