create policy "riders discovery read" on realtime.messages
for select to anon, authenticated
using (realtime.topic() = 'riders:discovery' and extension = 'broadcast');

create policy "eligible riders publish discovery" on realtime.messages
for insert to authenticated
with check (
  realtime.topic() = 'riders:discovery'
  and extension = 'broadcast'
  and private.has_role('rider')
  and exists (
    select 1
    from public.riders r
    join public.rider_presence p on p.rider_id = r.id
    where r.id = (select auth.uid())
      and r.status = 'approved'
      and p.is_online
  )
  and not exists (
    select 1
    from public.deliveries d
    where d.rider_id = (select auth.uid())
      and d.status in ('ACCEPTED', 'PICKED_UP', 'IN_TRANSIT')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proof', 'delivery-proof', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table private.routed_eta_rate_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create table private.routed_eta_daily_quota (
  quota_key boolean primary key default true check (quota_key),
  quota_day date not null,
  request_count integer not null check (request_count >= 0)
);

alter table private.routed_eta_rate_limits enable row level security;
alter table private.routed_eta_daily_quota enable row level security;
revoke all on table private.routed_eta_rate_limits, private.routed_eta_daily_quota from public, anon, authenticated;

create or replace function public.consume_routed_eta_quota()
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  current_count integer;
  daily_count integer;
begin
  if caller is null or not private.has_role('customer') then
    return false;
  end if;

  insert into private.routed_eta_rate_limits as limits (user_id, window_started_at, request_count)
  values (caller, clock_timestamp(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when limits.window_started_at <= clock_timestamp() - interval '1 minute' then clock_timestamp()
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at <= clock_timestamp() - interval '1 minute' then 1
        else limits.request_count + 1
      end
  returning request_count into current_count;

  if current_count > 4 then
    return false;
  end if;

  insert into private.routed_eta_daily_quota as quota (quota_key, quota_day, request_count)
  values (true, current_date, 1)
  on conflict (quota_key) do update
  set quota_day = current_date,
      request_count = case
        when quota.quota_day < current_date then 1
        else least(quota.request_count + 1, 1501)
      end
  returning request_count into daily_count;

  return daily_count <= 1500;
end;
$$;

revoke all on function public.consume_routed_eta_quota() from public, anon;
grant execute on function public.consume_routed_eta_quota() to authenticated;
