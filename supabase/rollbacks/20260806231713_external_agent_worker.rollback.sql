do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'good-times-external-agent-worker';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end
$block$;

drop function if exists public.gt_dispatch_external_agent_worker(integer);
drop function if exists public.gt_run_agent_external(text, text);
drop function if exists public.gt_fail_external_work_item(uuid, text, text);
drop function if exists public.gt_complete_external_work_item(uuid, text, jsonb);
drop function if exists public.gt_claim_external_work_item(text);
drop function if exists public.gt_authorize_external_worker_token(text);
drop table if exists public.gt_external_worker_config;

-- The Vault secret is intentionally retained so rollback does not destroy credentials.
