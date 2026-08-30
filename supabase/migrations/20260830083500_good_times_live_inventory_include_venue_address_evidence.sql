create or replace function public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer default 480, p_venue_limit integer default 360)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,description,organizer,source,source_url,status,quality_score,freshness_tier,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated,updated_at
      from public.gt_shows
      where city_key=p_city and show_date>=p_service_date and status in ('confirmed','tentative') and image_url is not null and ticket_url is not null
      order by show_date asc,(status='confirmed') desc,is_curated desc,quality_score desc nulls last,updated_at desc,event_name asc
      limit least(greatest(coalesce(p_event_limit,480),1),720)
    ) e),'[]'::jsonb),
    'venues',coalesce((select jsonb_agg(to_jsonb(v)) from (
      select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
      from (
        select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,category_key as venue_category_key,subcategory as venue_subcategory,culture_score,
          row_number() over(
            partition by case
              when hero_image is null or btrim(hero_image)='' then 'venue:'||id::text
              else lower(regexp_replace(split_part(hero_image,'?',1),'/+$',''))
            end
            order by is_culture_pick desc,is_black_owned desc,culture_score desc nulls last,quality_score desc nulls last,name asc
          ) as image_rank
        from public.gt_venues
        where city_key=p_city and status='active' and is_verified=true
      ) ranked
      where image_rank=1
      order by is_culture_pick desc,culture_tier asc nulls last,culture_score desc nulls last,quality_score desc nulls last,name asc
      limit least(greatest(coalesce(p_venue_limit,360),1),540)
    ) v),'[]'::jsonb)
  );
$function$;

comment on function public.gt_public_live_inventory(text,date,integer,integer) is
'Customer live inventory. Keeps all customer-ready verified venues by returning address evidence even when a unique hero image is unavailable, while deduplicating non-null hero media.';
