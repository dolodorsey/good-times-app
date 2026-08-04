-- GOOD TIMES V3 Gateway operations bridge.
-- Exposes safe aggregate health through RPCs, snapshots city readiness for fast reads,
-- adds the missing Las Vegas sourcer, and refreshes readiness every 30 minutes.

create table if not exists public.gt_city_health_snapshot (
  city_key text primary key,
  city_name text not null,
  active_venues integer not null default 0,
  upcoming_events integer not null default 0,
  venue_image_coverage numeric not null default 0,
  venue_action_coverage numeric not null default 0,
  event_image_coverage numeric not null default 0,
  event_action_coverage numeric not null default 0,
  event_age_hours numeric,
  venue_age_days numeric,
  readiness_state text not null,
  captured_at timestamptz not null default now()
);

alter table public.gt_city_health_snapshot enable row level security;
revoke all on public.gt_city_health_snapshot from anon,authenticated;

create or replace function public.gt_capture_city_health_snapshot()
returns integer
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_count integer;
begin
  insert into public.gt_city_health_snapshot(
    city_key,city_name,active_venues,upcoming_events,venue_image_coverage,venue_action_coverage,
    event_image_coverage,event_action_coverage,event_age_hours,venue_age_days,readiness_state,captured_at
  )
  select city_key,city_name,active_venues,upcoming_events,venue_image_coverage,venue_action_coverage,
         event_image_coverage,event_action_coverage,event_age_hours,venue_age_days,readiness_state,now()
  from public.gt_city_content_readiness
  on conflict(city_key) do update set
    city_name=excluded.city_name,
    active_venues=excluded.active_venues,
    upcoming_events=excluded.upcoming_events,
    venue_image_coverage=excluded.venue_image_coverage,
    venue_action_coverage=excluded.venue_action_coverage,
    event_image_coverage=excluded.event_image_coverage,
    event_action_coverage=excluded.event_action_coverage,
    event_age_hours=excluded.event_age_hours,
    venue_age_days=excluded.venue_age_days,
    readiness_state=excluded.readiness_state,
    captured_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end;$$;

revoke all on function public.gt_capture_city_health_snapshot() from public;
grant execute on function public.gt_capture_city_health_snapshot() to service_role;

create or replace function public.gt_get_public_city_readiness()
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','public'
as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'city_key',city_key,
  'city_name',city_name,
  'active_venues',active_venues,
  'upcoming_events',upcoming_events,
  'venue_image_coverage',venue_image_coverage,
  'venue_action_coverage',venue_action_coverage,
  'event_image_coverage',event_image_coverage,
  'event_action_coverage',event_action_coverage,
  'event_age_hours',event_age_hours,
  'venue_age_days',venue_age_days,
  'readiness_state',readiness_state,
  'captured_at',captured_at
) order by city_key),'[]'::jsonb)
from public.gt_city_health_snapshot;
$$;

create or replace function public.gt_get_public_pipeline_health()
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','public','cron'
as $$
with relevant_jobs as (
  select jobid,jobname,active
  from cron.job
  where jobname like 'routine-gt-sourcer-%'
     or jobname in (
       'worker-raw-items-promoter','worker-google-places','worker-claude-flyer','worker-llm-synth',
       'gt_promote_sourced_to_shows_6h','gt-atlanta-places-refresh','gt-atlanta-rank-refresh',
       'gt-atlanta-direct-sources','gt-atlanta-eventbrite-refresh','gt-atlanta-eventbrite-enrich',
       'gt-source-health-snapshot','gt-atlanta-official-venue-adapters','gt-atlanta-aisle5-adapter'
     )
), latest_runs as (
  select distinct on (d.jobid) d.jobid,d.status,d.start_time,d.end_time
  from cron.job_run_details d
  join relevant_jobs j on j.jobid=d.jobid
  order by d.jobid,d.start_time desc
), summary as (
  select now() measured_at,
         count(*)::integer tracked_jobs,
         count(*) filter(where j.active)::integer active_jobs,
         count(*) filter(where j.jobname like 'routine-gt-sourcer-%' and j.active)::integer active_city_sourcers,
         10::integer expected_non_atlanta_sourcers,
         count(*) filter(where j.active and coalesce(r.status,'')='succeeded')::integer latest_successful_jobs,
         count(*) filter(where j.active and coalesce(r.status,'') not in ('succeeded','running'))::integer latest_failed_or_missing_jobs,
         max(r.end_time) filter(where r.status='succeeded') latest_success_at,
         (select count(*)::integer from public.gt_city_health_snapshot where readiness_state='healthy') healthy_cities,
         (select count(*)::integer from public.gt_city_health_snapshot where readiness_state<>'healthy') cities_needing_work,
         (select max(captured_at) from public.gt_city_health_snapshot) city_snapshot_at
  from relevant_jobs j
  left join latest_runs r on r.jobid=j.jobid
)
select to_jsonb(summary) from summary;
$$;

revoke all on function public.gt_get_public_pipeline_health() from public;
revoke all on function public.gt_get_public_city_readiness() from public;
grant execute on function public.gt_get_public_pipeline_health() to anon,authenticated;
grant execute on function public.gt_get_public_city_readiness() to anon,authenticated;

select public.gt_capture_city_health_snapshot();

do $$
declare v_jobid bigint;
begin
  if not exists(select 1 from cron.job where jobname='routine-gt-sourcer-las-vegas') then
    perform cron.schedule(
      'routine-gt-sourcer-las-vegas',
      '0 19 * * *',
      $cmd$select public.run_gt_city_sourcer_v2('las_vegas');$cmd$
    );
  end if;

  select jobid into v_jobid from cron.job where jobname='gt-city-readiness-refresh';
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'gt-city-readiness-refresh',
    '*/30 * * * *',
    $cmd$
      select public.gt_refresh_city_work_queue();
      select public.gt_capture_city_health_snapshot();
    $cmd$
  );
end $$;
