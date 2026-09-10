-- Applied to GOOD TIMES production Supabase on 2026-07-10.
-- Source-control copy for review, reproducibility, and future environments.

create table if not exists public.gt_product_events (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  client_event_id text,
  event_name text not null,
  surface text,
  object_type text,
  object_id text,
  city_slug text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  constraint gt_product_events_event_name_check check (char_length(event_name) between 1 and 100)
);

create unique index if not exists gt_product_events_idempotency_idx
  on public.gt_product_events(auth_id, client_event_id)
  where client_event_id is not null;
create index if not exists gt_product_events_auth_time_idx on public.gt_product_events(auth_id, occurred_at desc);
create index if not exists gt_product_events_name_time_idx on public.gt_product_events(event_name, occurred_at desc);
create index if not exists gt_product_events_city_time_idx on public.gt_product_events(city_slug, occurred_at desc);

alter table public.gt_product_events enable row level security;
revoke all on table public.gt_product_events from anon;
revoke all on table public.gt_product_events from authenticated;
grant select, insert on table public.gt_product_events to authenticated;
grant all on table public.gt_product_events to service_role;

drop policy if exists gt_product_events_insert_own on public.gt_product_events;
create policy gt_product_events_insert_own on public.gt_product_events
  for insert to authenticated with check (auth_id = auth.uid());

drop policy if exists gt_product_events_read_own on public.gt_product_events;
create policy gt_product_events_read_own on public.gt_product_events
  for select to authenticated using (auth_id = auth.uid());

create table if not exists public.gt_taste_signals (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  signal_type text not null,
  signal_value numeric,
  city_slug text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint gt_taste_signals_entity_type_check check (entity_type in ('venue','event','experience','plan','category','city')),
  constraint gt_taste_signals_signal_type_check check (signal_type in ('view','save','share','book','attend','rate','dismiss','hide','search','concierge_select'))
);

create index if not exists gt_taste_signals_auth_time_idx on public.gt_taste_signals(auth_id, occurred_at desc);
create index if not exists gt_taste_signals_entity_idx on public.gt_taste_signals(entity_type, entity_id, occurred_at desc);

alter table public.gt_taste_signals enable row level security;
revoke all on table public.gt_taste_signals from anon;
revoke all on table public.gt_taste_signals from authenticated;
grant select, insert on table public.gt_taste_signals to authenticated;
grant all on table public.gt_taste_signals to service_role;

drop policy if exists gt_taste_signals_insert_own on public.gt_taste_signals;
create policy gt_taste_signals_insert_own on public.gt_taste_signals
  for insert to authenticated with check (auth_id = auth.uid());

drop policy if exists gt_taste_signals_read_own on public.gt_taste_signals;
create policy gt_taste_signals_read_own on public.gt_taste_signals
  for select to authenticated using (auth_id = auth.uid());

create table if not exists public.gt_experiment_assignments (
  auth_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null,
  variant text not null,
  assignment_source text not null default 'server',
  metadata jsonb not null default '{}'::jsonb,
  assigned_at timestamptz not null default now(),
  primary key (auth_id, experiment_key)
);

alter table public.gt_experiment_assignments enable row level security;
revoke all on table public.gt_experiment_assignments from anon;
revoke all on table public.gt_experiment_assignments from authenticated;
grant select on table public.gt_experiment_assignments to authenticated;
grant all on table public.gt_experiment_assignments to service_role;

drop policy if exists gt_experiment_assignments_read_own on public.gt_experiment_assignments;
create policy gt_experiment_assignments_read_own on public.gt_experiment_assignments
  for select to authenticated using (auth_id = auth.uid());

comment on table public.gt_product_events is 'GOOD TIMES first-party product analytics events. No advertising identifiers or raw residential addresses.';
comment on table public.gt_taste_signals is 'GOOD TIMES preference and behavior signals used to improve recommendations.';
comment on table public.gt_experiment_assignments is 'Server-managed GOOD TIMES experiment assignment registry.';
