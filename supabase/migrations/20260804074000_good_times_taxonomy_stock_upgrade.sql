-- GOOD TIMES taxonomy stocking upgrade.
-- Improves category precedence, subcategory depth, and stock-health visibility.
-- GOOD TIMES only: no BLACK PAGES data is read or modified.

create or replace function public.gt_category_key_v2(
  raw_type text,
  raw_category text,
  title text default null
)
returns text
language plpgsql
stable
set search_path = public
as $function$
declare
  t text := lower(coalesce(title, ''));
  v text := concat_ws(' ', lower(coalesce(raw_type, '')), lower(coalesce(raw_category, '')), lower(coalesce(title, '')));
  type_token text := public.gt_clean_taxonomy_token(raw_type);
  category_token text := public.gt_clean_taxonomy_token(raw_category);
  direct text;
begin
  -- Strong title evidence wins over broad source labels such as nightlife or special_event.
  if t ~ '(pilates|yoga|fitness|wellness|holistic|meditation|self[- ]defense|health day|health fair|longevity|workout|boot ?camp|sound bath|breathwork)' then
    return 'wellness_fitness';
  end if;

  if t ~ '(national night out|community baby shower|community|neighborhood|civic|nonprofit|charity|fundraiser|volunteer|makers? market|crafters?|town hall|community summit|resource fair)' then
    return 'community_civic';
  end if;

  if t ~ '(kids?|children|youth|family day|family fun|parenting|back to school)' then
    return 'family_kids';
  end if;

  if t ~ '(college|university|alumni|homecoming|greek life|fraternity|sorority|campus|college initiation)' then
    return 'college_alumni';
  end if;

  if t ~ '(church|worship|faith|inspirational|revival|prayer|bible|gospel service)' then
    return 'faith_inspirational';
  end if;

  if t ~ '(dating|singles?|speed dating|matchmaking|mixer|networking|meetup)' then
    return 'dating_social';
  end if;

  if t ~ '(invite[- ]only|invitation only|members only|celebrity event|vip admission|vip table|exclusive access|limited access)' then
    return 'vip_exclusive';
  end if;

  if t ~ '(pool party|day party|dayparty|brunch party|sunday brunch party)' then
    return 'day_parties_brunch';
  end if;

  if t ~ '(watch party|game day|home game|atlanta hawks|atlanta falcons|atlanta braves|atlanta united|atlanta dream|nba|nfl|mlb|mls|wnba|college football|college basketball|boxing|ufc|mma|wrestling|motorsport|nascar|race day)' then
    return 'sports_watch';
  end if;

  if t ~ '(music festival|food festival|film festival|cultural festival|heritage festival|block party|parade|convention|expo|festival|404 day|holiday weekend)' then
    return 'festivals_major_activations';
  end if;

  if t ~ '(poetry|spoken word|improv|stand[- ]?up|comedy|theater|theatre|musical|stage play|dance performance|cirque)' then
    return 'comedy_performing_arts';
  end if;

  if t ~ '(museum|gallery|exhibit|exhibition|film screening|art walk|art fair|visual art|creative workshop|public art|mural|writers? club|book reading)' then
    return 'arts_museums_culture';
  end if;

  if t ~ '(karaoke|open mic|live music|concert|tour|jazz|r&b|rnb|soul music|hip[- ]?hop|rap show|edm|electronic music|house music|techno|gospel concert|album release)' then
    return 'concerts_live_music';
  end if;

  if t ~ '(happy hour|wine down|wine tasting|cocktail|chef dinner|supper club|food pop[- ]?up|restaurant opening|restaurant week|taco tuesday|food special|culinary|paint and sip)' then
    return 'dining_culinary';
  end if;

  if t ~ '(after[- ]?party|nightclub|club night|ladies night|late night|hookah|rooftop night|dj night|dance party|nightlife|adult bowling|friday night|saturday night|sunday night)' then
    return 'nightlife';
  end if;

  select a.category_key
    into direct
  from public.gt_category_aliases a
  where a.is_active
    and a.alias_key in (type_token, category_token)
  order by case when a.alias_key = type_token then 0 else 1 end, a.priority
  limit 1;

  if direct is not null then
    return direct;
  end if;

  if v ~ '(concert|live music|jazz|karaoke|open mic|tour|album release|r&b|hip[- ]?hop|rap show)' then return 'concerts_live_music'; end if;
  if v ~ '(festival|block party|parade|convention|expo|404 day|holiday weekend)' then return 'festivals_major_activations'; end if;
  if v ~ '(comedy|stand[- ]?up|theater|theatre|musical|stage play|improv|spoken word|dance performance|cirque|poetry)' then return 'comedy_performing_arts'; end if;
  if v ~ '(museum|gallery|exhibit|exhibition|film screening|art walk|art fair|visual art|creative workshop|public art|mural)' then return 'arts_museums_culture'; end if;
  if v ~ '(brunch|tasting|chef dinner|food pop[- ]?up|restaurant opening|restaurant week|wine|cocktail|culinary|taco tuesday|happy hour)' then return 'dining_culinary'; end if;
  if v ~ '(watch party|home game|nba|nfl|mlb|mls|wnba|college football|boxing|ufc|mma|nascar|race day)' then return 'sports_watch'; end if;
  if v ~ '(day party|pool party|brunch party)' then return 'day_parties_brunch'; end if;
  if v ~ '(family|kids|children|youth)' then return 'family_kids'; end if;
  if v ~ '(community|civic|neighborhood|charity|nonprofit|makers? market|summit)' then return 'community_civic'; end if;
  if v ~ '(fashion|beauty|shopping|retail|designer|runway)' then return 'fashion_beauty_shopping'; end if;
  if v ~ '(wellness|fitness|yoga|pilates|5k|race|hike|outdoor)' then return 'wellness_fitness'; end if;
  if v ~ '(college|university|alumni|homecoming|greek|fraternity|sorority|campus)' then return 'college_alumni'; end if;
  if v ~ '(faith|church|worship|inspirational|prayer)' then return 'faith_inspirational'; end if;
  if v ~ '(dating|singles|mixer|networking|speed dating)' then return 'dating_social'; end if;
  if v ~ '(vip|exclusive|invite only|invitation only|celebrity)' then return 'vip_exclusive'; end if;
  if v ~ '(game night|arcade|bowling|club|lounge|nightlife|party|dj|hookah|late night)' then return 'nightlife'; end if;

  return 'needs_review';
