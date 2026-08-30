-- GOOD TIMES content database hardening.
-- Target: KHG/MCP Gateway content database, not the customer-auth database.

-- Generic category/stock art is not allowed to masquerade as venue photography.
update public.gt_venues
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'removed_duplicate_media_url', hero_image,
      'removed_duplicate_media_at', now(),
      'media_remediation_reason', 'generic_or_stock_hero_removed'
    ),
    hero_image = null,
    photo_status = 'needs_unique_media',
    updated_at = now()
where status='active'
  and coalesce(trim(hero_image),'')<>''
  and (
    lower(hero_image) like 'https://images.unsplash.com/%'
    or lower(hero_image) like '%/good-times-backgrounds/gt-cat-%'
    or lower(hero_image) like '%/good-times-backgrounds/event-%'
  );

-- Keep only the strongest active venue record for each exact normalized hero asset.
with ranked as (
  select id,
         row_number() over (
           partition by regexp_replace(lower(trim(hero_image)), '\?.*$', '')
           order by coalesce(is_verified,false) desc,
                    coalesce(quality_score,0) desc,
                    coalesce(google_rating,0) desc,
                    updated_at desc,
                    id
         ) as rn
  from public.gt_venues
  where status='active' and coalesce(trim(hero_image),'')<>''
), duplicates as (
  select id from ranked where rn>1
)
update public.gt_venues v
set metadata = coalesce(v.metadata,'{}'::jsonb) || jsonb_build_object(
      'removed_duplicate_media_url', v.hero_image,
      'removed_duplicate_media_at', now(),
      'media_remediation_reason', 'duplicate_venue_hero_removed'
    ),
    hero_image = null,
    photo_status = 'needs_unique_media',
    updated_at = now()
from duplicates d
where v.id=d.id;

-- Reject future generic or repeated venue hero media at write time.
create or replace function public.gt_enforce_unique_venue_hero()
returns trigger
language plpgsql
as $$
declare
  normalized text;
begin
  if new.status is distinct from 'active' or coalesce(trim(new.hero_image),'')='' then
    return new;
  end if;

  normalized := regexp_replace(lower(trim(new.hero_image)), '\?.*$', '');

  if normalized like 'https://images.unsplash.com/%'
     or normalized like '%/good-times-backgrounds/gt-cat-%'
     or normalized like '%/good-times-backgrounds/event-%' then
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object(
      'blocked_hero_image_url', new.hero_image,
      'blocked_hero_image_at', now(),
      'media_remediation_reason', 'generic_or_stock_hero_blocked'
    );
    new.hero_image := null;
    new.photo_status := 'needs_unique_media';
    return new;
  end if;

  if exists (
    select 1 from public.gt_venues existing
    where existing.id <> new.id
      and existing.status='active'
      and coalesce(trim(existing.hero_image),'')<>''
      and regexp_replace(lower(trim(existing.hero_image)), '\?.*$', '') = normalized
  ) then
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object(
      'blocked_hero_image_url', new.hero_image,
      'blocked_hero_image_at', now(),
      'media_remediation_reason', 'duplicate_venue_hero_blocked'
    );
    new.hero_image := null;
    new.photo_status := 'needs_unique_media';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gt_enforce_unique_venue_hero on public.gt_venues;
create trigger trg_gt_enforce_unique_venue_hero
before insert or update of hero_image,status on public.gt_venues
for each row execute function public.gt_enforce_unique_venue_hero();

create unique index if not exists gt_venues_active_unique_hero_fingerprint_uidx
on public.gt_venues ((regexp_replace(lower(trim(hero_image)), '\?.*$', '')))
where status='active' and coalesce(trim(hero_image),'')<>'';

-- Every missing customer-facing field becomes explicit operating backlog.
insert into public.gt_venue_enrichment_backlog(
  venue_id,missing_fields,requirement_type,priority,status,blocker,next_action,source_options,created_at,updated_at
)
select v.id,
       array_remove(array[
         case when coalesce(trim(v.hero_image),'')='' then 'unique_hero_image' end,
         case when coalesce(trim(v.address),'')='' then 'address' end,
         case when v.latitude is null or v.longitude is null then 'coordinates' end,
         case when coalesce(trim(v.short_desc),'')='' then 'short_desc' end,
         case when coalesce(v.is_verified,false)=false then 'verification' end
       ]::text[],null),
       'customer_ready',
       case when coalesce(trim(v.hero_image),'')='' then 1 when v.latitude is null or v.longitude is null then 2 else 3 end::smallint,
       'open',null,
       'Resolve every missing customer-facing field; unique official/editorial photography is required before hero media can return.',
       array['official_website','google_places','official_instagram','editorial_source']::text[],
       now(),now()
