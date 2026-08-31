-- Places and events are different inventory types. A food truck or food hall can
-- host a festival, but the standing place itself is not a festival activation.
update public.gt_venue_taxonomy_eligibility
set is_active = false,
    rationale = rationale || ' Disabled: event-only taxonomy cannot be inferred from a standing place type.',
    updated_at = now()
where is_active
  and category_key = 'festivals_major_activations'
  and subcategory_key = 'food_festivals'
  and venue_category_key in ('food_truck', 'food_hall');

refresh materialized view public.mv_gt_venue_taxonomy_directory;

-- Keep the public directory aligned with the live-inventory contract: verified
-- places at 55+ remain useful without a photo because the app has a branded,
-- category-specific fallback. Location and a current contact/action are required.
create or replace function public.gt_refresh_venue_taxonomy_directory_cache()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_rows integer;
  v_count_rows integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('gt_venue_taxonomy_directory_cache_refresh')) then
    return jsonb_build_object('ok', true, 'busy', true, 'refreshed_at', now());
  end if;

  truncate table public.gt_venue_taxonomy_directory_cache;

  insert into public.gt_venue_taxonomy_directory_cache(
    id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,
    google_rating,google_reviews,quality_score,price_range,vibe_tags,
    category_key,category_name,subcategory,subcategory_key,
    venue_category_key,venue_subcategory,tab_tags,search_tags,culture_tier,
    is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,
    sourced_from,website,phone,booking_link,status,taxonomy_confidence,
    latitude,longitude,address,hours_summary,dress_code
  )
  select
    d.id,d.city_key,d.name,d.neighborhood,d.side_of_town,d.short_desc,d.hero_image,
    d.google_rating,d.google_reviews,d.quality_score,d.price_range,d.vibe_tags,
    d.category_key,d.category_name,d.subcategory,d.subcategory_key,
    d.venue_category_key,d.venue_subcategory,d.tab_tags,d.search_tags,d.culture_tier,
    d.is_khg,d.is_culture_pick,d.is_black_owned,d.culture_tags,d.instagram_handle,
    d.sourced_from,d.website,d.phone,d.booking_link,d.status,d.taxonomy_confidence,
    v.latitude,v.longitude,v.address,v.hours_summary,v.dress_code
  from public.v_gt_venue_taxonomy_directory d
  join public.gt_venues v on v.id = d.id
  where v.status = 'active'
    and v.is_verified is true
    and coalesce(v.quality_score, 0) >= 55
    and (
      nullif(btrim(v.address), '') is not null
      or (v.latitude is not null and v.longitude is not null)
    )
    and coalesce(
      nullif(btrim(v.website), ''),
      nullif(btrim(v.phone), ''),
      nullif(btrim(v.booking_link), ''),
      nullif(btrim(v.instagram_handle), '')
    ) is not null;

  get diagnostics v_rows = row_count;

  truncate table public.gt_venue_taxonomy_count_cache;

  insert into public.gt_venue_taxonomy_count_cache(
    city_key, category_key, subcategory_key, venue_count, refreshed_at
  )
  select city_key, category_key, '', count(distinct id)::integer, now()
  from public.gt_venue_taxonomy_directory_cache
  group by city_key, category_key
  union all
  select city_key, category_key, subcategory_key, count(distinct id)::integer, now()
  from public.gt_venue_taxonomy_directory_cache
  group by city_key, category_key, subcategory_key;

  get diagnostics v_count_rows = row_count;

  analyze public.gt_venue_taxonomy_directory_cache;
  analyze public.gt_venue_taxonomy_count_cache;

  return jsonb_build_object(
    'ok', true,
    'rows', v_rows,
    'count_rows', v_count_rows,
    'refreshed_at', now()
  );
end;
$function$;

select public.gt_refresh_venue_taxonomy_directory_cache();
