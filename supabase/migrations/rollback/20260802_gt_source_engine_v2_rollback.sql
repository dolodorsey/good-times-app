do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='gt-atlanta-eventbrite-refresh'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end $$;

drop function if exists public.gt_run_atlanta_eventbrite_refresh(integer);

alter table public.gt_sourced_events
  drop constraint if exists gt_sourced_events_event_type_check;

alter table public.gt_sourced_events
  add constraint gt_sourced_events_event_type_check
  check (event_type = any (array[
    'party'::text,
    'festival'::text,
    'day_party'::text,
    'brunch'::text,
    'concert'::text,
    'popup'::text,
    'art'::text,
    'food'::text,
    'sports'::text,
    'world_cup'::text,
    'weekly_recurring'::text,
    'cultural'::text,
    'networking'::text,
    'comedy'::text,
    'other'::text,
    'recurring_night'::text,
    'live_music'::text,
    'happy_hour'::text,
    'trivia'::text,
    'karaoke'::text,
    'open_mic'::text,
    'dj_night'::text,
    'general'::text,
    'show'::text,
    'community'::text,
    'food_festival'::text,
    'club_night'::text
  ]));

-- Edge Function rollback is operational: delete or deactivate
-- gt-atlanta-eventbrite-refresh from Supabase after the cron is removed.
-- Event rows are intentionally retained; removing sourced public records is a
-- separate editorial decision and should not be coupled to code rollback.
