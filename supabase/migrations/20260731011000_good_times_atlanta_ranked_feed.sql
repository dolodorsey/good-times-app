-- GOOD TIMES Atlanta canonical feed, score propagation, coverage and public projection.

create or replace view public.v_gt_atlanta_ranked_feed_internal with (security_invoker=true) as
with unified as (
  select
    'gt_shows:'||s.id::text as event_key,'gt_shows'::text as source_table,s.id::text as source_id,
    s.city_key,s.event_name as title,s.show_date as event_date,s.show_time as event_time,s.venue_name,s.venue_address,
    s.event_type as raw_type,s.genre as raw_category,s.description,s.ticket_url,s.image_url,s.organizer,s.source as source_name,s.source_url,
    coalesce(s.is_free,false) as is_free,coalesce(s.is_featured,false) as is_featured,coalesce(s.is_curated,false) as is_curated,
    (lower(coalesce(s.source,'')) in ('khg','huglife','good times','the kollective') or lower(coalesce(s.organizer,'')) like '%kollective%') as is_first_party,
    (s.status='confirmed') as is_verified,coalesce(s.quality_score,0) as quality_hint,0::int as momentum_hint,
    s.updated_at,'{}'::text[] as audience_tags,'{}'::text[] as vibe_tags
  from public.gt_shows s
  where s.city_key='atlanta' and s.show_date>=current_date and s.status in ('confirmed','tentative')

  union all

  select
    'gt_city_events:'||e.id::text,'gt_city_events',e.id::text,e.city_key,e.event_name,e.start_date,e.start_time,e.venue_name,e.venue_address,
    e.event_type,e.subcategory,e.description,e.ticket_url,e.image_url,e.organizer,coalesce(e.organizer,'city_event'),e.source_url,
    coalesce(e.is_free,false),false,coalesce(e.is_curated,false),false,(e.status in ('confirmed','curated')),
    coalesce(e.quality_score,0),case when e.is_curated then 8 else 0 end,e.updated_at,coalesce(e.tags,'{}'::text[]),'{}'::text[]
  from public.gt_city_events e
  where e.city_key='atlanta' and e.start_date>=current_date and e.status in ('active','confirmed','curated')
    and e.legacy_quarantined_at is null

  union all

  select
    'gt_sourced_events:'||e.id::text,'gt_sourced_events',e.id::text,gt_city_normalize(e.city),e.event_name,e.event_date,e.event_time,e.venue_name,e.venue_address,
    e.event_type,e.event_category,e.description,e.ticket_url,e.image_url,e.organizer,e.source_name,e.source_url,
    coalesce(e.is_free,false),false,false,false,coalesce(e.is_verified,false),
    coalesce(e.ai_vibe_score,0),coalesce(e.ai_vibe_score,0),e.updated_at,coalesce(e.tags,'{}'::text[]),coalesce(e.vibe_tags,'{}'::text[])
  from public.gt_sourced_events e
  where gt_city_normalize(e.city)='atlanta' and e.event_date>=current_date
    and (coalesce(e.is_verified,false) or coalesce(e.is_published,false) or coalesce(e.published_to_gt,false))
    and e.legacy_quarantined_at is null

  union all

  select
    'gt_daily_events:'||e.id::text,'gt_daily_events',e.id::text,e.city_key,e.event_name,e.event_date,e.time_slot,e.venue,null,
    e.event_type,null,e.description,e.ticket_url,null,e.source_handle,e.source_handle,e.source_url,
    coalesce(e.is_free,false),false,false,false,coalesce(e.is_verified,false),
    coalesce(e.relevance_score,0),coalesce(e.relevance_score,0),e.created_at,'{}'::text[],coalesce(e.vibe_tags,'{}'::text[])
  from public.gt_daily_events e
  where e.city_key='atlanta' and e.event_date>=current_date and coalesce(e.is_verified,false)
    and e.archived_at is null and e.legacy_quarantined_at is null

  union all

  select
    'eventbrite_events:'||e.id::text,'eventbrite_events',e.id::text,'atlanta',e.event_name,e.event_date,e.event_time,coalesce(e.venue_name,e.venue),e.venue_address,
    e.event_type,null,e.notes,e.eventbrite_url,e.image_url,e.brand_key,e.brand_key,e.eventbrite_url,
    false,(coalesce(e.display_priority,50)<=5),false,(e.brand_key is not null),true,0,
    case when coalesce(e.display_priority,50)<=5 then 8 else 0 end,e.created_at,'{}'::text[],'{}'::text[]
  from public.eventbrite_events e
  where coalesce(e.is_active,false) and e.event_date>=current_date
    and (lower(coalesce(e.city,'')) like '%atlanta%' or lower(coalesce(e.venue_address,'')) like '%atlanta%')
    and e.archived_at is null and e.legacy_quarantined_at is null

  union all

  select
    'gt_sports_games:'||g.id,'gt_sports_games',g.id,g.city_key,
    g.away_team||' at '||g.home_team,g.game_date,g.game_time,g.venue,null,
    'sports','home_game',null,null,coalesce(g.home_logo,g.away_logo),g.league,'official_sports',null,
    false,false,false,false,true,10,6,g.updated_at,'{}'::text[],array[lower(g.league)]::text[]
  from public.gt_sports_games g
  where g.city_key='atlanta' and g.game_date>=current_date and g.status='scheduled'

  union all

  select
    'gt_venue_happenings:'||h.id::text,'gt_venue_happenings',h.id::text,h.city_key,h.happening_name,
    current_date + (((case lower(h.day_of_week)
      when 'sunday' then 0 when 'monday' then 1 when 'tuesday' then 2 when 'wednesday' then 3
      when 'thursday' then 4 when 'friday' then 5 when 'saturday' then 6
      else extract(dow from current_date)::int end) - extract(dow from current_date)::int + 7) % 7),
    coalesce(h.start_time,h.time_slot),v.name,v.address,h.happening_type,null,h.description,h.reservation_link,v.hero_image,v.name,'venue_calendar',v.website,
    (lower(coalesce(h.cover_charge,'')) in ('free','$0','0')),false,false,coalesce(v.is_khg,false),coalesce(v.is_verified,false),
    coalesce(v.quality_score,0),coalesce(h.priority_score,0),h.updated_at,'{}'::text[],coalesce(h.vibe_tags,'{}'::text[])
  from public.gt_venue_happenings h
  join public.gt_venues v on v.id=h.venue_id
  where h.city_key='atlanta' and h.is_active and v.status='active'
), normalized as (
  select u.*,public.gt_category_key_v2(u.raw_type,u.raw_category,u.title) as category_key,
    public.gt_subcategory_key_v2(u.raw_type,u.raw_category,u.title) as subcategory_key
  from unified u
  where u.title is not null and u.event_date is not null
), components as (
  select n.*,
    least(20,(case when n.category_key in ('concerts_live_music','festivals_major_activations','sports_watch') then 8 else 3 end)+
      (case when n.is_featured then 6 else 0 end)+(case when n.is_curated then 4 else 0 end)+(case when n.is_first_party then 2 else 0 end))::numeric as editorial_importance_score,
    least(15,(case when lower(coalesce(n.source_name,'')) ~ '(official|venue|ticketmaster|state farm|fox theatre|tabernacle|center stage|discover atlanta|ajc|atlanta magazine)' then 10 else 5 end)+
      (case when n.is_verified then 5 else 0 end))::numeric as source_authority_score,
    least(15,(case when n.is_featured then 7 else 0 end)+(case when n.image_url is not null and n.image_url<>'' then 3 else 0 end)+
      (case when n.ticket_url is not null and n.ticket_url<>'' then 3 else 0 end)+(case when n.is_first_party then 2 else 0 end))::numeric as demand_engagement_score,
    (case when n.updated_at>=now()-interval '3 days' then 12 when n.updated_at>=now()-interval '7 days' then 10
      when n.updated_at>=now()-interval '30 days' then 7 else 4 end)::numeric as freshness_confidence_score,
    least(10,(case when n.image_url is not null and n.image_url<>'' then 2 else 0 end)+
      (case when n.ticket_url is not null and n.ticket_url<>'' then 2 else 0 end)+
      (case when n.venue_name is not null and n.venue_name<>'' then 2 else 0 end)+
      (case when n.description is not null and length(n.description)>30 then 2 else 0 end)+
      (case when n.event_time is not null and n.event_time<>'' then 1 else 0 end)+
      (case when n.organizer is not null or n.source_name is not null then 1 else 0 end))::numeric as completeness_score,
    10::numeric as local_relevance_score,
    least(8,(case when n.event_date<=current_date+7 then 3 else 1 end)+
      (case when n.momentum_hint>=8 then 3 when n.momentum_hint>=5 then 2 else 0 end)+
      (case when n.is_featured or n.is_curated then 2 else 0 end))::numeric as momentum_velocity_score,
    least(5,(case when n.is_first_party then 5 when n.is_curated then 3 else 0 end))::numeric as exclusivity_scarcity_score,
    0::numeric as personal_affinity_score
  from normalized n
), scored as (
  select c.*,
    least(100,greatest(0,c.editorial_importance_score+c.source_authority_score+c.demand_engagement_score+
      c.freshness_confidence_score+c.completeness_score+c.local_relevance_score+c.momentum_velocity_score+
      c.exclusivity_scarcity_score+c.personal_affinity_score))::numeric(6,2) as good_times_score,
    null::integer as pinned_position,false as is_excluded
  from components c
), deduped as (
  select s.*,
    row_number() over (
      partition by regexp_replace(lower(s.title),'[^a-z0-9]+','','g'),s.event_date,lower(coalesce(s.venue_name,''))
      order by s.good_times_score desc,s.is_verified desc,s.updated_at desc
    ) as duplicate_rank
  from scored s
)
select d.*,
  coalesce(d.pinned_position,101-round(d.good_times_score)::int) as display_priority,
  row_number() over (order by coalesce(d.pinned_position,100000),d.good_times_score desc,d.event_date asc,d.title asc) as rank_order
