-- GOOD TIMES Atlanta source operations, banner launch and release safeguards.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.gt_run_atlanta_places_refresh()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_city record; v_job uuid;
begin
  select * into v_city from public.gt_cities where city_key='atlanta';
  if not found then return jsonb_build_object('success',false,'error','atlanta city config missing'); end if;
  v_job:=public.queue_agent_job(
    'gt_atlanta_places_refresh',40,'scrape_google_places','atlanta',
    jsonb_build_object(
      'city_key','atlanta','city_name',v_city.city_name,'lat',v_city.latitude,'lng',v_city.longitude,
      'radius_meters',35000,
      'types',array['bar','night_club','restaurant','lounge','museum','art_gallery','stadium'],
      'min_rating',4.0,'target_table','gt_venues'
    ),3,24
  );
  return jsonb_build_object('success',true,'job_id',v_job,'queued_at',now());
end;
$$;
revoke all on function public.gt_run_atlanta_places_refresh() from public,anon,authenticated;
grant execute on function public.gt_run_atlanta_places_refresh() to service_role;

update public.credentials
set credential_value=jsonb_build_object(
      'api_key',encode(gen_random_bytes(32),'hex'),
      'purpose','GOOD TIMES Atlanta direct source collector'
    ),
    is_active=true,expires_at=null,updated_at=now(),last_validation_status='created'
where credential_key='gt_atlanta_source_internal';

insert into public.credentials(credential_type,credential_key,credential_value,is_active,last_validation_status)
select 'internal_service','gt_atlanta_source_internal',
  jsonb_build_object('api_key',encode(gen_random_bytes(32),'hex'),'purpose','GOOD TIMES Atlanta direct source collector'),
  true,'created'
where not exists (
  select 1 from public.credentials where credential_key='gt_atlanta_source_internal'
);

create or replace function public.gt_run_atlanta_direct_sources(p_limit integer default 8)
returns bigint
language plpgsql
security definer
set search_path=public,extensions,net
as $$
declare v_key text; v_request_id bigint;
begin
  select credential_value->>'api_key' into v_key
  from public.credentials
  where credential_key='gt_atlanta_source_internal' and is_active=true
  limit 1;
  if v_key is null then raise exception 'internal credential unavailable'; end if;
  select net.http_post(
    url=>'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-source-refresh',
    headers=>jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body=>jsonb_build_object('limit',least(greatest(p_limit,1),12)),
    timeout_milliseconds=>120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.gt_run_atlanta_direct_sources(integer) from public,anon,authenticated;
grant execute on function public.gt_run_atlanta_direct_sources(integer) to service_role;

insert into public.gt_banners(
  internal_name,headline,subheadline,media_type,media_url,poster_url,click_action_type,click_target,
  city_key,category_keys,subcategory_keys,surface_keys,audience_tags,starts_at,ends_at,
  priority,weight,frequency_cap,is_paid,sponsor_name,status,approved_by,approved_at
)
select * from (values
  (
    'atlanta_whats_the_move_motion','ATLANTA — WHAT’S THE MOVE?',
    'The best events, concerts, nightlife and culture — ranked by Good Times.',
    'video',
    'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds/gt-intro-video.mp4',
    'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good-times-app/good_times/good_times_card.png',
    'category','concerts_live_music','atlanta','{}'::text[],'{}'::text[],
    array['home_hero','home_between_sections','events_header','concerts_section','explore_header']::text[],
    array['atlanta','entertainment']::text[],now(),now()+interval '120 days',5,200,2,false,'GOOD TIMES','active','system_release_2026_07_30',now()
  ),
  (
    'atlanta_city_guide_editorial','DON’T MISS ATLANTA',
    'Official calendars, culture pages, promoters and venue intel — all in one feed.',
    'image',
    'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good-times-app/good_times/good_times_card.png',
    null,'category','festivals_major_activations','atlanta','{}'::text[],'{}'::text[],
    array['home_between_sections','now_feed','explore_category','event_detail','saved_plans']::text[],
    array['atlanta','culture']::text[],now(),now()+interval '120 days',15,140,3,false,'GOOD TIMES','active','system_release_2026_07_30',now()
  ),
  (
    'atlanta_breaking_ticker','NEW EVENTS ADDED THROUGHOUT THE DAY',
    'Concert drops • venue changes • weekend guides • last-minute activations',
    'ticker',null,null,'none',null,'atlanta','{}'::text[],'{}'::text[],
    array['now_ticker','events_header','concerts_section','map_card','concierge_results']::text[],
    array['atlanta','live_updates']::text[],now(),now()+interval '120 days',10,180,4,false,'GOOD TIMES','active','system_release_2026_07_30',now()
  )
) as v(
  internal_name,headline,subheadline,media_type,media_url,poster_url,click_action_type,click_target,
  city_key,category_keys,subcategory_keys,surface_keys,audience_tags,starts_at,ends_at,
  priority,weight,frequency_cap,is_paid,sponsor_name,status,approved_by,approved_at
)
where not exists (
  select 1 from public.gt_banners b
  where b.internal_name=v.internal_name and b.status in ('active','scheduled')
);

-- Remove known impossible date records from all public feed paths without deleting their source evidence.
update public.gt_shows
set status='cancelled',
    curation_reason=concat_ws(' | ',nullif(curation_reason,''),'QUARANTINED_BAD_DATE_2026_07_30: title year conflicts with 2031 date')
where city_key='atlanta'
  and show_date>current_date+540
  and lower(event_name) in ('atlanta black pride 2025','taste of soul');

update public.gt_sourced_events
set legacy_quarantined_at=coalesce(legacy_quarantined_at,now()),
    legacy_quarantine_reason='BAD_DATE_2026_07_30: event title/year conflicts with 2031 date',
    is_published=false,published_to_gt=false,updated_at=now()
where gt_city_normalize(city)='atlanta'
  and event_date>current_date+540
  and lower(event_name) in ('atlanta black pride 2025','taste of soul');

-- Keep launch metrics and temporary tabs synchronized with canonical content.
update public.gt_city_content_config c
set current_venue_count=x.cnt,
    launch_ready=(x.cnt>=c.min_venues_to_launch),
    updated_at=now()
from (
  select count(*)::int as cnt
  from public.gt_venues
  where city_key='atlanta' and status='active'
) x
where c.city_key='atlanta';

update public.gt_app_tabs
set is_enabled=false
where is_temporary and active_until is not null and active_until<current_date;

-- Remove the failed paid-AI queueing schedule; retain Google only as supporting venue enrichment.
do $$ begin
  perform cron.unschedule('routine-gt-sourcer-atlanta');
exception when others then null;
end $$;

do $$ begin
  perform cron.unschedule('gt-atlanta-places-refresh');
exception when others then null;
end $$;

do $$ begin
  perform cron.unschedule('gt-atlanta-rank-refresh');
exception when others then null;
end $$;

do $$ begin
  perform cron.unschedule('gt-atlanta-direct-sources');
exception when others then null;
end $$;

select cron.schedule(
  'gt-atlanta-places-refresh','0 8,20 * * *',
  'select public.gt_run_atlanta_places_refresh();'
);
select cron.schedule(
  'gt-atlanta-rank-refresh','*/15 * * * *',
  'select public.gt_refresh_atlanta_display_priority();'
);
select cron.schedule(
  'gt-atlanta-direct-sources','15 */2 * * *',
  'select public.gt_run_atlanta_direct_sources(8);'
);

select public.gt_refresh_atlanta_display_priority();
