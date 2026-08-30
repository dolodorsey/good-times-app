alter table public.gt_venues alter column shake_enabled set default false;

update public.gt_venues
set shake_enabled = (
  status = 'active'
  and is_verified is true
  and category_key in ('restaurant','brunch','food','food_and_dining','food_hall','food_truck','coffee')
);

update public.gt_venues
set
  shake_tags = coalesce((select array_agg(distinct lower(trim(tag)) order by lower(trim(tag))) from unnest(coalesce(shake_tags,'{}'::text[]) || coalesce(vibe_tags,'{}'::text[]) || coalesce(best_for,'{}'::text[]) || coalesce(culture_tags,'{}'::text[]) || array[coalesce(subcategory,''), coalesce(category_key,'')]) tag where nullif(trim(tag),'') is not null), '{}'::text[]),
  amenity_tags = coalesce((select array_agg(distinct tag order by tag) from unnest(coalesce(amenity_tags,'{}'::text[]) || case when reservation_req is true or nullif(booking_link,'') is not null then array['reservations'] else '{}'::text[] end || case when lower(coalesce(array_to_string(vibe_tags,' '),'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%live music%' then array['live_music'] else '{}'::text[] end || case when lower(coalesce(array_to_string(vibe_tags,' '),'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%rooftop%' then array['rooftop'] else '{}'::text[] end || case when lower(coalesce(array_to_string(vibe_tags,' '),'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%patio%' then array['patio'] else '{}'::text[] end || case when lower(coalesce(array_to_string(vibe_tags,' '),'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%hookah%' then array['hookah'] else '{}'::text[] end) tag where nullif(trim(tag),'') is not null), '{}'::text[]),
  dietary_tags = coalesce((select array_agg(distinct tag order by tag) from unnest(coalesce(dietary_tags,'{}'::text[]) || case when lower(coalesce(subcategory,'') || ' ' || coalesce(short_desc,'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%vegan%' then array['vegan'] else '{}'::text[] end || case when lower(coalesce(subcategory,'') || ' ' || coalesce(short_desc,'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%vegetarian%' then array['vegetarian'] else '{}'::text[] end || case when lower(coalesce(subcategory,'') || ' ' || coalesce(short_desc,'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%halal%' then array['halal'] else '{}'::text[] end || case when lower(coalesce(subcategory,'') || ' ' || coalesce(short_desc,'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%gluten free%' or lower(coalesce(subcategory,'') || ' ' || coalesce(short_desc,'') || ' ' || coalesce(array_to_string(search_tags,' '),'')) like '%gluten-free%' then array['gluten_free'] else '{}'::text[] end) tag where nullif(trim(tag),'') is not null), '{}'::text[]),
  ownership_tags = coalesce((select array_agg(distinct tag order by tag) from unnest(coalesce(ownership_tags,'{}'::text[]) || case when is_black_owned is true then array['black_owned'] else '{}'::text[] end) tag where nullif(trim(tag),'') is not null), '{}'::text[]),
  shake_weight = least(1.750, greatest(0.500, 1.000 + case when is_culture_pick is true then 0.250 else 0 end + case when is_featured is true then 0.150 else 0 end + case when coalesce(google_rating,0) >= 4.7 then 0.150 else 0 end + case when coalesce(quality_score,0) >= 85 then 0.150 else 0 end))
where shake_enabled is true;

create index if not exists gt_venues_shake_eligible_rank_idx on public.gt_venues (city_key, quality_score desc, culture_score desc) where status='active' and is_verified is true and shake_enabled is true;
