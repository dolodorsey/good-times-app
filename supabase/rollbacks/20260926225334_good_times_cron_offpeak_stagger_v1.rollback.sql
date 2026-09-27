-- Restores the pre-2026-09-26 on-peak schedules (reintroduces :00/:30 pile-up). Idempotent.
do $$
declare
  plan jsonb := '{
    "good-times-atlanta-live-inventory-cache-v1": "*/3 * * * *",
    "khg-armed-good-times-v1":                    "*/3 * * * *",
    "good-times-visual-research-v1":              "*/15 * * * *",
    "gt-atl-coverage-watchdog-v1":                "*/15 * * * *",
    "gt-atl-recommendation-reconciliation-v2":    "*/15 * * * *",
    "gt-atl-structured-feed-dispatch-v2":         "*/10 * * * *",
    "gt-atlanta-venue-recheck-v2":                "*/30 * * * *",
    "gt-venue-ghl-sync-v1":                       "*/5 * * * *",
    "gt-atl-html-detail-repair-v1":               "*/5 * * * *",
    "gt-atl-marquee-scout-v1":                    "*/5 * * * *"
  }';
  k text; s text; id bigint;
begin
  for k, s in select key, value #>> '{}' from jsonb_each(plan) loop
    select jobid into id from cron.job where jobname = k;
    if id is not null then perform cron.alter_job(job_id := id, schedule := s); end if;
  end loop;
end $$;
