-- GOOD TIMES V3 operational hardening.
-- Records recurring system task templates, prevents duplicate open system work,
-- seeds the first operational queue, and exposes an internal readiness truth table.

create table if not exists public.gt_operational_task_templates (
  template_key text primary key,
  agent_key text not null references public.gt_agent_registry(agent_key),
  task_type text not null,
  cadence_minutes integer not null check (cadence_minutes between 15 and 10080),
  priority smallint not null default 5 check (priority between 1 and 10),
  requires_human_review boolean not null default false,
  input jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_enqueued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gt_operational_task_templates enable row level security;
revoke all on public.gt_operational_task_templates from anon, authenticated;

insert into public.gt_operational_task_templates(template_key,agent_key,task_type,cadence_minutes,priority,requires_human_review,input)
values
('source_health_6h','gt_source_health_agent','source_health_audit',360,9,true,'{"scope":"all_cities","freshness_threshold_hours":24,"fail_on_empty":true}'::jsonb),
('event_intake_4h','gt_event_ingestion_agent','event_intake_cycle',240,8,true,'{"scope":"all_cities","deduplicate":true,"quarantine_low_confidence":true}'::jsonb),
('data_gap_daily','gt_data_gap_agent','data_gap_prioritization',1440,8,true,'{"scope":"all_cities","fields":["image","action_url","coordinates","provenance","rating","organizer"]}'::jsonb),
('venue_enrichment_daily','gt_venue_enrichment_agent','venue_enrichment_cycle',1440,7,true,'{"scope":"all_cities","approved_sources_only":true}'::jsonb),
('image_qa_daily','gt_image_qa_agent','image_quality_audit',1440,7,true,'{"scope":"all_cities","require_relevance":true,"require_provenance":true}'::jsonb),
('taste_learning_hourly','gt_taste_agent','taste_learning_cycle',60,6,false,'{"first_party_only":true,"decay_enabled":true}'::jsonb),
('memory_refresh_hourly','gt_memory_agent','memory_profile_refresh',60,6,false,'{"first_party_only":true,"minimum_signals":1}'::jsonb)
on conflict(template_key) do update set
 agent_key=excluded.agent_key,
 task_type=excluded.task_type,
 cadence_minutes=excluded.cadence_minutes,
 priority=excluded.priority,
 requires_human_review=excluded.requires_human_review,
 input=excluded.input,
 is_active=true,
 updated_at=now();

create unique index if not exists gt_agent_tasks_open_system_task_uidx
on public.gt_agent_tasks(agent_key,task_type)
where auth_id is null and status in ('queued','running','waiting_review');

insert into public.gt_agent_tasks(agent_key,task_type,input,status,priority,available_at,max_attempts)
select t.agent_key,t.task_type,t.input,'queued',t.priority,now(),3
from public.gt_operational_task_templates t
where t.is_active
on conflict do nothing;

update public.gt_operational_task_templates t
set last_enqueued_at=now(),updated_at=now()
where exists (
  select 1 from public.gt_agent_tasks q
  where q.agent_key=t.agent_key
    and q.task_type=t.task_type
    and q.auth_id is null
    and q.status in ('queued','running','waiting_review')
);

create or replace view public.gt_v3_readiness_dashboard
with (security_invoker=true)
as
select
  now() as measured_at,
  (select count(*) from public.gt_agent_registry where status='active')::integer as active_agents,
  (select count(*) from public.gt_formula_versions where is_active)::integer as active_formulas,
  (select count(*) from public.gt_operational_task_templates where is_active)::integer as active_task_templates,
  (select count(*) from public.gt_agent_tasks where status='queued')::integer as queued_tasks,
  (select count(*) from public.gt_agent_tasks where status='running')::integer as running_tasks,
  (select count(*) from public.gt_agent_run_ledger where completed_at>=now()-interval '24 hours')::integer as runs_24h,
  (select count(*) from public.gt_agent_quality_evaluations where created_at>=now()-interval '24 hours')::integer as evaluations_24h,
  (select count(*) from public.gt_product_events where received_at>=now()-interval '24 hours')::integer as product_events_24h,
  (select count(*) from public.gt_taste_signals where occurred_at>=now()-interval '24 hours')::integer as taste_signals_24h,
  (select count(*) from public.gt_user_intelligence_profiles)::integer as learned_profiles,
  case
    when (select count(*) from public.gt_agent_registry where status='active')<10 then 'architecture_incomplete'
    when (select count(*) from public.gt_agent_run_ledger where completed_at>=now()-interval '24 hours')=0 then 'agents_not_proven'
    when (select count(*) from public.gt_product_events where received_at>=now()-interval '24 hours')=0 then 'no_live_learning_traffic'
    else 'operational'
  end as readiness_state;

revoke all on public.gt_v3_readiness_dashboard from anon,authenticated;
