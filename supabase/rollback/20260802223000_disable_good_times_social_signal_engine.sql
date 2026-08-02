begin;

-- Emergency rollback: stop future processing first. Existing evidence remains
-- intact for audit and can be reprocessed after the defect is corrected.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'gt-instagram-social-signals'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end $$;

revoke all on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
from public, anon, authenticated, service_role;

-- Views are evidence-only and may be safely removed without affecting the live
-- GOOD TIMES venue/event feed.
drop view if exists public.v_gt_unmatched_instagram_handles_review;
drop view if exists public.v_gt_venue_social_signal;

-- Intentionally preserve gt_venue_mentions and gt_source_discoveries rows and
-- preserve additive columns/indexes. Data or schema deletion requires a separate
-- reviewed migration after impact analysis.

commit;

-- Edge Function rollback is operational rather than SQL:
-- 1. Stop the local collector.
-- 2. Deactivate the gt_atlanta_source_internal credential.
-- 3. Roll back or delete gt-social-signal-ingest from the Supabase dashboard.