from deduped d
where d.duplicate_rank=1;

revoke all on public.v_gt_atlanta_ranked_feed_internal from anon,authenticated;

create table if not exists public.gt_public_atlanta_feed (
  event_key text primary key,
  source_table text not null,
  source_id text not null,
  city_key text not null default 'atlanta' check (city_key='atlanta'),
  title text not null,
  event_date date not null,
  event_time text,
  venue_name text,
  raw_type text,
  raw_category text,
  ticket_url text,
  image_url text,
  organizer text,
  display_priority integer not null default 50,
  good_times_score numeric(6,2) not null default 0,
  category_key text not null,
  subcategory_key text,
  is_featured boolean not null default false,
  is_curated boolean not null default false,
  rank_order bigint,
  refreshed_at timestamptz not null default now()
);
create index if not exists idx_gt_public_atlanta_feed_order
  on public.gt_public_atlanta_feed(event_date,display_priority,rank_order);
create index if not exists idx_gt_public_atlanta_feed_category
  on public.gt_public_atlanta_feed(category_key,event_date);
alter table public.gt_public_atlanta_feed enable row level security;
drop policy if exists "gt public atlanta feed read" on public.gt_public_atlanta_feed;
create policy "gt public atlanta feed read" on public.gt_public_atlanta_feed for select to anon,authenticated using (city_key='atlanta');
revoke all on public.gt_public_atlanta_feed from anon,authenticated;
grant select on public.gt_public_atlanta_feed to anon,authenticated;

