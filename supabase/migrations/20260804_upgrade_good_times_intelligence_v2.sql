create table if not exists public.gt_user_intelligence_profiles (
  auth_id uuid primary key references auth.users(id) on delete cascade,
  maturity_stage text not null default 'cold' check (maturity_stage in ('cold','warm','mature')),
  signal_count integer not null default 0,
  positive_signal_count integer not null default 0,
  negative_signal_count integer not null default 0,
  category_affinity jsonb not null default '{}'::jsonb,
  neighborhood_affinity jsonb not null default '{}'::jsonb,
  daypart_affinity jsonb not null default '{}'::jsonb,
  price_affinity jsonb not null default '{}'::jsonb,
  suppression_rules jsonb not null default '{}'::jsonb,
  exploration_rate numeric(5,4) not null default 0.20,
  last_signal_at timestamptz,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  agent_task_id uuid references public.gt_agent_tasks(id) on delete set null,
  city_slug text not null,
  action text not null check (action in ('recommend','itinerary')),
  raw_query text not null,
  parsed_intent jsonb not null default '{}'::jsonb,
  formula_key text not null,
  formula_version integer not null,
  maturity_stage text not null,
  exploration_rate numeric(5,4) not null,
  candidate_count integer not null default 0,
  result_count integer not null default 0,
  itinerary_id uuid references public.itineraries(id) on delete set null,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists gt_recommendation_sessions_user_idx
  on public.gt_recommendation_sessions(auth_id, created_at desc);

create table if not exists public.gt_recommendation_impressions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.gt_recommendation_sessions(id) on delete cascade,
  auth_id uuid not null references auth.users(id) on delete cascade,
  object_type text not null check (object_type in ('event','venue')),
  object_id text not null,
  rank_position integer not null check (rank_position > 0),
  relevance_score numeric(6,2) not null,
  confidence_score numeric(6,2) not null,
  completeness_score numeric(6,2) not null,
  freshness_score numeric(6,2) not null,
  diversity_adjustment numeric(6,2) not null default 0,
  exploration_pick boolean not null default false,
  reasons jsonb not null default '[]'::jsonb,
  score_components jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(session_id, object_type, object_id)
);

create index if not exists gt_recommendation_impressions_user_idx
  on public.gt_recommendation_impressions(auth_id, created_at desc);
create index if not exists gt_recommendation_impressions_object_idx
  on public.gt_recommendation_impressions(object_type, object_id, created_at desc);

create table if not exists public.gt_agent_quality_evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.gt_agent_run_ledger(id) on delete cascade,
  agent_key text not null references public.gt_agent_registry(agent_key),
  metric_key text not null,
  score numeric(6,2) not null,
  passed boolean not null,
  threshold numeric(6,2),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gt_agent_quality_evaluations_run_idx
  on public.gt_agent_quality_evaluations(run_id, metric_key);

update public.gt_formula_versions set is_active=false where formula_key in ('recommendation','itinerary');

insert into public.gt_formula_versions(formula_key,version,weights,thresholds,notes,is_active) values
(
  'recommendation',2,
  '{"base_quality":0.16,"intent_match":0.17,"preference_match":0.15,"temporal_fit":0.11,"source_confidence":0.10,"actionability":0.08,"culture_signal":0.07,"freshness":0.05,"proximity":0.04,"social_proof":0.03,"novelty":0.02,"budget_fit":0.02}'::jsonb,
  '{"minimum_relevance":42,"minimum_confidence":35,"strong_match":72,"premium_match":82,"cold_exploration_rate":0.20,"warm_exploration_rate":0.12,"mature_exploration_rate":0.08,"max_same_event_category":3,"max_same_event_venue":1,"max_same_venue_category":3,"max_same_neighborhood":3,"max_results":12}'::jsonb,
  'V2 separates relevance from confidence, adjusts weights by user maturity, introduces deterministic exploration, and diversity-reranks by category, venue, and neighborhood.',
  true
),
(
  'itinerary',2,
  '{"recommendation_strength":0.25,"confidence":0.15,"time_feasibility":0.15,"travel_efficiency":0.15,"occasion_match":0.10,"variety":0.10,"actionability":0.06,"budget_fit":0.04}'::jsonb,
  '{"minimum_stop_relevance":55,"minimum_stop_confidence":45,"target_stops":3,"maximum_stops":4,"minimum_buffer_minutes":45,"maximum_leg_miles":12,"maximum_total_miles":24,"maximum_candidates_per_role":6}'::jsonb,
  'V2 evaluates complete candidate sequences rather than selecting a fixed dinner-event-after pattern.',
  true
)
on conflict(formula_key,version) do update set
  weights=excluded.weights, thresholds=excluded.thresholds, notes=excluded.notes, is_active=true;

