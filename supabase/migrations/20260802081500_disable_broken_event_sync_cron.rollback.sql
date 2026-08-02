-- Roll back only after pg_net is enabled, credentials are moved to Vault,
-- and sync-events is updated to the current public.events schema.

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'sync-events-hourly'),
  active := true
);