end;
$function$;

create or replace function public.gt_subcategory_key_v2(
  raw_type text,
  raw_category text,
  title text default null
)
returns text
language plpgsql
stable
set search_path = public
as $function$
declare
  t text := lower(coalesce(title, ''));
  v text := concat_ws(' ', lower(coalesce(raw_type, '')), lower(coalesce(raw_category, '')), lower(coalesce(title, '')));
  type_token text := public.gt_clean_taxonomy_token(raw_type);
  category_token text := public.gt_clean_taxonomy_token(raw_category);
  direct text;
  category_result text;
begin
  if t ~ '(after[- ]?party|official after party)' then return 'after_parties'; end if;
  if t ~ '(hookah)' then return 'hookah_nights'; end if;
  if t ~ '(rooftop)' and t ~ '(night|party|dj|social)' then return 'rooftop_nights'; end if;
  if t ~ '(nightclub|club night)' then return 'nightclubs'; end if;
  if t ~ '(lounge|dine & vibes)' then return 'lounges'; end if;
  if t ~ '(late night|adult bowling|after hours|afterhours)' then return 'late_night'; end if;
  if t ~ '(ladies night|friday night|saturday night|sunday night|dj night|dance party|nightlife|signature saturdays|flirt fridays)' then return 'weekly_parties'; end if;

  if t ~ '(state farm arena|mercedes[- ]benz stadium|gas south arena|ameris bank amphitheatre)' and t ~ '(concert|tour|music)' then return 'arena_concerts'; end if;
  if t ~ '(fox theatre|cobb energy|symphony hall|tabernacle)' and t ~ '(concert|tour|music)' then return 'theater_concerts'; end if;
  if t ~ '(hip[- ]?hop|rap)' then return 'hip_hop_rap'; end if;
  if t ~ '(r&b|rnb|soul)' then return 'rnb_soul'; end if;
  if t ~ '(jazz|blues night|live blues)' then return 'jazz'; end if;
  if t ~ '(edm|electronic|house music|techno|dubstep)' then return 'edm_dance'; end if;
  if t ~ '(country)' then return 'country'; end if;
  if t ~ '(gospel concert|gospel music)' then return 'gospel'; end if;
  if t ~ '(karaoke)' then return 'karaoke'; end if;
  if t ~ '(open mic)' then return 'open_mic'; end if;
  if t ~ '(concert|tour|live music|album release|headliner)' then return 'intimate_shows'; end if;

  if t ~ '(music festival)' then return 'music_festivals'; end if;
  if t ~ '(food festival|food truck festival|wine festival|beer festival|restaurant week festival)' then return 'food_festivals'; end if;
  if t ~ '(cultural festival|culture festival|heritage festival|pan african|african festival|caribbean|diaspora|latino|aapi|pride festival|lavender fest)' then return 'cultural_festivals'; end if;
  if t ~ '(block party|way day)' then return 'block_parties'; end if;
  if t ~ '(parade)' then return 'parades'; end if;
  if t ~ '(convention|expo|trade show|global conference)' then return 'conventions_expos'; end if;
  if t ~ '(holiday weekend|labor day|memorial day|july 4|independence day|new year)' then return 'holiday_weekends'; end if;

  if t ~ '(stand[- ]?up|comedy)' then return 'stand_up'; end if;
  if t ~ '(musical)' then return 'musicals'; end if;
  if t ~ '(dance performance|ballet|dance theatre|dance theater)' then return 'dance_performance'; end if;
  if t ~ '(spoken word|poetry|poet|writers? club)' then return 'spoken_word'; end if;
  if t ~ '(improv)' then return 'improv'; end if;
  if t ~ '(theater|theatre|stage play|cirque| play )' then return 'theater'; end if;

  if t ~ '(museum)' then return 'museum_programs'; end if;
  if t ~ '(gallery|opening reception)' then return 'gallery_openings'; end if;
  if t ~ '(film|screening|cinema)' then return 'film_screenings'; end if;
  if t ~ '(workshop|paint and sip|paint & sip|creative class|art class)' then return 'creative_workshops'; end if;
  if t ~ '(public art|mural|art walk)' then return 'public_art'; end if;
  if t ~ '(exhibit|exhibition|art fair|living canvas|art festival|artlanta)' then return 'exhibitions'; end if;

  if t ~ '(pool party)' then return 'pool_parties'; end if;
  if t ~ '(brunch party)' then return 'brunch_parties'; end if;
  if t ~ '(day party|dayparty)' then return 'day_parties'; end if;

  if t ~ '(brunch)' then return 'brunch_events'; end if;
  if t ~ '(tasting|wine tasting|educational wine)' then return 'tastings'; end if;
  if t ~ '(chef dinner|supper club|private dinner|dinner series)' then return 'chef_dinners'; end if;
  if t ~ '(restaurant opening|grand opening.*restaurant)' then return 'restaurant_openings'; end if;
  if t ~ '(wine down|happy hour|cocktail|wine &|wine and)' then return 'wine_cocktails'; end if;
  if t ~ '(food pop[- ]?up|taco tuesday|food special|restaurant week|food event|tacos n tequila)' then return 'food_popups'; end if;

  if t ~ '(atlanta hawks|atlanta falcons|atlanta braves|atlanta united|atlanta dream|home game)' then return 'pro_home_games'; end if;
  if t ~ '(college football|college basketball|ncaa|hbcu game)' then return 'college_sports'; end if;
  if t ~ '(boxing|ufc|mma|wrestling)' then return 'combat_sports'; end if;
  if t ~ '(nascar|motorsport|race day|grand prix)' then return 'racing'; end if;
  if t ~ '(watch party|game day|sports viewing)' then return 'watch_parties'; end if;

  if t ~ '(family festival|family fun day)' then return 'family_festivals'; end if;
  if t ~ '(youth program|youth workshop|teen program)' then return 'youth_programs'; end if;
  if t ~ '(kids?|children|family|back to school)' then return 'kids_activities'; end if;

  if t ~ '(makers? market|crafters? market|community market|vendor market|blooms market)' then return 'markets'; end if;
  if t ~ '(charity|nonprofit|fundraiser|benefit|donation drive)' then return 'nonprofit_charity'; end if;
  if t ~ '(town hall|civic|election|public meeting)' then return 'civic_events'; end if;
  if t ~ '(community|neighborhood|national night out|baby shower|summit|resource fair)' then return 'neighborhood_events'; end if;

  if t ~ '(fashion show|runway)' then return 'fashion_shows'; end if;
  if t ~ '(beauty expo|hair show|makeup expo|beauty activation)' then return 'beauty_expos'; end if;
  if t ~ '(shopping market|vendor market|holiday market)' then return 'shopping_markets'; end if;
  if t ~ '(brand pop[- ]?up|retail pop[- ]?up|store opening)' then return 'brand_popups'; end if;

  if t ~ '(5k|10k|marathon|run club|race)' then return 'runs_races'; end if;
  if t ~ '(pilates|yoga|fitness|workout|boot ?camp|self[- ]defense|sweat series)' then return 'fitness_classes'; end if;
  if t ~ '(hike|outdoor adventure|kayak|paddle|trail)' then return 'outdoor_adventure'; end if;
  if t ~ '(wellness|holistic|meditation|health day|health fair|longevity|sound bath|breathwork)' then return 'wellness_events'; end if;

  if t ~ '(homecoming)' then return 'homecoming'; end if;
  if t ~ '(alumni)' then return 'alumni_events'; end if;
  if t ~ '(greek|fraternity|sorority|college initiation)' then return 'greek_life'; end if;
  if t ~ '(college|university|campus|hbcu)' then return 'campus_events'; end if;

  if t ~ '(gospel)' then return 'gospel_events'; end if;
  if t ~ '(speaker|conference|inspirational)' then return 'inspirational_speakers'; end if;
  if t ~ '(church|worship|faith|revival|prayer)' then return 'church_events'; end if;

  if t ~ '(speed dating|singles?|matchmaking)' then return 'singles_events'; end if;
  if t ~ '(networking)' then return 'networking'; end if;
  if t ~ '(mixer|meetup)' then return 'mixers'; end if;
  if t ~ '(date night|couples)' then return 'date_night'; end if;

  if t ~ '(invite[- ]only|invitation only|members only)' then return 'invitation_only'; end if;
  if t ~ '(celebrity)' then return 'celebrity_events'; end if;
  if t ~ '(vip table|premium table|table reservation|vip admission)' then return 'premium_tables'; end if;
  if t ~ '(exclusive|limited access|private access)' then return 'limited_access'; end if;

  select a.subcategory_key
    into direct
  from public.gt_category_aliases a
  where a.is_active
    and a.alias_key in (type_token, category_token)
    and a.subcategory_key is not null
  order by case when a.alias_key = type_token then 0 else 1 end, a.priority
  limit 1;

  if direct is not null then
    return direct;
  end if;

  category_result := public.gt_category_key_v2(raw_type, raw_category, title);

  return case category_result
    when 'nightlife' then case when v ~ '(late night|game night|arcade|bowling)' then 'late_night' else 'weekly_parties' end
    when 'concerts_live_music' then 'intimate_shows'
    when 'festivals_major_activations' then 'cultural_festivals'
    when 'comedy_performing_arts' then 'theater'
    when 'arts_museums_culture' then 'exhibitions'
    when 'dining_culinary' then 'food_popups'
    when 'sports_watch' then 'watch_parties'
    when 'day_parties_brunch' then 'day_parties'
    when 'family_kids' then 'kids_activities'
    when 'community_civic' then 'neighborhood_events'
    when 'fashion_beauty_shopping' then 'brand_popups'
    when 'wellness_fitness' then 'wellness_events'
    when 'college_alumni' then 'campus_events'
    when 'faith_inspirational' then 'church_events'
    when 'dating_social' then 'mixers'
    when 'free_things_to_do' then 'free_community'
    when 'vip_exclusive' then 'limited_access'
    else null
  end;
