-- GOOD TIMES city data-operations readiness.
-- Internal only: measures source freshness and coverage, then creates a city work queue.

create table if not exists public.gt_city_refresh_work_queue (
  city_key text primary key,
  display_name text not null,
  priority smallint not null default 5 check (priority between 1 and 10),
  status text not null default 'queued' check (status in ('queued','running','waiting_review','healthy','blocked','failed')),
  event_freshness_target_hours integer not null default 24 check (event_freshness_target_hours between 1 and 168),
  venue_freshness_target_days integer not null default 30 check (venue_freshness_target_days between 1 and 365),
  assigned_owner text,
  next_action text,
  next_action_at timestamptz not null default now(),
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gt_city_refresh_work_queue enable row level security;
revoke all on public.gt_city_refresh_work_queue from anon,authenticated;

create or replace view public.gt_city_content_readiness
with (security_invoker=true)
as
with cities as (
  select city_key from public.gt_venues
  union
  select city_key from public.gt_shows
), venue_stats as (
  select city_key,
         count(*) filter (where status='active')::integer as active_venues,
         count(*) filter (where status='active' and nullif(hero_image,'') is not null)::integer as venue_images,
         count(*) filter (where status='active' and latitude is not null and longitude is not null)::integer as venue_coordinates,
         count(*) filter (where status='active' and (
           nullif(website,'') is not null or nullif(phone,'') is not null or
           nullif(instagram_handle,'') is not null or nullif(booking_link,'') is not null
         ))::integer as actionable_venues,
         count(*) filter (where status='active' and is_verified)::integer as verified_venues,
         max(greatest(updated_at,coalesce(enriched_at,updated_at))) filter (where status='active') as latest_venue_update
  from public.gt_venues
  group by city_key
), show_stats as (
  select city_key,
         count(*) filter (where status in ('confirmed','tentative') and show_date>=current_date)::integer as upcoming_events,
         count(*) filter (where status in ('confirmed','tentative') and show_date>=current_date and nullif(image_url,'') is not null)::integer as event_images,
         count(*) filter (where status in ('confirmed','tentative') and show_date>=current_date and (
           nullif(ticket_url,'') is not null or nullif(source_url,'') is not null
         ))::integer as actionable_events,
         max(updated_at) filter (where status in ('confirmed','tentative') and show_date>=current_date) as latest_event_update
  from public.gt_shows
  group by city_key
)
select c.city_key,
       initcap(replace(c.city_key,'_',' ')) as city_name,
       coalesce(v.active_venues,0) as active_venues,
       coalesce(s.upcoming_events,0) as upcoming_events,
       coalesce(v.venue_images,0) as venue_images,
       coalesce(v.venue_coordinates,0) as venue_coordinates,
       coalesce(v.actionable_venues,0) as actionable_venues,
       coalesce(v.verified_venues,0) as verified_venues,
       coalesce(s.event_images,0) as event_images,
       coalesce(s.actionable_events,0) as actionable_events,
       v.latest_venue_update,
       s.latest_event_update,
       case when s.latest_event_update is null then null else round(extract(epoch from (now()-s.latest_event_update))/3600,1) end as event_age_hours,
       case when v.latest_venue_update is null then null else round(extract(epoch from (now()-v.latest_venue_update))/86400,1) end as venue_age_days,
       case when coalesce(v.active_venues,0)=0 then 0 else round(v.venue_images::numeric/v.active_venues,3) end as venue_image_coverage,
       case when coalesce(v.active_venues,0)=0 then 0 else round(v.actionable_venues::numeric/v.active_venues,3) end as venue_action_coverage,
       case when coalesce(s.upcoming_events,0)=0 then 0 else round(s.event_images::numeric/s.upcoming_events,3) end as event_image_coverage,
       case when coalesce(s.upcoming_events,0)=0 then 0 else round(s.actionable_events::numeric/s.upcoming_events,3) end as event_action_coverage,
       case
         when coalesce(v.active_venues,0)=0 then 'critical_no_venues'
         when coalesce(s.upcoming_events,0)=0 then 'critical_no_events'
         when s.latest_event_update is null or s.latest_event_update<now()-interval '72 hours' then 'critical_stale_events'
         when v.latest_venue_update is null or v.latest_venue_update<now()-interval '90 days' then 'stale_venues'
         when (case when v.active_venues=0 then 0 else v.actionable_venues::numeric/v.active_venues end)<0.60 then 'low_actionability'
         when (case when s.upcoming_events=0 then 0 else s.event_images::numeric/s.upcoming_events end)<0.60 then 'low_event_visual_coverage'
         else 'healthy'
       end as readiness_state
from cities c
left join venue_stats v using(city_key)
left join show_stats s using(city_key);

revoke all on public.gt_city_content_readiness from anon,authenticated;

create or replace function public.gt_refresh_city_work_queue()
returns integer
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_count integer;
begin
  if auth.role()<>'service_role' and current_user not in ('postgres','supabase_admin') then
    raise exception 'Service role required' using errcode='42501';
  end if;

  insert into public.gt_city_refresh_work_queue(city_key,display_name,priority,status,next_action,next_action_at,last_result)
  select r.city_key,r.city_name,
         case r.readiness_state
           when 'critical_no_venues' then 10 when 'critical_no_events' then 10 when 'critical_stale_events' then 9
           when 'stale_venues' then 8 when 'low_actionability' then 7 when 'low_event_visual_coverage' then 6 else 3 end,
         case when r.readiness_state='healthy' then 'healthy' else 'queued' end,
         case r.readiness_state
           when 'critical_no_venues' then 'Source and verify a minimum launch venue set before city discovery remains enabled.'
           when 'critical_no_events' then 'Restore an approved event source and ingest current upcoming events.'
           when 'critical_stale_events' then 'Run event refresh, deduplication, and source-health validation.'
           when 'stale_venues' then 'Revalidate venue status, contact actions, hours, coordinates, and imagery.'
           when 'low_actionability' then 'Prioritize website, phone, Instagram, booking, and ticket actions.'
           when 'low_event_visual_coverage' then 'Source rights-safe event imagery and provenance.'
           else 'Maintain source cadence and quality monitoring.' end,
         case when r.readiness_state='healthy' then now()+interval '24 hours' else now() end,
         jsonb_build_object(
           'readiness_state',r.readiness_state,
           'active_venues',r.active_venues,
           'upcoming_events',r.upcoming_events,
           'event_age_hours',r.event_age_hours,
           'venue_age_days',r.venue_age_days,
           'venue_action_coverage',r.venue_action_coverage,
           'event_action_coverage',r.event_action_coverage
         )
  from public.gt_city_content_readiness r
  on conflict(city_key) do update set
    display_name=excluded.display_name,
    priority=excluded.priority,
    status=case when excluded.status='healthy' then 'healthy' when public.gt_city_refresh_work_queue.status='running' then 'running' else 'queued' end,
    next_action=excluded.next_action,
    next_action_at=excluded.next_action_at,
    last_result=excluded.last_result,
    updated_at=now();

  get diagnostics v_count=row_count;
  return v_count;
end;$$;

revoke all on function public.gt_refresh_city_work_queue() from public;
grant execute on function public.gt_refresh_city_work_queue() to service_role;

select public.gt_refresh_city_work_queue();

create index if not exists gt_city_refresh_priority_idx
on public.gt_city_refresh_work_queue(status,priority desc,next_action_at);
