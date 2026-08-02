-- Disable the legacy GOOD TIMES hourly event sync.
-- The job has failed every hour because pg_net is absent, and the deployed
-- function writes a schema that does not match public.events.

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'sync-events-hourly'),
  active := false
);
