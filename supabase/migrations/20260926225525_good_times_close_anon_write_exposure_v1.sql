-- GOOD TIMES security: four public GOOD TIMES tables had RLS disabled AND full anon/authenticated
-- grants (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) via the browser-public key. Verified 2026-09-26:
-- anon could read 563 GHL email receipts, GHL sync receipts (ghl_contact_id) and truncate the 402
-- curated venue memberships that feed v_gt_venue_taxonomy_directory.
-- No client code references these tables; all dependent views are owner-rights (postgres) and all
-- referencing functions are SECURITY DEFINER or not anon-executable, so customer reads are unaffected.
-- Rollback: supabase/rollbacks/20260926225525_good_times_close_anon_write_exposure_v1.rollback.sql
revoke all on table public.gt_curated_venue_memberships  from anon, authenticated;
revoke all on table public.gt_place_experiences          from anon, authenticated;
revoke all on table public.gt_venue_ghl_sync_receipts_v1 from anon, authenticated;
revoke all on table public.gtm_ghl_email_receipts_v1     from anon, authenticated;
alter table public.gt_curated_venue_memberships  enable row level security;
alter table public.gt_place_experiences          enable row level security;
alter table public.gt_venue_ghl_sync_receipts_v1 enable row level security;
alter table public.gtm_ghl_email_receipts_v1     enable row level security;
