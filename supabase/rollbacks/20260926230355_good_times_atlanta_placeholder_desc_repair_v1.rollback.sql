-- Restores the original placeholder text only where short_desc is still null (never overwrites
-- a description written since the repair), then rebuilds the live cache.
update public.gt_venues v set short_desc = r.original_short_desc
from private.gt_placeholder_desc_repair_20260926 r
where v.id = r.venue_id and v.short_desc is null;
select public.gt_refresh_atlanta_live_inventory_cache_v1();
