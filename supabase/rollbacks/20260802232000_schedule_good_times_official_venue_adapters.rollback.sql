begin;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'gt-atlanta-official-venue-adapters'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

revoke all on function public.gt_run_atlanta_official_venue_adapters(boolean)
from service_role, postgres;
drop function if exists public.gt_run_atlanta_official_venue_adapters(boolean);

commit;

-- The Edge Function may be deleted or left inactive after the scheduler and
-- execute grants are removed. Existing sourced-event evidence is preserved.
