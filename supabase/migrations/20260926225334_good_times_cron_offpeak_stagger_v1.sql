-- GOOD TIMES: move GOOD TIMES pg_cron ticks off the :00/:30 pile-up (62-67 simultaneous
-- starts vs max_connections=60, cron.use_background_workers=off, cron.max_running_jobs=32).
-- Cadence is unchanged; only the minute offset moves. Customer inventory cache (*/3) no longer
-- competes with the hour/half-hour peak.
-- Applied to dzlmtvodpyhetvektfuo 2026-09-26 22:53Z. Rollback: supabase/rollbacks/20260926225334_good_times_cron_offpeak_stagger_v1.rollback.sql
do $$
declare
  plan jsonb := '{
    "good-times-atlanta-live-inventory-cache-v1": ["*/3 * * * *",   "1-59/3 * * * *"],
    "khg-armed-good-times-v1":                    ["*/3 * * * *",   "2-59/3 * * * *"],
    "good-times-visual-research-v1":              ["*/15 * * * *",  "12-59/15 * * * *"],
    "gt-atl-coverage-watchdog-v1":                ["*/15 * * * *",  "13-59/15 * * * *"],
    "gt-atl-recommendation-reconciliation-v2":    ["*/15 * * * *",  "14-59/15 * * * *"],
    "gt-atl-structured-feed-dispatch-v2":         ["*/10 * * * *",  "6-59/10 * * * *"],
    "gt-atlanta-venue-recheck-v2":                ["*/30 * * * *",  "11,41 * * * *"],
    "gt-venue-ghl-sync-v1":                       ["*/5 * * * *",   "1-59/5 * * * *"],
    "gt-atl-html-detail-repair-v1":               ["*/5 * * * *",   "2-59/5 * * * *"],
    "gt-atl-marquee-scout-v1":                    ["*/5 * * * *",   "4-59/5 * * * *"]
  }';
  k text; v jsonb; j record; moved int := 0;
begin
  for k, v in select * from jsonb_each(plan) loop
    select jobid, schedule into j from cron.job where jobname = k;
    if not found then raise exception 'cron job % not found', k; end if;
    if j.schedule = v->>1 then continue; end if;                       -- idempotent
    if j.schedule <> v->>0 then raise exception 'job % schedule drifted: % (expected %)', k, j.schedule, v->>0; end if;
    perform cron.alter_job(job_id := j.jobid, schedule := v->>1);
    moved := moved + 1;
  end loop;
  raise notice 'good_times_cron_offpeak_stagger_v1: % jobs moved', moved;
end $$;
