-- GOOD TIMES customer-serving live inventory fastpath.
-- Applied to canonical content project dzlmtvodpyhetvektfuo on 2026-08-10 UTC.
-- Keeps nightlife service-date visibility aligned to each city's local clock,
-- serves venue discovery from the refreshed materialized taxonomy directory,
-- and exposes exact category/subcategory counts without loading the whole directory.

create index if not exists mv_gt_venue_taxonomy_directory_gateway_rank_idx
  on public.mv_gt_venue_taxonomy_directory
  (city_key, quality_score desc nulls last, google_rating desc nulls last)
  where hero_image is not null;

grant select on public.mv_gt_venue_taxonomy_directory to anon, authenticated;

create or replace view public.v_gt_venue_taxonomy_directory
with (security_invoker=true) as
select *
from public.mv_gt_venue_taxonomy_directory;

grant select on public.v_gt_venue_taxonomy_directory to anon, authenticated;

create or replace view public.v_gt_venue_taxonomy_counts
with (security_invoker=true) as
select
  city_key,
  category_key,
  subcategory_key,
  count(distinct id)::integer as place_count
from public.mv_gt_venue_taxonomy_directory
group by grouping sets (
  (city_key, category_key),
  (city_key, category_key, subcategory_key)
);

grant select on public.v_gt_venue_taxonomy_counts to anon, authenticated;

alter policy "Public reads current curated shows" on public.gt_shows
using (
  show_date >= (
    case
      when city_key in ('atlanta','charlotte','miami','new_york','washington_dc')
        then ((current_timestamp at time zone 'America/New_York') - interval '4 hours')::date
      when city_key in ('houston','dallas')
        then ((current_timestamp at time zone 'America/Chicago') - interval '4 hours')::date
      when city_key in ('los_angeles','las_vegas')
        then ((current_timestamp at time zone 'America/Los_Angeles') - interval '4 hours')::date
      when city_key in ('phoenix','scottsdale')
        then ((current_timestamp at time zone 'America/Phoenix') - interval '4 hours')::date
      else ((current_timestamp at time zone 'America/New_York') - interval '4 hours')::date
    end
  )
  and status = any (array['confirmed'::text,'tentative'::text])
  and image_url is not null
  and ticket_url is not null
  and nullif(btrim(event_name), '') is not null
  and nullif(btrim(venue_name), '') is not null
);

notify pgrst, 'reload schema';