from public.gt_venues v
where v.status='active'
  and (
    coalesce(trim(v.hero_image),'')=''
    or coalesce(trim(v.address),'')=''
    or v.latitude is null or v.longitude is null
    or coalesce(trim(v.short_desc),'')=''
    or coalesce(v.is_verified,false)=false
  )
on conflict (venue_id) do update
set missing_fields=excluded.missing_fields,
    requirement_type=excluded.requirement_type,
    priority=least(public.gt_venue_enrichment_backlog.priority,excluded.priority),
    status=case when public.gt_venue_enrichment_backlog.status='in_progress' then 'in_progress' else 'open' end,
    next_action=excluded.next_action,
    source_options=excluded.source_options,
    updated_at=now();

insert into public.gt_venue_geocoding_queue(venue_id,city_key,venue_name,address,status,attempts,priority,created_at,updated_at)
select v.id,v.city_key,v.name,v.address,'queued',0,90,now(),now()
from public.gt_venues v
where v.status='active'
  and (v.latitude is null or v.longitude is null)
  and coalesce(trim(v.address),'')<>''
on conflict (venue_id) do update
set city_key=excluded.city_key,
    venue_name=excluded.venue_name,
    address=excluded.address,
    status=case when public.gt_venue_geocoding_queue.status='in_progress' then 'in_progress' else 'queued' end,
    priority=greatest(public.gt_venue_geocoding_queue.priority,excluded.priority),
    updated_at=now();

-- Customer live events are deduped by city/date/normalized title/normalized venue.
create or replace view public.v_gt_events_live as
with raw as (
  select 'show'::text event_type,s.id::text event_id,s.city_key,s.event_name title,s.venue_name,s.show_date event_date,s.show_time event_time,s.image_url,s.ticket_url source_url,null::text source,s.freshness_tier,s.updated_at,s.quality_score,s.is_curated,s.is_world_cup,s.holiday_tag
  from public.gt_shows s
  where s.show_date>=current_date and s.freshness_tier<>all(array['expired'::text,'unknown'::text]) and s.image_url is not null and s.image_url<>'' and s.image_url not ilike '%gt-bg%' and s.is_curated=true
  union all
  select 'city_event'::text,e.id::text,e.city_key,e.event_name,e.venue_name,e.start_date,e.start_time,e.image_url,e.source_url,null::text,e.freshness_tier,e.updated_at,e.quality_score,e.is_curated,e.is_world_cup,e.holiday_tag
  from public.gt_city_events e
  where e.start_date>=current_date and e.freshness_tier<>all(array['expired'::text,'unknown'::text]) and e.image_url is not null and e.image_url<>'' and e.image_url not ilike '%gt-bg%' and e.is_curated=true
  union all
  select 'sports'::text,g.id,g.city_key,g.away_team||' @ '||g.home_team,g.venue,g.game_date,g.game_time,g.home_logo,null::text,g.league,g.freshness_tier,g.updated_at,100,true,g.is_world_cup,null::text
  from public.gt_sports_games g
  where g.game_date>=current_date and g.status='scheduled' and g.freshness_tier<>all(array['expired'::text,'unknown'::text])
), ranked as (
  select raw.*,
         row_number() over (
           partition by city_key,event_date,
             regexp_replace(lower(trim(coalesce(title,'')),'[^a-z0-9]+','','g'),
             regexp_replace(lower(trim(coalesce(venue_name,'')),'[^a-z0-9]+','','g')
           order by coalesce(quality_score,0) desc,coalesce(is_curated,false) desc,updated_at desc nulls last,event_id
         ) identity_rank
  from raw
)
select event_type,event_id,city_key,title,venue_name,event_date,event_time,image_url,source_url,source,freshness_tier,updated_at,quality_score,is_curated,is_world_cup,holiday_tag
from ranked where identity_rank=1;