end;
$function$;

insert into public.gt_category_aliases(alias_key, category_key, subcategory_key, alias_type, priority, is_active)
values
  ('art', 'arts_museums_culture', 'exhibitions', 'event_type', 10, true),
  ('cultural', 'arts_museums_culture', 'exhibitions', 'event_type', 10, true),
  ('performance', 'comedy_performing_arts', 'theater', 'event_type', 10, true),
  ('community', 'community_civic', 'neighborhood_events', 'event_type', 10, true),
  ('concert', 'concerts_live_music', 'intimate_shows', 'event_type', 10, true),
  ('live_music', 'concerts_live_music', 'intimate_shows', 'event_type', 10, true),
  ('music', 'concerts_live_music', 'intimate_shows', 'event_type', 50, true),
  ('food_event', 'dining_culinary', 'food_popups', 'event_type', 10, true),
  ('food_special', 'dining_culinary', 'food_popups', 'event_type', 10, true),
  ('food', 'dining_culinary', 'food_popups', 'event_type', 50, true),
  ('festival', 'festivals_major_activations', 'cultural_festivals', 'event_type', 10, true),
  ('nightlife', 'nightlife', 'weekly_parties', 'event_type', 10, true),
  ('sports', 'sports_watch', 'watch_parties', 'event_type', 10, true),
  ('family', 'family_kids', 'kids_activities', 'event_type', 10, true),
  ('vip', 'vip_exclusive', 'limited_access', 'event_type', 10, true),
  ('happy_hour', 'dining_culinary', 'wine_cocktails', 'event_type', 5, true),
  ('game_night', 'nightlife', 'late_night', 'event_type', 5, true),
  ('dj_dance', 'nightlife', 'weekly_parties', 'event_category', 5, true),
  ('house', 'nightlife', 'weekly_parties', 'event_category', 5, true),
  ('dubstep', 'nightlife', 'weekly_parties', 'event_category', 5, true)
