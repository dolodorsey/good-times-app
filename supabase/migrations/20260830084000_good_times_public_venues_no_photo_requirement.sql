drop policy if exists "Public reads active curated venues" on public.gt_venues;

create policy "Public reads active curated venues"
on public.gt_venues
for select
to anon, authenticated
using (
  status='active'
  and is_verified is true
  and (
    coalesce(quality_score,0)>=55
    or is_culture_pick is true
    or is_black_owned is true
    or hero_image like '%/brand-graphics/good_times/graphics/LOCATION_IMAGES/%'
  )
  and (
    nullif(btrim(address),'') is not null
    or (latitude is not null and longitude is not null)
  )
  and (
    nullif(btrim(website),'') is not null
    or nullif(btrim(phone),'') is not null
    or nullif(btrim(booking_link),'') is not null
    or nullif(btrim(instagram_handle),'') is not null
  )
);

comment on policy "Public reads active curated venues" on public.gt_venues is
'Customer-safe public venue inventory; unique photography is optional and the app must render its branded fallback rather than recycle stock or duplicate media.';
