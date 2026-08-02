begin;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'gt-source-health-snapshot'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

revoke all on function public.gt_get_source_operations_status(text)
from service_role, postgres;
revoke all on function public.gt_capture_source_health_snapshot(text)
from service_role, postgres;

drop function if exists public.gt_get_source_operations_status(text);
drop function if exists public.gt_capture_source_health_snapshot(text);
drop view if exists gt_private.v_source_operations_latest;
drop table if exists gt_private.source_health_snapshots;
drop schema if exists gt_private;

commit;

-- This rollback removes only the monitoring ledger. It does not modify source
-- records, events, venues, social evidence, rankings, or public-feed rows.
