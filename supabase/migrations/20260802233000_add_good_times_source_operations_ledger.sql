begin;

create schema if not exists gt_private;
revoke all on schema gt_private from public;
revoke all on schema gt_private from anon, authenticated;
grant usage on schema gt_private to service_role, postgres;

create table if not exists gt_private.source_health_snapshots (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null default now(),
  city_key text not null,

  event_sources_configured integer not null default 0,
  event_sources_productive integer not null default 0,
  event_sources_empty integer not null default 0,
  event_sources_failed integer not null default 0,
  event_sources_never_run integer not null default 0,
  event_sources_stale integer not null default 0,
  event_sources_paused integer not null default 0,

  social_sources_active integer not null default 0,
  social_sources_with_instagram integer not null default 0,
  instagram_posts_total bigint not null default 0,
  instagram_posts_7d bigint not null default 0,
  hashtag_rows_total bigint not null default 0,
  hashtag_rows_7d bigint not null default 0,
  location_rows_total bigint not null default 0,
  location_rows_7d bigint not null default 0,
  scrape_jobs_24h bigint not null default 0,
  failed_scrape_jobs_7d bigint not null default 0,
  venue_mentions_total bigint not null default 0,
  source_discoveries_pending bigint not null default 0,

  event_pipeline_state text not null,
  social_pipeline_state text not null,
  metadata jsonb not null default '{}'::jsonb,

  constraint source_health_snapshots_city_key_check
    check (city_key = lower(city_key)),
  constraint source_health_snapshots_event_state_check
    check (event_pipeline_state in ('healthy','degraded','stalled','unconfigured')),
  constraint source_health_snapshots_social_state_check
    check (social_pipeline_state in ('healthy','degraded','stalled','unconfigured'))
);

create index if not exists source_health_snapshots_city_captured_idx
  on gt_private.source_health_snapshots (city_key, captured_at desc);

revoke all on table gt_private.source_health_snapshots from public, anon, authenticated;
grant select, insert on table gt_private.source_health_snapshots to service_role, postgres;
grant usage, select on sequence gt_private.source_health_snapshots_id_seq to service_role, postgres;

create or replace function public.gt_capture_source_health_snapshot(
  p_city_key text default 'atlanta'
)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'gt_private', 'pg_temp'
as $$
declare
  v_city_key text := lower(trim(coalesce(p_city_key, 'atlanta')));
  v_snapshot_id bigint;
begin
  if v_city_key !~ '^[a-z0-9_]+$' then
    raise exception 'Invalid city key';
  end if;

  insert into gt_private.source_health_snapshots (
    city_key,
    event_sources_configured,
    event_sources_productive,
    event_sources_empty,
    event_sources_failed,
    event_sources_never_run,
    event_sources_stale,
    event_sources_paused,
    social_sources_active,
    social_sources_with_instagram,
    instagram_posts_total,
    instagram_posts_7d,
    hashtag_rows_total,
    hashtag_rows_7d,
    location_rows_total,
    location_rows_7d,
    scrape_jobs_24h,
    failed_scrape_jobs_7d,
    venue_mentions_total,
    source_discoveries_pending,
    event_pipeline_state,
    social_pipeline_state,
    metadata
  )
  select
    v_city_key,
    count(*) filter (where h.is_active),
    count(*) filter (where h.health_state = 'productive'),
    count(*) filter (where h.health_state = 'empty'),
    count(*) filter (where h.health_state = 'failed'),
    count(*) filter (where h.health_state = 'never_run'),
    count(*) filter (where h.health_state = 'stale'),
    count(*) filter (where h.health_state = 'paused'),
    (select count(*) from public.gt_culture_sources s where s.is_active and lower(s.city_key) = v_city_key),
    (select count(*) from public.gt_culture_sources s where s.is_active and lower(s.city_key) = v_city_key and nullif(trim(s.instagram_handle), '') is not null),
    (select count(*) from public.ig_post_metadata),
    (select count(*) from public.ig_post_metadata where coalesce(posted_at, scraped_at) >= now() - interval '7 days'),
    (select count(*) from public.ig_hashtag_results),
    (select count(*) from public.ig_hashtag_results where coalesce(posted_at, scraped_at) >= now() - interval '7 days'),
    (select count(*) from public.ig_location_results),
    (select count(*) from public.ig_location_results where coalesce(posted_at, scraped_at) >= now() - interval '7 days'),
    (select count(*) from public.ig_scrape_jobs where coalesce(completed_at, started_at, created_at) >= now() - interval '24 hours'),
    (select count(*) from public.ig_scrape_jobs where coalesce(completed_at, started_at, created_at) >= now() - interval '7 days' and lower(coalesce(status, '')) in ('failed','error')),
    (select count(*) from public.gt_venue_mentions),
    (select count(*) from public.gt_source_discoveries where lower(coalesce(status, '')) in ('new','pending','review')),
    case
      when count(*) filter (where h.is_active) = 0 then 'unconfigured'
      when count(*) filter (where h.health_state in ('failed','never_run','stale')) > count(*) filter (where h.health_state = 'productive') then 'degraded'
      when count(*) filter (where h.health_state = 'productive') = 0 then 'stalled'
      else 'healthy'
    end,
    case
      when (select count(*) from public.gt_culture_sources s where s.is_active and lower(s.city_key) = v_city_key) = 0 then 'unconfigured'
      when (select count(*) from public.ig_scrape_jobs where coalesce(completed_at, started_at, created_at) >= now() - interval '24 hours') = 0
       and (select count(*) from public.ig_post_metadata where coalesce(posted_at, scraped_at) >= now() - interval '7 days') = 0
       and (select count(*) from public.ig_hashtag_results where coalesce(posted_at, scraped_at) >= now() - interval '7 days') = 0
       and (select count(*) from public.ig_location_results where coalesce(posted_at, scraped_at) >= now() - interval '7 days') = 0
        then 'stalled'
      when (select count(*) from public.ig_scrape_jobs where coalesce(completed_at, started_at, created_at) >= now() - interval '7 days' and lower(coalesce(status, '')) in ('failed','error')) > 0
        then 'degraded'
      else 'healthy'
    end,
    jsonb_build_object(
      'captured_by', 'gt_capture_source_health_snapshot',
      'source_health_view', 'public.v_gt_event_source_health',
      'social_ingest_function', 'gt-social-signal-ingest'
    )
  from public.v_gt_event_source_health h
  where h.city_key = v_city_key
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

