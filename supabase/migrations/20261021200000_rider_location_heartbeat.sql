-- Refresh an online rider's GPS without invoking dispatch for another job.
create or replace function public.rider_update_location(
  p_lat double precision,
  p_lng double precision
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or not private.has_role('rider') then
    raise exception 'Only riders can update a rider location' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.riders r
    join public.rider_presence p on p.rider_id = r.id
    where r.id = caller and r.status = 'approved' and p.is_online
  ) then
    raise exception 'Rider must be approved and online' using errcode = '42501';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 then
    raise exception 'Latitude out of range' using errcode = '22003';
  end if;
  if p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Longitude out of range' using errcode = '22003';
  end if;

  update public.rider_presence
    set lat = p_lat, lng = p_lng, updated_at = now()
    where rider_id = caller and is_online;
end;
$$;

revoke execute on function public.rider_update_location(double precision, double precision) from public, anon;
grant execute on function public.rider_update_location(double precision, double precision) to authenticated;
