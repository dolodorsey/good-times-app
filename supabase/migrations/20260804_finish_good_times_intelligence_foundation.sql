create table if not exists public.gt_formula_versions (
  id uuid primary key default gen_random_uuid(),
  formula_key text not null,
  version integer not null,
  weights jsonb not null default '{}'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(formula_key, version)
);

create unique index if not exists gt_formula_one_active_idx
  on public.gt_formula_versions(formula_key)
  where is_active;

create table if not exists public.gt_agent_registry (
  agent_key text primary key,
  name text not null,
  purpose text not null,
  allowed_actions text[] not null default '{}',
  data_domains text[] not null default '{}',
  cadence text,
  status text not null default 'active' check (status in ('active','paused','retired')),
  requires_human_review boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references public.gt_agent_registry(agent_key),
  auth_id uuid references auth.users(id) on delete cascade,
  thread_id uuid references public.concierge_threads(id) on delete set null,
  task_type text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','waiting_review','completed','failed','canceled')),
  priority smallint not null default 5 check (priority between 1 and 10),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists gt_agent_tasks_queue_idx on public.gt_agent_tasks(status, priority, available_at);
create index if not exists gt_agent_tasks_user_idx on public.gt_agent_tasks(auth_id, created_at desc);

create table if not exists public.gt_agent_run_ledger (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.gt_agent_tasks(id) on delete set null,
  agent_key text not null references public.gt_agent_registry(agent_key),
  auth_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('started','completed','failed','waiting_review')),
  formula_key text,
  formula_version integer,
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  duration_ms integer,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists gt_agent_run_ledger_agent_idx on public.gt_agent_run_ledger(agent_key, started_at desc);

insert into public.cities(id,name,timezone,lat,lng,country,is_active) values
('atlanta','Atlanta','America/New_York',33.7490,-84.3880,'USA',true),
('houston','Houston','America/Chicago',29.7604,-95.3698,'USA',true),
('los_angeles','Los Angeles','America/Los_Angeles',34.0522,-118.2437,'USA',true),
('miami','Miami','America/New_York',25.7617,-80.1918,'USA',true),
('charlotte','Charlotte','America/New_York',35.2271,-80.8431,'USA',true),
('washington_dc','Washington, DC','America/New_York',38.9072,-77.0369,'USA',true),
('new_york','New York','America/New_York',40.7128,-74.0060,'USA',true),
('dallas','Dallas','America/Chicago',32.7767,-96.7970,'USA',true),
('phoenix','Phoenix','America/Phoenix',33.4484,-112.0740,'USA',true),
('scottsdale','Scottsdale','America/Phoenix',33.4942,-111.9261,'USA',true),
('las_vegas','Las Vegas','America/Los_Angeles',36.1699,-115.1398,'USA',true)
on conflict(id) do update set
  name=excluded.name, timezone=excluded.timezone, lat=excluded.lat, lng=excluded.lng,
  country=excluded.country, is_active=true, updated_at=now();

insert into public.gt_formula_versions(formula_key,version,weights,thresholds,notes,is_active) values
(
  'recommendation',1,
  '{"base_quality":0.30,"preference_match":0.20,"temporal_fit":0.15,"source_confidence":0.10,"actionability":0.10,"culture_signal":0.07,"novelty":0.05,"proximity":0.03}'::jsonb,
  '{"reject_below":35,"recommend_at":65,"concierge_feature_at":78,"max_results":20}'::jsonb,
  'Transparent GOOD TIMES recommendation formula. Scores quality, user taste, timing, provenance, actions, culture, novelty and distance.',
  true
),
(
  'itinerary',1,
  '{"recommendation_score":0.35,"time_sequence":0.20,"travel_efficiency":0.15,"occasion_match":0.15,"actionability":0.10,"variety":0.05}'::jsonb,
  '{"minimum_stop_score":55,"target_stops":3,"maximum_stops":5,"maximum_gap_minutes":120}'::jsonb,
  'Builds a practical sequence from actual event and venue records without inventing availability.',
  true
)
on conflict(formula_key,version) do update set
  weights=excluded.weights, thresholds=excluded.thresholds, notes=excluded.notes, is_active=excluded.is_active;

insert into public.gt_agent_registry(agent_key,name,purpose,allowed_actions,data_domains,cadence,status,requires_human_review,config) values
('gt_concierge_agent','GOOD TIMES Concierge','Interpret a customer request, rank real options, explain recommendations and preserve the conversation.',array['search','recommend','create_thread','write_message','escalate'],array['public_feed','venues','taste_signals','profiles'],'on demand','active',false,'{"formula":"recommendation","never_invent_availability":true}'::jsonb),
('gt_itinerary_agent','Night Builder','Build time-ordered plans from real venues and events and save them to the customer account.',array['recommend','build_itinerary','save_itinerary'],array['public_feed','venues','itineraries','taste_signals'],'on demand','active',false,'{"formula":"itinerary","target_stops":3}'::jsonb),
('gt_taste_agent','Taste Learning Agent','Convert first-party views, saves, shares, searches, bookings and dismissals into preference weights.',array['aggregate_signals','update_preferences'],array['product_events','taste_signals','profiles'],'hourly','active',false,'{"signal_half_life_days":45}'::jsonb),
('gt_source_health_agent','Source Health Agent','Detect stalled, empty, failing and stale source pipelines without altering public content.',array['inspect_sources','create_alert','queue_repair'],array['source_health','sync_logs'],'every 6 hours','active',true,'{"stale_hours":24,"failure_threshold":3}'::jsonb),
('gt_event_ingestion_agent','Event Intake Agent','Normalize, deduplicate, score and quarantine event candidates from approved sources.',array['normalize','deduplicate','score','quarantine','publish_candidate'],array['source_posts','events','provenance'],'every 4 hours','active',true,'{"publish_threshold":85,"quarantine_below":40}'::jsonb),
('gt_venue_enrichment_agent','Venue Enrichment Agent','Fill missing contact, hours, booking, location, category and evidence fields from approved sources.',array['enrich','verify','queue_review'],array['venues','source_evidence'],'daily','active',true,'{"minimum_evidence_sources":2}'::jsonb),
('gt_image_qa_agent','Visual Quality Agent','Validate image ownership, aspect ratio, resolution and subject relevance before display.',array['inspect_image','approve','reject','queue_replacement'],array['images','venues','events'],'daily','active',true,'{"minimum_width":1200,"minimum_height":800}'::jsonb)
on conflict(agent_key) do update set
  name=excluded.name,purpose=excluded.purpose,allowed_actions=excluded.allowed_actions,
  data_domains=excluded.data_domains,cadence=excluded.cadence,status=excluded.status,
  requires_human_review=excluded.requires_human_review,config=excluded.config,updated_at=now();

alter table public.gt_formula_versions enable row level security;
alter table public.gt_agent_registry enable row level security;
alter table public.gt_agent_tasks enable row level security;
alter table public.gt_agent_run_ledger enable row level security;

drop policy if exists gt_agent_tasks_read_own on public.gt_agent_tasks;
create policy gt_agent_tasks_read_own on public.gt_agent_tasks
  for select to authenticated using (auth_id = (select auth.uid()));

drop policy if exists gt_agent_run_ledger_read_own on public.gt_agent_run_ledger;
create policy gt_agent_run_ledger_read_own on public.gt_agent_run_ledger
  for select to authenticated using (auth_id = (select auth.uid()));

revoke all on public.gt_formula_versions from anon, authenticated;
revoke all on public.gt_agent_registry from anon, authenticated;
revoke all on public.gt_agent_tasks from anon, authenticated;
revoke all on public.gt_agent_run_ledger from anon, authenticated;
grant select on public.gt_agent_tasks to authenticated;
grant select on public.gt_agent_run_ledger to authenticated;

drop policy if exists itineraries_manage_own_v2 on public.itineraries;
create policy itineraries_manage_own_v2 on public.itineraries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists itineraries_legacy_public on public.itineraries;
drop policy if exists "Users manage own itineraries" on public.itineraries;
grant select,insert,update,delete on public.itineraries to authenticated;
