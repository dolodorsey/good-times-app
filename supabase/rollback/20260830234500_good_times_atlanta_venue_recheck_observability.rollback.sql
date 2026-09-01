-- Rollback for GOOD TIMES Atlanta venue recheck control plane.

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'gt-atlanta-venue-recheck-v2';
exception when others then
  null;
end $$;

drop function if exists public.gt_run_atlanta_venue_recheck(integer);
drop view if exists public.gt_venue_data_quality_health;
drop view if exists public.gt_atlanta_venue_recheck_queue;
drop table if exists public.gt_venue_recheck_state;
