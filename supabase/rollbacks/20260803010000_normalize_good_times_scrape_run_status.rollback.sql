begin;

drop trigger if exists trg_gt_normalize_scrape_run_status
on public.gt_scrape_runs;

drop function if exists public.gt_normalize_scrape_run_status();

commit;

-- This rollback restores the former behavior where collectors must write only
-- the table's canonical success/error status values themselves.
