-- Emergency rollback only. This restores the previous broad grants and should not
-- be used unless a verified production dependency requires direct browser access.
begin;

grant all privileges on table public.gt_sourced_events to anon, authenticated;
grant all privileges on table public.gt_culture_intake_queue to anon, authenticated;
grant all privileges on table public.gt_event_sources to anon, authenticated;
grant execute on function public.gt_promote_sourced_to_shows(text, boolean, integer)
  to public, anon, authenticated;

commit;