insert into public.gt_agent_registry(agent_key,name,purpose,allowed_actions,data_domains,cadence,status,requires_human_review,config) values
('gt_intelligence_supervisor','GOOD TIMES Intelligence Supervisor','Orchestrate intent parsing, memory, candidate retrieval, confidence, ranking, diversity, itinerary optimization and evaluation.',array['orchestrate','enforce_thresholds','log_decisions','fail_closed'],array['formulas','agents','tasks','quality_evaluations'],'on demand','active',false,'{"pipeline":["intent","memory","candidates","confidence","ranking","diversity","itinerary","evaluation"],"fail_closed":true}'::jsonb),
('gt_memory_agent','Taste Memory Agent','Build a decayed user preference profile from explicit preferences and first-party behavior.',array['aggregate_signals','decay_weights','update_memory','apply_suppressions'],array['profiles','taste_signals','product_events','saved_items'],'on demand and hourly','active',false,'{"half_life_days":45,"cold_below":10,"mature_at":50}'::jsonb),
('gt_confidence_agent','Evidence Confidence Agent','Score provenance, completeness, freshness, consistency and actionability independently from relevance.',array['score_confidence','reject_weak_data','explain_uncertainty'],array['events','venues','source_evidence'],'on demand','active',false,'{"minimum_confidence":35,"never_convert_confidence_to_availability":true}'::jsonb),
('gt_diversity_agent','Diversity & Discovery Agent','Prevent repetitive result sets and insert bounded deterministic discovery choices.',array['rerank','apply_repetition_penalty','select_exploration_candidate'],array['recommendation_candidates','user_memory'],'on demand','active',false,'{"deterministic":true,"max_exploration_items":1}'::jsonb),
('gt_itinerary_optimizer','Itinerary Optimization Agent','Evaluate full sequences for time, travel, occasion, confidence, actions and variety.',array['generate_sequences','score_sequences','save_best_plan'],array['events','venues','coordinates','itineraries'],'on demand','active',false,'{"target_stops":3,"maximum_stops":4,"fail_if_no_feasible_plan":true}'::jsonb),
('gt_agent_evaluator','Agent Evaluation Agent','Score every recommendation run for confidence coverage, diversity, actionability and truthfulness.',array['evaluate_run','write_quality_metrics','flag_regression'],array['agent_runs','recommendation_sessions','impressions'],'after every run','active',false,'{"required_metrics":["confidence_coverage","diversity","actionability","truthfulness"]}'::jsonb),
('gt_data_gap_agent','GOOD TIMES Data Gap Agent','Prioritize missing images, actions, coordinates, provenance, ratings and organizer data for enrichment.',array['measure_gaps','rank_backlog','queue_enrichment'],array['events','venues','source_evidence'],'daily','active',true,'{"event_fields":["image","ticket","venue","organizer"],"venue_fields":["coordinates","actions","evidence","rating"]}'::jsonb)
on conflict(agent_key) do update set
  name=excluded.name,purpose=excluded.purpose,allowed_actions=excluded.allowed_actions,
  data_domains=excluded.data_domains,cadence=excluded.cadence,status=excluded.status,
  requires_human_review=excluded.requires_human_review,config=excluded.config,updated_at=now();

alter table public.gt_user_intelligence_profiles enable row level security;
alter table public.gt_recommendation_sessions enable row level security;
alter table public.gt_recommendation_impressions enable row level security;
alter table public.gt_agent_quality_evaluations enable row level security;

drop policy if exists gt_user_intelligence_profiles_read_own on public.gt_user_intelligence_profiles;
create policy gt_user_intelligence_profiles_read_own on public.gt_user_intelligence_profiles
  for select to authenticated using (auth_id=(select auth.uid()));

drop policy if exists gt_recommendation_sessions_read_own on public.gt_recommendation_sessions;
create policy gt_recommendation_sessions_read_own on public.gt_recommendation_sessions
  for select to authenticated using (auth_id=(select auth.uid()));

drop policy if exists gt_recommendation_impressions_read_own on public.gt_recommendation_impressions;
create policy gt_recommendation_impressions_read_own on public.gt_recommendation_impressions
  for select to authenticated using (auth_id=(select auth.uid()));

revoke all on public.gt_user_intelligence_profiles from anon,authenticated;
revoke all on public.gt_recommendation_sessions from anon,authenticated;
revoke all on public.gt_recommendation_impressions from anon,authenticated;
revoke all on public.gt_agent_quality_evaluations from anon,authenticated;
grant select on public.gt_user_intelligence_profiles to authenticated;
grant select on public.gt_recommendation_sessions to authenticated;
grant select on public.gt_recommendation_impressions to authenticated;