create or replace view public.v_gt_atlanta_ranked_feed with (security_invoker=true) as
select source_table,source_id,title,event_date,event_time,venue_name,raw_type,raw_category,
  ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,
  is_featured,is_curated,rank_order,event_key,city_key,refreshed_at
from public.gt_public_atlanta_feed;
revoke all on public.v_gt_atlanta_ranked_feed from anon,authenticated;
grant select on public.v_gt_atlanta_ranked_feed to anon,authenticated;

create or replace view public.v_gt_active_banners with (security_invoker=true) as
select b.* from public.gt_banners b
where b.status='active' and b.starts_at<=now() and (b.ends_at is null or b.ends_at>now());
grant select on public.v_gt_active_banners to anon,authenticated;

create or replace view public.v_gt_atlanta_inventory_coverage with (security_invoker=true) as
select c.category_key,c.category_name,c.minimum_upcoming_inventory,c.forward_coverage_days,
  count(f.event_key) filter (where f.event_date<=current_date+c.forward_coverage_days) as upcoming_inventory,
  greatest(0,c.minimum_upcoming_inventory-count(f.event_key) filter (where f.event_date<=current_date+c.forward_coverage_days)) as inventory_gap,
  round(100.0*count(f.event_key) filter (where f.event_date<=current_date+c.forward_coverage_days)/nullif(c.minimum_upcoming_inventory,0),1) as pct_of_target
