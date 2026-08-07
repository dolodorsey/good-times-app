-- Temporary bounded acceleration for the verified GOOD TIMES sourcing backlog.
-- Each invocation remains serialized inside the external worker and is capped at four.
do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'good-times-external-agent-worker';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule(
    'good-times-external-agent-worker',
    '* * * * *',
    $cmd$select public.gt_dispatch_external_agent_worker(4);$cmd$
  );
end
$block$;
