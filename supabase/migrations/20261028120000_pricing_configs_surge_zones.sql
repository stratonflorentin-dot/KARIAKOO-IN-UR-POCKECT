-- Dynamic pricing configuration + surge zones (pricing brief §1).
--
-- pricing_configs holds the editable fare rates AND the platform commission
-- rates. Commission + payout structure is PRIVATE: only admins (and the
-- SECURITY DEFINER server functions) can read the full row, so riders and
-- sellers can never see commission percentages. Customers/riders/sellers read
-- only the public fare fields via get_active_fare_config(); surge multipliers
-- are public (customers see a surge badge). All money is integer TZS; rates are
-- integer basis points (1000 = 10%) for exact arithmetic.

create table public.pricing_configs (
  id uuid primary key default gen_random_uuid(),
  base_fare_tzs int not null default 1500 check (base_fare_tzs >= 0),
  per_km_rate_tzs int not null default 400 check (per_km_rate_tzs >= 0),
  per_min_rate_tzs int not null default 50 check (per_min_rate_tzs >= 0),
  minimum_fare_tzs int not null default 2000 check (minimum_fare_tzs >= 0),
  booking_fee_tzs int not null default 500 check (booking_fee_tzs >= 0),
  seller_commission_bps int not null default 1000 check (seller_commission_bps between 0 and 10000),
  rider_commission_bps int not null default 1500 check (rider_commission_bps between 0 and 10000),
  free_waiting_mins int not null default 3 check (free_waiting_mins >= 0),
  paid_waiting_per_min_tzs int not null default 100 check (paid_waiting_per_min_tzs >= 0),
  cancellation_fee_tzs int not null default 1000 check (cancellation_fee_tzs >= 0),
  cancellation_grace_mins int not null default 3 check (cancellation_grace_mins >= 0),
  is_active boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
-- Exactly one config may be active at a time.
create unique index pricing_configs_one_active_idx on public.pricing_configs(is_active) where is_active;

alter table public.pricing_configs enable row level security;
revoke all on public.pricing_configs from public, anon, authenticated;
grant select, insert, update, delete on public.pricing_configs to authenticated;
-- Only admins touch pricing config (commission rates live here).
create policy "pricing_configs: admin all" on public.pricing_configs for all to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));

create table public.surge_zones (
  id uuid primary key default gen_random_uuid(),
  zone_name text not null check (char_length(zone_name) between 2 and 60),
  multiplier numeric(3,2) not null check (multiplier between 1.0 and 2.5),
  is_active boolean not null default false,
  reason text not null default '' check (char_length(reason) <= 200),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create index surge_zones_active_idx on public.surge_zones(zone_name) where is_active;

alter table public.surge_zones enable row level security;
-- Active surge multipliers are public (customers see a surge badge).
create policy "surge_zones: public read active" on public.surge_zones for select to anon, authenticated
  using (is_active);
create policy "surge_zones: admin reads all" on public.surge_zones for select to authenticated
  using (private.has_role('admin'));
create policy "surge_zones: admin inserts" on public.surge_zones for insert to authenticated
  with check (private.has_role('admin'));
create policy "surge_zones: admin updates" on public.surge_zones for update to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
create policy "surge_zones: admin deletes" on public.surge_zones for delete to authenticated
  using (private.has_role('admin'));

-- Public fare fields only (NO commission). Safe for customers/riders/sellers
-- to show a real-time fare estimate.
create function public.get_active_fare_config()
returns table (
  base_fare_tzs int, per_km_rate_tzs int, per_min_rate_tzs int, minimum_fare_tzs int,
  booking_fee_tzs int, free_waiting_mins int, paid_waiting_per_min_tzs int,
  cancellation_fee_tzs int, cancellation_grace_mins int
)
language sql stable security definer set search_path = '' as $$
  select base_fare_tzs, per_km_rate_tzs, per_min_rate_tzs, minimum_fare_tzs,
         booking_fee_tzs, free_waiting_mins, paid_waiting_per_min_tzs,
         cancellation_fee_tzs, cancellation_grace_mins
  from public.pricing_configs where is_active limit 1;
$$;
revoke execute on function public.get_active_fare_config() from public;
grant execute on function public.get_active_fare_config() to anon, authenticated;

-- Highest active surge multiplier for a named zone (1.0 when none active).
create function public.active_surge_multiplier(p_zone text default null)
returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(max(multiplier), 1.0)
  from public.surge_zones
  where is_active and (p_zone is null or zone_name = p_zone);
$$;
revoke execute on function public.active_surge_multiplier(text) from public;
grant execute on function public.active_surge_multiplier(text) to anon, authenticated;

-- Seed one active config with the engine defaults (DEFAULT_PRICING_CONFIG).
insert into public.pricing_configs (is_active) values (true);
