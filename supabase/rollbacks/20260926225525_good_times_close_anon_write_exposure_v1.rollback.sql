-- WARNING: re-opens anon read/write/TRUNCATE on CRM receipts and curated memberships.
-- Use only if a proven customer path breaks; prefer adding a narrow policy/grant instead.
alter table public.gt_curated_venue_memberships  disable row level security;
alter table public.gt_place_experiences          disable row level security;
alter table public.gt_venue_ghl_sync_receipts_v1 disable row level security;
alter table public.gtm_ghl_email_receipts_v1     disable row level security;
grant all on table public.gt_curated_venue_memberships  to anon, authenticated;
grant all on table public.gt_place_experiences          to anon, authenticated;
grant all on table public.gt_venue_ghl_sync_receipts_v1 to anon, authenticated;
grant all on table public.gtm_ghl_email_receipts_v1     to anon, authenticated;
