begin;

revoke all on table public.gt_shows from anon, authenticated;
revoke all on table public.gt_city_events from anon, authenticated;
revoke all on table public.gt_daily_events from anon, authenticated;
revoke all on table public.gt_venue_happenings from anon, authenticated;
revoke all on table public.gt_venues from anon, authenticated;
revoke all on table public.gt_sports_games from anon, authenticated;

grant select (
  id, city_key, show_date, show_time, event_name, event_type, genre,
  venue_name, ticket_url, is_free, age_requirement, image_url, description,
  organizer, status, display_priority, is_featured, good_times_score,
  category_key_v2, subcategory_key_v2
) on public.gt_shows to anon, authenticated;

grant select (
  id, city_key, event_name, event_type, description, venue_name,
  start_date, end_date, start_time, ticket_url, organizer, image_url,
  tags, is_free, age_requirement, status, good_times_score,
  display_priority, category_key_v2, subcategory_key_v2
) on public.gt_city_events to anon, authenticated;

grant select (
  id, city_key, event_date, day_of_week, event_name, venue, venue_ig,
  event_type, time_slot, description, source_handle, ticket_url, is_free,
  age_requirement, vibe_tags, relevance_score, is_verified,
  good_times_score, category_key_v2, subcategory_key_v2
) on public.gt_daily_events to anon, authenticated;

grant select (
  id, venue_id, city_key, day_of_week, happening_name, happening_type,
  time_slot, start_time, description, vibe_tags, dress_code,
  cover_charge, reservation_link, is_active, priority_score
) on public.gt_venue_happenings to anon, authenticated;

grant select (
  id, city_key, neighborhood, name, slug, category_key, subcategory,
  address, latitude, longitude, phone, website, instagram_handle,
  short_desc, long_desc, vibe_tags, best_for, best_time, price_range,
  dress_code, reservation_req, hours, featured_item, insider_tip, status,
  is_featured, is_verified, quality_score, photos, hero_image, booking_link,
  booking_platform, awards, people_score, age_range, side_of_town,
  google_rating, google_reviews, hours_summary, best_day, best_time_slot,
  tonight_eligible, tonight_label, tonight_priority, search_tags, tab_tags,
  culture_tier, is_khg, is_friend, is_culture_pick, is_black_owned,
  culture_score, source_count, last_culture_mention, khg_brand_key,
  culture_tags, sourced_from, photo_source, photo_credit
) on public.gt_venues to anon, authenticated;

grant select (
  id, league, home_team, home_abbr, away_team, away_abbr,
  game_date, game_time, venue, city_key, status, home_score, away_score,
  home_logo, away_logo, is_home_game, is_world_cup
) on public.gt_sports_games to anon, authenticated;

drop policy if exists "Public reads current curated shows" on public.gt_shows;
create policy "Public reads current curated shows"
on public.gt_shows for select to anon, authenticated
using (show_date >= current_date and status in ('confirmed','tentative'));

drop policy if exists "Public reads current curated city events" on public.gt_city_events;
create policy "Public reads current curated city events"
on public.gt_city_events for select to anon, authenticated
using (
  start_date >= current_date
  and status in ('active','confirmed')
  and legacy_quarantined_at is null
);

drop policy if exists "Public reads verified daily events" on public.gt_daily_events;
create policy "Public reads verified daily events"
on public.gt_daily_events for select to anon, authenticated
using (
  event_date >= current_date
  and is_verified = true
  and archived_at is null
  and legacy_quarantined_at is null
);

drop policy if exists "Public reads active venue happenings" on public.gt_venue_happenings;
create policy "Public reads active venue happenings"
on public.gt_venue_happenings for select to anon, authenticated
using (is_active = true);

drop policy if exists "Public reads active curated venues" on public.gt_venues;
create policy "Public reads active curated venues"
on public.gt_venues for select to anon, authenticated
using (status = 'active');

drop policy if exists "Public reads scheduled sports games" on public.gt_sports_games;
create policy "Public reads scheduled sports games"
on public.gt_sports_games for select to anon, authenticated
using (game_date >= current_date and status = 'scheduled');

commit;
