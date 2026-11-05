-- Rollback for 20261105213000_gt_official_calendar_inventory_v1.
-- Restores editorial-selection-only inventory. Verified rows stay on record but leave the feed via the gate.
-- Data corrections (Falcons kickoff times, wrong-city games, rescheduled R&B Tour row) are facts and are not reverted.

create or replace function public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer default 480, p_venue_limit integer default 360)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,city_key,artist_id,venue_id,event_name,event_type,genre,show_date,show_time,doors_time,end_date,end_time,timezone,venue_name,venue_address,image_url,ticket_url,ticket_price_min,ticket_price_max,is_free,free_status,admission_type,currency,price_basis,is_sold_out,age_requirement,age_requirement_verified_at,description,organizer,source,source_url,status,quality_score,good_times_score,display_priority,is_featured,is_curated,category_key_v2,subcategory_key_v2,freshness_tier,fact_verified_at,valid_until,provider_occurrence_id,updated_at
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

drop function if exists public.gt_is_official_calendar_source(text);
select public.gt_refresh_atlanta_live_inventory_cache_v1();
