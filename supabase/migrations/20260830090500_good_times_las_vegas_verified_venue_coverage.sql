drop policy if exists "Public reads active curated venues" on public.gt_venues;

create policy "Public reads active curated venues"
on public.gt_venues
for select
to anon, authenticated
using (
  status='active'
  and is_verified is true
  and coalesce(lower(subcategory),'') not in ('supermarket','grocery_or_supermarket','liquor_store')
  and not (coalesce(lower(category_key),'')='bookings' and coalesce(lower(subcategory),'') in ('supermarket','grocery_or_supermarket'))
  and (
    (
      (
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
        or (nullif(btrim(instagram_handle),'') is not null and lower(btrim(instagram_handle)) <> 'goodtimesworldwide')
      )
    )
    or (
      city_key='las_vegas'
      and coalesce(quality_score,0)>=39
      and latitude is not null
      and longitude is not null
    )
  )
);

comment on policy "Public reads active curated venues" on public.gt_venues is
'Customer-safe public venue inventory. Global markets require quality/location/contact evidence; Las Vegas has a narrow verified-coordinate fallback while its venue enrichment backlog is completed. Unique photography is never required.';