revoke all on function public.gt_capture_source_health_snapshot(text)
from public, anon, authenticated;
grant execute on function public.gt_capture_source_health_snapshot(text)
to service_role, postgres;

create or replace view gt_private.v_source_operations_latest
as
select distinct on (city_key)
  id,
  captured_at,
  city_key,
  event_sources_configured,
  event_sources_productive,
  event_sources_empty,
  event_sources_failed,
  event_sources_never_run,
  event_sources_stale,
  event_sources_paused,
  social_sources_active,
  social_sources_with_instagram,
  instagram_posts_total,
  instagram_posts_7d,
  hashtag_rows_total,
  hashtag_rows_7d,
  location_rows_total,
  location_rows_7d,
  scrape_jobs_24h,
  failed_scrape_jobs_7d,
  venue_mentions_total,
  source_discoveries_pending,
  event_pipeline_state,
  social_pipeline_state,
  metadata
from gt_private.source_health_snapshots
order by city_key, captured_at desc;

revoke all on table gt_private.v_source_operations_latest from public, anon, authenticated;
grant select on table gt_private.v_source_operations_latest to service_role, postgres;

create or replace function public.gt_get_source_operations_status(
  p_city_key text default 'atlanta'
)
returns jsonb
language sql
security definer
stable
set search_path to 'public', 'gt_private', 'pg_temp'
as $$
  select coalesce(to_jsonb(s), jsonb_build_object(
    'city_key', lower(trim(coalesce(p_city_key, 'atlanta'))),
    'event_pipeline_state', 'unconfigured',
    'social_pipeline_state', 'unconfigured'
  ))
  from (
    select *
    from gt_private.v_source_operations_latest
    where city_key = lower(trim(coalesce(p_city_key, 'atlanta')))
    limit 1
  ) s;
$$;

revoke all on function public.gt_get_source_operations_status(text)
from public, anon, authenticated;
grant execute on function public.gt_get_source_operations_status(text)
to service_role, postgres;

comment on schema gt_private is
'Private GOOD TIMES operational evidence. Not exposed through browser-facing PostgREST schemas.';
comment on table gt_private.source_health_snapshots is
'Immutable GOOD TIMES source-pipeline health snapshots. Records whether configured source systems are actually producing fresh data.';
comment on function public.gt_capture_source_health_snapshot(text) is
'Captures private event-source and social-source production evidence for one GOOD TIMES city.';
comment on function public.gt_get_source_operations_status(text) is
'Returns the latest private source operations snapshot for authorized server-side callers.';

select public.gt_capture_source_health_snapshot('atlanta');

-- Keep one current snapshot every six hours. The operation is idempotent and
-- does not mutate venue, event, social evidence, ranking, or public feed rows.
do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id from cron.job where jobname = 'gt-source-health-snapshot' limit 1;
    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;
    perform cron.schedule(
      'gt-source-health-snapshot',
      '17 */6 * * *',
      $cron$select public.gt_capture_source_health_snapshot('atlanta');$cron$
    );
  end if;
end;
$$;

commit;
