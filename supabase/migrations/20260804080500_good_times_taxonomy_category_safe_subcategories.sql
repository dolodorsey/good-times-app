-- Keep GOOD TIMES subcategories category-safe after the taxonomy stocking upgrade.

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
  category_result text := public.gt_category_key_v2(raw_type, raw_category, title);
begin
  case category_result
    when 'nightlife' then
      if t ~ '(after[- ]?party|official after party)' then return 'after_parties'; end if;
      if t ~ '(hookah)' then return 'hookah_nights'; end if;
      if t ~ '(rooftop)' and t ~ '(night|party|dj|social)' then return 'rooftop_nights'; end if;
      if t ~ '(nightclub|club night)' then return 'nightclubs'; end if;
      if t ~ '(lounge|dine & vibes)' then return 'lounges'; end if;
      if t ~ '(late night|adult bowling|after hours|afterhours|game night|arcade|bowling)' then return 'late_night'; end if;
      return 'weekly_parties';

    when 'concerts_live_music' then
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
      return 'intimate_shows';

    when 'festivals_major_activations' then
      if t ~ '(music festival|hip[- ]?hop.*festival|r&b.*festival|rnb.*festival|jazz.*festival)' then return 'music_festivals'; end if;
      if t ~ '(food festival|food truck festival|wine festival|beer festival|restaurant week festival|tequila.*festival|mezcal.*festival)' then return 'food_festivals'; end if;
      if t ~ '(block party|way day)' then return 'block_parties'; end if;
      if t ~ '(parade)' then return 'parades'; end if;
      if t ~ '(convention|expo|trade show|global conference)' then return 'conventions_expos'; end if;
      if t ~ '(holiday weekend|labor day|memorial day|july 4|independence day|new year)' then return 'holiday_weekends'; end if;
      return 'cultural_festivals';

    when 'comedy_performing_arts' then
      if t ~ '(stand[- ]?up|comedy)' then return 'stand_up'; end if;
      if t ~ '(musical)' then return 'musicals'; end if;
      if t ~ '(dance performance|ballet|dance theatre|dance theater)' then return 'dance_performance'; end if;
      if t ~ '(spoken word|poetry|poet|writers? club|open mic)' then return 'spoken_word'; end if;
      if t ~ '(improv)' then return 'improv'; end if;
      return 'theater';

    when 'arts_museums_culture' then
      if t ~ '(museum)' then return 'museum_programs'; end if;
      if t ~ '(gallery|opening reception)' then return 'gallery_openings'; end if;
      if t ~ '(film|screening|cinema)' then return 'film_screenings'; end if;
      if t ~ '(workshop|paint and sip|paint & sip|creative class|art class)' then return 'creative_workshops'; end if;
      if t ~ '(public art|mural|art walk)' then return 'public_art'; end if;
      return 'exhibitions';

    when 'dining_culinary' then
      if t ~ '(brunch)' then return 'brunch_events'; end if;
      if t ~ '(tasting|wine tasting|educational wine)' then return 'tastings'; end if;
      if t ~ '(chef dinner|supper club|private dinner|dinner series)' then return 'chef_dinners'; end if;
      if t ~ '(restaurant opening|grand opening.*restaurant)' then return 'restaurant_openings'; end if;
      if t ~ '(wine down|happy hour|cocktail|wine &|wine and|paint and sip|paint & sip)' then return 'wine_cocktails'; end if;
      return 'food_popups';

    when 'sports_watch' then
      if t ~ '(atlanta hawks|atlanta falcons|atlanta braves|atlanta united|atlanta dream|home game)' then return 'pro_home_games'; end if;
      if t ~ '(college football|college basketball|ncaa|hbcu game)' then return 'college_sports'; end if;
      if t ~ '(boxing|ufc|mma|wrestling)' then return 'combat_sports'; end if;
      if t ~ '(nascar|motorsport|race day|grand prix)' then return 'racing'; end if;
      return 'watch_parties';

    when 'day_parties_brunch' then
      if t ~ '(pool party)' then return 'pool_parties'; end if;
      if t ~ '(brunch)' then return 'brunch_parties'; end if;
      return 'day_parties';

    when 'family_kids' then
      if t ~ '(family festival|family fun day)' then return 'family_festivals'; end if;
      if t ~ '(youth program|youth workshop|teen program)' then return 'youth_programs'; end if;
      return 'kids_activities';

    when 'community_civic' then
      if t ~ '(makers? market|crafters? market|community market|vendor market|blooms market)' then return 'markets'; end if;
      if t ~ '(charity|nonprofit|fundraiser|benefit|donation drive)' then return 'nonprofit_charity'; end if;
      if t ~ '(town hall|civic|election|public meeting)' then return 'civic_events'; end if;
      return 'neighborhood_events';

    when 'fashion_beauty_shopping' then
      if t ~ '(fashion show|runway)' then return 'fashion_shows'; end if;
      if t ~ '(beauty expo|hair show|makeup expo|beauty activation)' then return 'beauty_expos'; end if;
      if t ~ '(shopping market|vendor market|holiday market)' then return 'shopping_markets'; end if;
      return 'brand_popups';

    when 'wellness_fitness' then
      if t ~ '(5k|10k|marathon|run club|race)' then return 'runs_races'; end if;
      if t ~ '(pilates|yoga|fitness|workout|boot ?camp|self[- ]defense|sweat series)' then return 'fitness_classes'; end if;
      if t ~ '(hike|outdoor adventure|kayak|paddle|trail)' then return 'outdoor_adventure'; end if;
      return 'wellness_events';

    when 'college_alumni' then
      if t ~ '(homecoming)' then return 'homecoming'; end if;
      if t ~ '(alumni)' then return 'alumni_events'; end if;
      if t ~ '(greek|fraternity|sorority|college initiation)' then return 'greek_life'; end if;
      return 'campus_events';

    when 'faith_inspirational' then
      if t ~ '(gospel)' then return 'gospel_events'; end if;
      if t ~ '(speaker|conference|inspirational)' then return 'inspirational_speakers'; end if;
      return 'church_events';

    when 'dating_social' then
      if t ~ '(speed dating|singles?|matchmaking)' then return 'singles_events'; end if;
      if t ~ '(networking)' then return 'networking'; end if;
      if t ~ '(date night|couples)' then return 'date_night'; end if;
      return 'mixers';

    when 'free_things_to_do' then
      if t ~ '(concert|live music)' then return 'free_concerts'; end if;
      if t ~ '(museum|gallery)' then return 'free_museums'; end if;
      if t ~ '(festival|parade)' then return 'free_festivals'; end if;
      return 'free_community';

    when 'vip_exclusive' then
      if t ~ '(invite[- ]only|invitation only|members only)' then return 'invitation_only'; end if;
      if t ~ '(celebrity)' then return 'celebrity_events'; end if;
      if t ~ '(vip table|premium table|table reservation|vip admission)' then return 'premium_tables'; end if;
      return 'limited_access';

    else
      return null;
  end case;
end;
$function$;