from public.gt_taxonomy_categories c
left join public.v_gt_atlanta_ranked_feed_internal f on f.category_key=c.category_key
where c.is_active
group by c.category_key,c.category_name,c.minimum_upcoming_inventory,c.forward_coverage_days,c.sort_order
order by c.sort_order;
grant select on public.v_gt_atlanta_inventory_coverage to anon,authenticated;

create or replace view public.v_gt_atlanta_subcategory_coverage with (security_invoker=true) as
select s.category_key,s.subcategory_key,s.subcategory_name,s.minimum_upcoming_inventory,
  count(f.event_key) as upcoming_inventory,
  greatest(0,s.minimum_upcoming_inventory-count(f.event_key)) as inventory_gap,
  round(100.0*count(f.event_key)/nullif(s.minimum_upcoming_inventory,0),1) as pct_of_target
from public.gt_taxonomy_subcategories s
left join public.v_gt_atlanta_ranked_feed_internal f
  on f.subcategory_key=s.subcategory_key and f.event_date<=current_date+90
where s.is_active
group by s.category_key,s.subcategory_key,s.subcategory_name,s.minimum_upcoming_inventory,s.sort_order
order by s.category_key,s.sort_order;
grant select on public.v_gt_atlanta_subcategory_coverage to anon,authenticated;

create or replace view public.v_gt_atlanta_taxonomy_review_queue with (security_invoker=true) as
select event_key,source_table,source_id,title,event_date,event_time,venue_name,raw_type,raw_category,
  source_name,source_url,good_times_score,updated_at
from public.v_gt_atlanta_ranked_feed_internal
where category_key='needs_review'
order by event_date,good_times_score desc,title;
revoke all on public.v_gt_atlanta_taxonomy_review_queue from anon,authenticated;

create or replace view public.v_gt_atlanta_source_health with (security_invoker=true) as
select es.id,es.source_name,es.source_url,es.source_type,es.scrape_method,es.scrape_frequency,es.scrape_priority,
  es.last_scraped_at,es.last_scrape_status,coalesce(es.events_found_last_run,0) as events_found_last_run,
  case
    when not es.is_active then 'disabled'
    when es.last_scraped_at is null then 'configured_not_running'
    when es.last_scrape_status in ('failed','error') then 'failed'
    when es.last_scraped_at<now()-interval '48 hours' then 'stale'
    when coalesce(es.events_found_last_run,0)=0 then 'running_zero_yield'
    else 'producing'
  end as health_status
from public.gt_event_sources es
where lower(es.city)='atlanta';
revoke all on public.v_gt_atlanta_source_health from anon,authenticated;

create or replace function public.gt_refresh_atlanta_display_priority_internal()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_shows int:=0; v_city int:=0; v_sourced int:=0; v_eb int:=0; v_daily int:=0;
begin
  update public.gt_shows s set
    good_times_score=f.good_times_score,display_priority=f.display_priority,
    category_key_v2=f.category_key,subcategory_key_v2=f.subcategory_key
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.source_table='gt_shows' and f.source_id=s.id::text and s.city_key='atlanta';
  get diagnostics v_shows=row_count;

  update public.gt_city_events e set
    good_times_score=f.good_times_score,display_priority=f.display_priority,
    category_key_v2=f.category_key,subcategory_key_v2=f.subcategory_key
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.source_table='gt_city_events' and f.source_id=e.id::text and e.city_key='atlanta';
  get diagnostics v_city=row_count;

  update public.gt_sourced_events e set
    good_times_score=f.good_times_score,category_key_v2=f.category_key,subcategory_key_v2=f.subcategory_key
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.source_table='gt_sourced_events' and f.source_id=e.id::text;
  get diagnostics v_sourced=row_count;

  update public.eventbrite_events e set
    good_times_score=f.good_times_score,display_priority=f.display_priority,
    category_key_v2=f.category_key,subcategory_key_v2=f.subcategory_key
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.source_table='eventbrite_events' and f.source_id=e.id::text;
  get diagnostics v_eb=row_count;

  update public.gt_daily_events e set
    good_times_score=f.good_times_score,category_key_v2=f.category_key,subcategory_key_v2=f.subcategory_key
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.source_table='gt_daily_events' and f.source_id=e.id::text;
  get diagnostics v_daily=row_count;

  update public.gt_shows s set display_priority=coalesce(o.pinned_position,greatest(1,s.display_priority-o.score_boost::int))
  from public.gt_editorial_overrides o
  where o.event_key='gt_shows:'||s.id::text and o.city_key='atlanta' and o.starts_at<=now()
    and (o.ends_at is null or o.ends_at>now()) and not o.is_excluded;

  update public.gt_city_events e set display_priority=coalesce(o.pinned_position,greatest(1,e.display_priority-o.score_boost::int))
  from public.gt_editorial_overrides o
  where o.event_key='gt_city_events:'||e.id::text and o.city_key='atlanta' and o.starts_at<=now()
    and (o.ends_at is null or o.ends_at>now()) and not o.is_excluded;

  update public.eventbrite_events e set display_priority=coalesce(o.pinned_position,greatest(1,e.display_priority-o.score_boost::int))
  from public.gt_editorial_overrides o
  where o.event_key='eventbrite_events:'||e.id::text and o.city_key='atlanta' and o.starts_at<=now()
    and (o.ends_at is null or o.ends_at>now()) and not o.is_excluded;

  return jsonb_build_object('shows',v_shows,'city_events',v_city,'sourced_events',v_sourced,
    'eventbrite',v_eb,'daily_events',v_daily,'refreshed_at',now());
