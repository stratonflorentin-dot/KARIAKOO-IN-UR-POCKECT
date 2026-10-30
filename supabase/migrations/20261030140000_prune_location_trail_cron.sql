-- Retention for the live-location trail: keep ~90 days for theft investigation,
-- then prune automatically. The function is also runnable manually by an admin
-- job. pg_cron scheduling is best-effort so the migration still applies if cron
-- cannot be enabled on this instance.

create or replace function public.prune_delivery_location_trail(p_days int default 90) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if p_days is null or p_days < 1 then
    p_days := 90;
  end if;
  delete from public.delivery_location_pings where recorded_at < now() - make_interval(days => p_days);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.prune_delivery_location_trail(int) from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron could not be enabled: %', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'prune-delivery-location-trail',
      '30 3 * * *',
      'select public.prune_delivery_location_trail(90);'
    );
  end if;
end;
$$;
