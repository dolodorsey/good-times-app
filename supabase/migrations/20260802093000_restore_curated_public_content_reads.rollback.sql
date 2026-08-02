begin;

drop policy if exists "Public reads current curated shows" on public.gt_shows;
drop policy if exists "Public reads current curated city events" on public.gt_city_events;
drop policy if exists "Public reads verified daily events" on public.gt_daily_events;
drop policy if exists "Public reads active venue happenings" on public.gt_venue_happenings;
drop policy if exists "Public reads active curated venues" on public.gt_venues;
drop policy if exists "Public reads scheduled sports games" on public.gt_sports_games;

revoke all on table public.gt_shows from anon, authenticated;
revoke all on table public.gt_city_events from anon, authenticated;
revoke all on table public.gt_daily_events from anon, authenticated;
revoke all on table public.gt_venue_happenings from anon, authenticated;
revoke all on table public.gt_venues from anon, authenticated;
revoke all on table public.gt_sports_games from anon, authenticated;

-- Exact pre-migration privilege shape. Restoring these broad privileges is
-- intended only for emergency rollback while RLS still blocks row access.
grant all privileges on table public.gt_shows to anon, authenticated;
grant all privileges on table public.gt_city_events to anon, authenticated;
grant all privileges on table public.gt_daily_events to anon, authenticated;
grant all privileges on table public.gt_venue_happenings to anon, authenticated;
grant all privileges on table public.gt_venues to anon, authenticated;
grant all privileges on table public.gt_sports_games to anon, authenticated;

commit;
