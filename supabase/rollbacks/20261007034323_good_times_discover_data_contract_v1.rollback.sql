begin;
drop trigger if exists zzz_gt_queue_changed_source_v1 on public.gt_sourced_events;
CREATE OR REPLACE FUNCTION public.gt_promote_sourced_to_shows_internal(p_city_filter text DEFAULT NULL::text, p_dry_run boolean DEFAULT false, p_limit integer DEFAULT 500)
 RETURNS TABLE(promoted_count integer, matched_venue_count integer, unmatched_venue_count integer, skipped_noise_count integer, skipped_city_count integer, cities_touched text[])
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$;
declare
  v_promoted integer:=0;
  v_matched integer:=0;
  v_unmatched integer:=0;
  v_skipped_noise integer:=0;
  v_skipped_city integer:=0;
  v_cities text[]:=array[]::text[];
begin
  drop table if exists pg_temp.gt_promotion_batch;
  create temporary table gt_promotion_batch on commit drop as
  select
    se.id,se.event_name,se.event_date,se.event_time,se.venue_name,se.venue_address,
    se.city,se.event_type,se.event_category,se.description,se.ticket_url,se.image_url,
    se.source_name,se.source_url,se.organizer,se.created_at,
    public.gt_city_normalize(se.city) as canonical_city,
    (
      lower(coalesce(se.event_name,'')) ~ '(webinar|virtual event|online event|zoom event|mlm|pyramid scheme|timeshare presentation|make money fast)'
      or lower(coalesce(se.description,'')) ~ '(virtual-only|online-only|zoom webinar|pyramid scheme|multi-level marketing opportunity|timeshare presentation)'
    ) as is_noise,
    case lower(trim(coalesce(nullif(se.event_type,''),nullif(se.event_category,''),'special_event')))
      when 'concert' then 'concert'
      when 'live_music' then 'concert'
      when 'music' then 'concert'
      when 'comedy' then 'comedy'
      when 'festival' then 'festival'
      when 'food_festival' then 'festival'
      when 'food' then 'festival'
      when 'play' then 'play'
      when 'theater' then 'play'
      when 'theatre' then 'play'
      when 'musical' then 'musical'
      when 'sports' then 'sports'
      when 'sport' then 'sports'
      when 'nightlife' then 'nightlife'
      when 'party' then 'nightlife'
      when 'day_party' then 'nightlife'
      when 'dj_night' then 'nightlife'
      when 'pool_party' then 'nightlife'
      when 'brunch' then 'brunch'
      when 'activation' then 'activation'
      when 'career_fair' then 'career_fair'
      when 'networking' then 'networking'
      when 'workshop' then 'workshop'
      when 'class' then 'class'
      else 'special_event'
    end as canonical_event_type
  from public.gt_sourced_events se
  where se.event_date >= (now() at time zone 'America/New_York')::date
    and coalesce(se.published_to_gt,false)=false
    and coalesce(se.is_verified,false)=true
    and coalesce(se.is_published,false)=true
    and se.legacy_quarantined_at is null
    and se.legacy_quarantine_reason is null
    and nullif(trim(se.event_name),'') is not null
    and (
      p_city_filter is null
      or public.gt_city_normalize(se.city)=public.gt_city_normalize(p_city_filter)
    )
  order by se.event_date,se.event_time nulls last,se.created_at
  limit least(greatest(coalesce(p_limit,500),1),5000);

  create index on gt_promotion_batch(id);
  create index on gt_promotion_batch(canonical_city,event_date,lower(event_name));

  select count(*)::integer into v_skipped_noise
  from gt_promotion_batch where is_noise;

  select count(*)::integer into v_skipped_city
  from gt_promotion_batch
  where not is_noise
    and canonical_city not in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  if p_dry_run then
    select count(*)::integer into v_promoted
    from (
      select distinct on (b.canonical_city,b.event_date,lower(b.event_name)) b.*
      from gt_promotion_batch b
      where not b.is_noise
        and b.canonical_city in (
          'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
          'washington_dc','phoenix','scottsdale','las_vegas'
        )
      order by b.canonical_city,b.event_date,lower(b.event_name),b.created_at
    ) b
    where not exists(
      select 1 from public.gt_shows s
      where s.city_key=b.canonical_city and s.show_date=b.event_date
        and lower(s.event_name)=lower(b.event_name)
    );

    return query select v_promoted,0,0,v_skipped_noise,v_skipped_city,array[]::text[];
    return;
  end if;

  select count(*)::integer into v_matched
  from gt_promotion_batch b
  where not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    )
    and (
      exists(
        select 1 from public.gt_venue_aliases a
        where a.city_key=b.canonical_city and a.status='active'
          and a.normalized_alias_name=public.gt_normalize_venue_text(b.venue_name)
          and (
            coalesce(a.normalized_alias_address,'')=''
            or coalesce(public.gt_normalize_venue_text(b.venue_address),'')=''
            or a.normalized_alias_address=public.gt_normalize_venue_text(b.venue_address)
          )
      )
      or exists(
        select 1 from public.gt_venues v
        where v.city_key=b.canonical_city and v.status='active'
          and public.gt_normalize_venue_text(v.name)=public.gt_normalize_venue_text(b.venue_name)
      )
    );

  select count(*)::integer-v_matched into v_unmatched
  from gt_promotion_batch b
  where not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  with candidates as (
    select distinct on (b.canonical_city,b.event_date,lower(b.event_name))
      b.*
    from gt_promotion_batch b
    where not b.is_noise
      and b.canonical_city in (
        'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
        'washington_dc','phoenix','scottsdale','las_vegas'
      )
    order by b.canonical_city,b.event_date,lower(b.event_name),b.created_at
  ), inserted as (
    insert into public.gt_shows(
      city_key,show_date,show_time,event_name,event_type,venue_name,venue_address,
      ticket_url,image_url,description,organizer,source,source_url,status,
      needs_image_sourcing,freshness_tier,is_curated,created_at,updated_at
    )
    select
      c.canonical_city,c.event_date,c.event_time,c.event_name,c.canonical_event_type,
      c.venue_name,c.venue_address,c.ticket_url,c.image_url,c.description,c.organizer,
      coalesce(c.source_name,'good_times_scout'),c.source_url,'confirmed',
      (c.image_url is null or c.image_url=''),'fresh',false,now(),now()
    from candidates c
    where not exists(
      select 1 from public.gt_shows s
      where s.city_key=c.canonical_city and s.show_date=c.event_date
        and lower(s.event_name)=lower(c.event_name)
    )
    returning city_key
  )
  select count(*)::integer,coalesce(array_agg(distinct city_key),'{}'::text[])
  into v_promoted,v_cities
  from inserted;

  update public.gt_sourced_events se
  set published_to_gt=true,
      is_published=true,
      updated_at=now(),
      raw_data=coalesce(se.raw_data,'{}'::jsonb)||jsonb_build_object(
        'promotion',jsonb_build_object('processed_at',now(),'publisher','set_based_v2')
      )
  from gt_promotion_batch b
  where se.id=b.id
    and not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  update public.gt_sourced_events se
  set published_to_gt=true,
      updated_at=now(),
      raw_data=coalesce(se.raw_data,'{}'::jsonb)||jsonb_build_object(
        'promotion_exclusion',jsonb_build_object(
          'reason',case when b.is_noise then 'actual_noise_or_virtual' else 'unsupported_city' end,
          'processed_at',now()
        )
      )
  from gt_promotion_batch b
  where se.id=b.id
    and (
      b.is_noise
      or b.canonical_city not in (
        'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
        'washington_dc','phoenix','scottsdale','las_vegas'
      )
    );

  return query
  select v_promoted,v_matched,greatest(v_unmatched,0),v_skipped_noise,v_skipped_city,v_cities;
