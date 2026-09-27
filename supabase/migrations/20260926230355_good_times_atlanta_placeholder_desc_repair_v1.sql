-- GOOD TIMES data correctness: 61 active Atlanta venues carried the provider placeholder
-- "Auto-sourced from Google Places" as short_desc (source: google_places_worker, a removed
-- provider). Canonical V4 UI already hid it on cards/detail, but it polluted search matching
-- (V4 matchText and ExploreTaxonomyBrowser both index short_desc). No real long_desc exists to
-- substitute, so the field is cleared. Dry-run (rolled back) proved: directory 647->647,
-- subcategory inventory 3274->3274, live cache venues 215->215, placeholders in payload 19->0.
-- Original values preserved in private.gt_placeholder_desc_repair_20260926 for audit/rollback.
create table if not exists private.gt_placeholder_desc_repair_20260926 (
  venue_id uuid primary key, name text, data_source text, original_short_desc text,
  repaired_at timestamptz not null default now());
revoke all on private.gt_placeholder_desc_repair_20260926 from public, anon, authenticated;

insert into private.gt_placeholder_desc_repair_20260926 (venue_id, name, data_source, original_short_desc)
select id, name, data_source, short_desc from public.gt_venues
where city_key='atlanta' and status='active' and short_desc ilike 'auto-sourced from google places%'
on conflict (venue_id) do nothing;

update public.gt_venues v set short_desc = null
from private.gt_placeholder_desc_repair_20260926 r
where v.id = r.venue_id and v.short_desc ilike 'auto-sourced from google places%';

select public.gt_refresh_atlanta_live_inventory_cache_v1();