on conflict(alias_key) do update set
  category_key = excluded.category_key,
  subcategory_key = excluded.subcategory_key,
  alias_type = excluded.alias_type,
  priority = excluded.priority,
  is_active = true;

drop view if exists public.v_gt_atlanta_taxonomy_stock_health;
create view public.v_gt_atlanta_taxonomy_stock_health
with (security_invoker = true)
as
with inventory as (
  select
    f.category_key,
    f.subcategory_key,
    count(*)::integer as upcoming_inventory,
    count(*) filter (where nullif(f.image_url, '') is not null)::integer as with_image,
    count(*) filter (where nullif(f.ticket_url, '') is not null)::integer as with_ticket,
    count(*) filter (where nullif(f.venue_name, '') is not null)::integer as with_venue,
    count(*) filter (where nullif(f.organizer, '') is not null)::integer as with_organizer,
    round(avg(f.good_times_score), 2) as avg_good_times_score,
    min(f.event_date) as nearest_event_date,
    max(f.event_date) as furthest_event_date
  from public.gt_public_atlanta_feed f
  where f.event_date >= current_date
  group by f.category_key, f.subcategory_key
)
select
  c.category_key,
  c.category_name,
  c.sort_order as category_sort_order,
  s.subcategory_key,
  s.subcategory_name,
  s.sort_order as subcategory_sort_order,
  s.minimum_upcoming_inventory,
  coalesce(i.upcoming_inventory, 0) as upcoming_inventory,
  greatest(s.minimum_upcoming_inventory - coalesce(i.upcoming_inventory, 0), 0) as inventory_gap,
  case
    when coalesce(i.upcoming_inventory, 0) = 0 then 'empty'
    when coalesce(i.upcoming_inventory, 0) < greatest(1, ceil(s.minimum_upcoming_inventory * 0.5)::integer) then 'critical'
    when coalesce(i.upcoming_inventory, 0) < s.minimum_upcoming_inventory then 'thin'
    when coalesce(i.upcoming_inventory, 0) < s.minimum_upcoming_inventory * 2 then 'stocked'
    else 'deep'
  end as stock_status,
  coalesce(i.with_image, 0) as with_image,
  coalesce(i.with_ticket, 0) as with_ticket,
  coalesce(i.with_venue, 0) as with_venue,
  coalesce(i.with_organizer, 0) as with_organizer,
  case
    when coalesce(i.upcoming_inventory, 0) = 0 then 0::numeric
    else round(
      100.0 * (
        coalesce(i.with_image, 0) +
        coalesce(i.with_ticket, 0) +
        coalesce(i.with_venue, 0) +
        coalesce(i.with_organizer, 0)
      ) / (i.upcoming_inventory * 4),
      1
    )
  end as information_completeness_pct,
  i.avg_good_times_score,
  i.nearest_event_date,
  i.furthest_event_date,
  (
    greatest(s.minimum_upcoming_inventory - coalesce(i.upcoming_inventory, 0), 0) * 10
    + case when coalesce(i.upcoming_inventory, 0) = 0 then 100 else 0 end
    + case
        when coalesce(i.upcoming_inventory, 0) = 0 then 0
        else greatest(
          0,
          100 - round(
            100.0 * (
              coalesce(i.with_image, 0) +
              coalesce(i.with_ticket, 0) +
              coalesce(i.with_venue, 0) +
              coalesce(i.with_organizer, 0)
            ) / (i.upcoming_inventory * 4)
          )::integer
        )
      end
  )::integer as sourcing_priority