end;
$function$;

CREATE OR REPLACE FUNCTION public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer DEFAULT 480, p_venue_limit integer DEFAULT 360)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$;
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,event_name,event_type,genre,city_key,show_date,show_time,doors_time,venue_name,ticket_url,image_url,description,organizer,source,source_url,status,quality_score,freshness_tier,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated,updated_at
      from public.gt_shows
      where city_key=p_city
        and show_date>=p_service_date
        and (p_city<>'atlanta' or id in(select show_id from public.gt_atlanta_editorial_selection_v1 where selected_at>now()-interval '2 hours'))
        and status in ('confirmed','tentative')
        and coalesce(freshness_tier,'unknown') not in ('expired','unknown')
        and image_url is not null
        and ticket_url is not null
        and lower(coalesce(event_name,'') || ' ' || coalesce(description,'')) !~ '\m(back-to-campus transportation|college shuttle|shuttle event|scheduled motorcoach transportation)\M'
      order by show_date asc,(status='confirmed') desc,is_curated desc,quality_score desc nulls last,updated_at desc,event_name asc
      limit least(greatest(coalesce(p_event_limit,480),1),720)
    ) e),'[]'::jsonb),
    'venues',coalesce((select jsonb_agg(to_jsonb(v)) from (
      select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
      from (
        select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,category_key as venue_category_key,subcategory as venue_subcategory,culture_score,
          row_number() over(
            partition by case when hero_image is null or btrim(hero_image)='' then 'venue:'||id::text else lower(regexp_replace(split_part(hero_image,'?',1),'/+$','')) end
            order by is_culture_pick desc,is_black_owned desc,culture_score desc nulls last,quality_score desc nulls last,name asc
          ) as image_rank
        from public.gt_venues
        where city_key=p_city
          and status='active'
          and is_verified=true
          and verification_status='verified_current'
          and freshness_expires_at>now()
          and coalesce(subcategory,'') not in ('grocery_or_supermarket','supermarket')
      ) ranked where image_rank=1
      order by is_culture_pick desc,culture_tier asc nulls last,culture_score desc nulls last,quality_score desc nulls last,name asc
      limit least(greatest(coalesce(p_venue_limit,360),1),540)
    ) v),'[]'::jsonb)
  );
$function$;

-- Additive columns and private receipts are intentionally retained; no evidence is deleted.
commit;