end;
$$;
revoke all on function public.gt_refresh_atlanta_display_priority_internal() from public,anon,authenticated;
grant execute on function public.gt_refresh_atlanta_display_priority_internal() to service_role;

create or replace function public.gt_refresh_atlanta_public_feed()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_upserted integer:=0; v_deleted integer:=0;
begin
  insert into public.gt_public_atlanta_feed(
    event_key,source_table,source_id,city_key,title,event_date,event_time,venue_name,raw_type,raw_category,
    ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,
    is_featured,is_curated,rank_order,refreshed_at
  )
  select event_key,source_table,source_id,'atlanta',title,event_date,event_time,venue_name,raw_type,raw_category,
    ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,
    is_featured,is_curated,rank_order,now()
  from public.v_gt_atlanta_ranked_feed_internal
  where category_key<>'needs_review' and event_date between current_date and current_date+interval '540 days'
  on conflict(event_key) do update set
    source_table=excluded.source_table,source_id=excluded.source_id,title=excluded.title,event_date=excluded.event_date,
    event_time=excluded.event_time,venue_name=excluded.venue_name,raw_type=excluded.raw_type,raw_category=excluded.raw_category,
    ticket_url=excluded.ticket_url,image_url=excluded.image_url,organizer=excluded.organizer,
    display_priority=excluded.display_priority,good_times_score=excluded.good_times_score,
    category_key=excluded.category_key,subcategory_key=excluded.subcategory_key,
    is_featured=excluded.is_featured,is_curated=excluded.is_curated,rank_order=excluded.rank_order,refreshed_at=now();
  get diagnostics v_upserted=row_count;

  delete from public.gt_public_atlanta_feed p
  where not exists (
    select 1 from public.v_gt_atlanta_ranked_feed_internal f
    where f.event_key=p.event_key and f.category_key<>'needs_review'
      and f.event_date between current_date and current_date+interval '540 days'
  );
  get diagnostics v_deleted=row_count;
  return jsonb_build_object('upserted',v_upserted,'deleted',v_deleted,'refreshed_at',now());
end;
$$;
revoke all on function public.gt_refresh_atlanta_public_feed() from public,anon,authenticated;
grant execute on function public.gt_refresh_atlanta_public_feed() to service_role;

create or replace function public.gt_refresh_atlanta_display_priority()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_rank jsonb; v_public jsonb;
begin
  v_rank:=public.gt_refresh_atlanta_display_priority_internal();
  v_public:=public.gt_refresh_atlanta_public_feed();
  return jsonb_build_object('ranking',v_rank,'public_feed',v_public);
end;
$$;
revoke all on function public.gt_refresh_atlanta_display_priority() from public,anon,authenticated;
grant execute on function public.gt_refresh_atlanta_display_priority() to service_role;

select public.gt_refresh_atlanta_display_priority();