from public.gt_taxonomy_categories c
join public.gt_taxonomy_subcategories s
  on s.category_key = c.category_key
 and s.is_active
left join inventory i
  on i.category_key = c.category_key
 and i.subcategory_key = s.subcategory_key
where c.is_active;

grant select on public.v_gt_atlanta_taxonomy_stock_health to anon, authenticated, service_role;

drop view if exists public.v_gt_atlanta_category_stock_health;
create view public.v_gt_atlanta_category_stock_health
with (security_invoker = true)
as
select
  category_key,
  category_name,
  min(category_sort_order) as category_sort_order,
  sum(minimum_upcoming_inventory)::integer as target_inventory,
  sum(upcoming_inventory)::integer as upcoming_inventory,
  sum(inventory_gap)::integer as inventory_gap,
  count(*) filter (where stock_status = 'empty')::integer as empty_subcategories,
  count(*) filter (where stock_status in ('empty', 'critical', 'thin'))::integer as understocked_subcategories,
  round(avg(information_completeness_pct), 1) as avg_information_completeness_pct,
  max(sourcing_priority)::integer as highest_sourcing_priority
from public.v_gt_atlanta_taxonomy_stock_health
group by category_key, category_name;

grant select on public.v_gt_atlanta_category_stock_health to anon, authenticated, service_role;

comment on view public.v_gt_atlanta_taxonomy_stock_health is
  'GOOD TIMES Atlanta subcategory inventory and information-quality scorecard used by sourcing agents.';
comment on view public.v_gt_atlanta_category_stock_health is
  'GOOD TIMES Atlanta category-level stock summary derived from the canonical event taxonomy.';
