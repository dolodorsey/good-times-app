-- GOOD TIMES Atlanta intelligence foundation
-- Additive and reversible. No legacy source tables are dropped or renamed.

create extension if not exists pgcrypto;

create table if not exists public.gt_taxonomy_categories (
  category_key text primary key,
  category_name text not null,
  description text,
  sort_order integer not null default 100,
  minimum_upcoming_inventory integer not null default 25,
  forward_coverage_days integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_taxonomy_subcategories (
  subcategory_key text primary key,
  category_key text not null references public.gt_taxonomy_categories(category_key) on update cascade on delete restrict,
  subcategory_name text not null,
  description text,
  sort_order integer not null default 100,
  minimum_upcoming_inventory integer not null default 8,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_category_aliases (
  alias_key text primary key,
  category_key text not null references public.gt_taxonomy_categories(category_key) on update cascade on delete restrict,
  subcategory_key text references public.gt_taxonomy_subcategories(subcategory_key) on update cascade on delete restrict,
  alias_type text not null default 'event_type' check (alias_type in ('event_type','event_category','title_keyword','tag')),
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.gt_ranking_weights (
  weight_key text primary key,
  weight_value numeric(6,2) not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_editorial_overrides (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  city_key text not null default 'atlanta',
  score_boost numeric(6,2) not null default 0 check (score_boost between -100 and 100),
  pinned_position integer,
  is_excluded boolean not null default false,
  reason text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gt_editorial_overrides_active
  on public.gt_editorial_overrides(city_key,event_key,starts_at,ends_at);

create table if not exists public.gt_banners (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  headline text not null,
  subheadline text,
  media_type text not null default 'image' check (media_type in ('image','video','animated_webp','carousel','ticker')),
  media_url text,
  poster_url text,
  carousel_items jsonb not null default '[]'::jsonb,
  click_action_type text not null default 'none' check (click_action_type in ('none','url','event','category','subcategory','concierge')),
  click_target text,
  city_key text not null default 'atlanta',
  category_keys text[] not null default '{}',
  subcategory_keys text[] not null default '{}',
  surface_keys text[] not null default array['home_between_sections']::text[],
  audience_tags text[] not null default '{}',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  priority integer not null default 50,
  weight integer not null default 100 check (weight between 1 and 1000),
  frequency_cap integer not null default 3 check (frequency_cap between 1 and 100),
  is_paid boolean not null default false,
  sponsor_name text,
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','expired','archived')),
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gt_banners_eligibility
  on public.gt_banners(city_key,status,starts_at,ends_at,priority);

create table if not exists public.gt_banner_events (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.gt_banners(id) on delete cascade,
  event_type text not null check (event_type in ('impression','viewable_impression','click','dismiss','completion','conversion')),
  city_key text,
  surface_key text,
  session_id text,
  user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_gt_banner_events_banner_time
  on public.gt_banner_events(banner_id,occurred_at desc);

alter table public.gt_taxonomy_categories enable row level security;
alter table public.gt_taxonomy_subcategories enable row level security;
alter table public.gt_category_aliases enable row level security;
alter table public.gt_ranking_weights enable row level security;
alter table public.gt_editorial_overrides enable row level security;
alter table public.gt_banners enable row level security;
alter table public.gt_banner_events enable row level security;

drop policy if exists "gt taxonomy categories public read" on public.gt_taxonomy_categories;
create policy "gt taxonomy categories public read" on public.gt_taxonomy_categories for select to anon,authenticated using (is_active);
drop policy if exists "gt taxonomy subcategories public read" on public.gt_taxonomy_subcategories;
create policy "gt taxonomy subcategories public read" on public.gt_taxonomy_subcategories for select to anon,authenticated using (is_active);
drop policy if exists "gt category aliases public read" on public.gt_category_aliases;
create policy "gt category aliases public read" on public.gt_category_aliases for select to anon,authenticated using (is_active);
drop policy if exists "gt ranking weights public read" on public.gt_ranking_weights;
create policy "gt ranking weights public read" on public.gt_ranking_weights for select to anon,authenticated using (true);
drop policy if exists "gt active banners public read" on public.gt_banners;
create policy "gt active banners public read" on public.gt_banners for select to anon,authenticated
  using (status='active' and starts_at<=now() and (ends_at is null or ends_at>now()));
drop policy if exists "gt banner events anonymous insert" on public.gt_banner_events;
create policy "gt banner events anonymous insert" on public.gt_banner_events for insert to anon,authenticated
  with check (event_type in ('impression','viewable_impression','click','dismiss','completion','conversion'));

revoke all on public.gt_taxonomy_categories,public.gt_taxonomy_subcategories,public.gt_category_aliases,
  public.gt_ranking_weights,public.gt_editorial_overrides,public.gt_banners,public.gt_banner_events from anon,authenticated;
grant select on public.gt_taxonomy_categories,public.gt_taxonomy_subcategories,public.gt_category_aliases,
  public.gt_ranking_weights,public.gt_banners to anon,authenticated;
grant insert on public.gt_banner_events to anon,authenticated;

insert into public.gt_taxonomy_categories(category_key,category_name,description,sort_order,minimum_upcoming_inventory,forward_coverage_days)
values
('nightlife','Nightlife','Clubs, lounges, after-parties and recurring nightlife.',1,100,30),
('concerts_live_music','Concerts & Live Music','Arena, theater, intimate and recurring live music.',2,75,90),
('festivals_major_activations','Festivals & Major Activations','Festivals, conventions, parades and citywide activations.',3,30,180),
('comedy_performing_arts','Comedy & Performing Arts','Stand-up, theater, dance, improv and spoken word.',4,40,60),
('arts_museums_culture','Arts, Museums & Culture','Museums, galleries, exhibitions, film and cultural programs.',5,60,30),
('dining_culinary','Dining & Culinary Events','Brunch, tastings, chef events, pop-ups and beverage experiences.',6,50,30),
('sports_watch','Sports & Watch Experiences','Games, matches, watch parties and sports experiences.',7,40,90),
('day_parties_brunch','Day Parties & Brunch','Daytime social events and brunch activations.',8,40,30),
('family_kids','Family & Kids','Family-friendly events and youth activities.',9,30,45),
('community_civic','Community & Civic','Neighborhood, civic, nonprofit and community programs.',10,35,45),
('fashion_beauty_shopping','Fashion, Beauty & Shopping','Fashion shows, beauty activations, markets and retail events.',11,25,60),
('wellness_fitness','Wellness & Fitness','Fitness, wellness, spa, outdoor and healthy lifestyle events.',12,25,45),
('college_alumni','College & Alumni','Campus, alumni, homecoming and collegiate activations.',13,20,120),
('faith_inspirational','Faith & Inspirational','Faith, gospel, inspirational and service events.',14,20,60),
('dating_social','Dating & Social','Singles, mixers, networking and social discovery.',15,25,30),
('free_things_to_do','Free Things To Do','Verified free entertainment and cultural experiences.',16,30,30),
('vip_exclusive','VIP & Exclusive','Invitation-only, premium, celebrity and limited-access events.',17,15,60),
('needs_review','Needs Review','Unclassified records held for taxonomy review.',999,0,30)
on conflict(category_key) do update set
  category_name=excluded.category_name,description=excluded.description,sort_order=excluded.sort_order,
  minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,forward_coverage_days=excluded.forward_coverage_days,
  is_active=true,updated_at=now();
update public.gt_taxonomy_categories set is_active=false where category_key='needs_review';

insert into public.gt_taxonomy_subcategories(subcategory_key,category_key,subcategory_name,sort_order,minimum_upcoming_inventory)
values
('nightclubs','nightlife','Nightclubs',1,20),('lounges','nightlife','Lounges',2,20),('weekly_parties','nightlife','Weekly Parties',3,20),
('after_parties','nightlife','After-Parties',4,10),('hookah_nights','nightlife','Hookah Nights',5,10),('rooftop_nights','nightlife','Rooftop Nights',6,10),('late_night','nightlife','Late Night',7,10),
('arena_concerts','concerts_live_music','Arena Concerts',1,12),('theater_concerts','concerts_live_music','Theater Concerts',2,12),('intimate_shows','concerts_live_music','Intimate Shows',3,15),
('hip_hop_rap','concerts_live_music','Hip-Hop & Rap',4,12),('rnb_soul','concerts_live_music','R&B & Soul',5,12),('jazz','concerts_live_music','Jazz',6,8),('edm_dance','concerts_live_music','EDM & Dance',7,8),
('country','concerts_live_music','Country',8,8),('gospel','concerts_live_music','Gospel',9,8),('open_mic','concerts_live_music','Open Mic',10,8),('karaoke','concerts_live_music','Karaoke',11,8),
('music_festivals','festivals_major_activations','Music Festivals',1,8),('food_festivals','festivals_major_activations','Food Festivals',2,8),('cultural_festivals','festivals_major_activations','Cultural Festivals',3,8),
('block_parties','festivals_major_activations','Block Parties',4,8),('conventions_expos','festivals_major_activations','Conventions & Expos',5,8),('parades','festivals_major_activations','Parades',6,5),('holiday_weekends','festivals_major_activations','Holiday Weekends',7,8),
('stand_up','comedy_performing_arts','Stand-Up Comedy',1,12),('theater','comedy_performing_arts','Theater & Plays',2,10),('musicals','comedy_performing_arts','Musicals',3,8),
('dance_performance','comedy_performing_arts','Dance Performance',4,8),('spoken_word','comedy_performing_arts','Spoken Word',5,8),('improv','comedy_performing_arts','Improv',6,6),
('museum_programs','arts_museums_culture','Museum Programs',1,12),('gallery_openings','arts_museums_culture','Gallery Openings',2,12),('exhibitions','arts_museums_culture','Exhibitions',3,12),
('film_screenings','arts_museums_culture','Film Screenings',4,10),('creative_workshops','arts_museums_culture','Creative Workshops',5,10),('public_art','arts_museums_culture','Public Art',6,8),
('brunch_events','dining_culinary','Brunch Events',1,12),('tastings','dining_culinary','Tastings',2,10),('chef_dinners','dining_culinary','Chef Dinners',3,8),
('food_popups','dining_culinary','Food Pop-Ups',4,10),('restaurant_openings','dining_culinary','Restaurant Openings',5,8),('wine_cocktails','dining_culinary','Wine & Cocktails',6,10),
('pro_home_games','sports_watch','Professional Home Games',1,15),('college_sports','sports_watch','College Sports',2,10),('watch_parties','sports_watch','Watch Parties',3,15),
('combat_sports','sports_watch','Combat Sports',4,8),('racing','sports_watch','Racing',5,6),
('day_parties','day_parties_brunch','Day Parties',1,18),('pool_parties','day_parties_brunch','Pool Parties',2,8),('brunch_parties','day_parties_brunch','Brunch Parties',3,12),
('family_festivals','family_kids','Family Festivals',1,10),('kids_activities','family_kids','Kids Activities',2,10),('youth_programs','family_kids','Youth Programs',3,8),
('neighborhood_events','community_civic','Neighborhood Events',1,12),('civic_events','community_civic','Civic Events',2,8),('nonprofit_charity','community_civic','Nonprofit & Charity',3,8),('markets','community_civic','Community Markets',4,10),
('fashion_shows','fashion_beauty_shopping','Fashion Shows',1,8),('beauty_expos','fashion_beauty_shopping','Beauty Expos',2,8),('shopping_markets','fashion_beauty_shopping','Shopping Markets',3,10),('brand_popups','fashion_beauty_shopping','Brand Pop-Ups',4,8),
('fitness_classes','wellness_fitness','Fitness Classes',1,10),('runs_races','wellness_fitness','Runs & Races',2,8),('wellness_events','wellness_fitness','Wellness Events',3,10),('outdoor_adventure','wellness_fitness','Outdoor Adventure',4,8),
('campus_events','college_alumni','Campus Events',1,8),('alumni_events','college_alumni','Alumni Events',2,8),('homecoming','college_alumni','Homecoming',3,8),('greek_life','college_alumni','Greek Life',4,8),
('church_events','faith_inspirational','Church Events',1,8),('gospel_events','faith_inspirational','Gospel Events',2,8),('inspirational_speakers','faith_inspirational','Inspirational Speakers',3,8),
('singles_events','dating_social','Singles Events',1,10),('mixers','dating_social','Mixers',2,10),('networking','dating_social','Networking',3,10),('date_night','dating_social','Date Night',4,8),
('free_concerts','free_things_to_do','Free Concerts',1,8),('free_museums','free_things_to_do','Free Museums',2,8),('free_festivals','free_things_to_do','Free Festivals',3,8),('free_community','free_things_to_do','Free Community Events',4,10),
('invitation_only','vip_exclusive','Invitation Only',1,8),('celebrity_events','vip_exclusive','Celebrity Events',2,8),('premium_tables','vip_exclusive','Premium Tables',3,8),('limited_access','vip_exclusive','Limited Access',4,8)
on conflict(subcategory_key) do update set
  category_key=excluded.category_key,subcategory_name=excluded.subcategory_name,sort_order=excluded.sort_order,
  minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,is_active=true,updated_at=now();

insert into public.gt_ranking_weights(weight_key,weight_value,description)
values
('editorial_importance',20,'Cultural importance, major billing and editorial significance.'),
('source_authority',15,'Official source authority and independent corroboration.'),
('demand_engagement',15,'Demand, saves, clicks and momentum proxies.'),
('freshness_confidence',12,'Freshness of the record and confidence in date/status.'),
('completeness',10,'Image, ticket, venue, time, organizer and description completeness.'),
('local_relevance',10,'Atlanta relevance and neighborhood fit.'),
('momentum_velocity',8,'Current momentum and near-term relevance.'),
('exclusivity_scarcity',5,'Exclusivity, scarcity or premium access.'),
('personal_affinity',5,'User affinity; reserved for personalized ranking.')
on conflict(weight_key) do update set weight_value=excluded.weight_value,description=excluded.description,updated_at=now();

insert into public.gt_category_aliases(alias_key,category_key,subcategory_key,alias_type,priority)
values
('concert','concerts_live_music',null,'event_type',1),('live_music','concerts_live_music',null,'event_type',1),('music','concerts_live_music',null,'event_type',5),
('jazz','concerts_live_music','jazz','event_type',1),('karaoke','concerts_live_music','karaoke','event_type',1),('open_mic','concerts_live_music','open_mic','event_type',1),
('festival','festivals_major_activations',null,'event_type',1),('music_festival','festivals_major_activations','music_festivals','event_type',1),('food_festival','festivals_major_activations','food_festivals','event_type',1),
('block_party','festivals_major_activations','block_parties','event_type',1),('parade','festivals_major_activations','parades','event_type',1),('expo','festivals_major_activations','conventions_expos','event_type',2),
('comedy','comedy_performing_arts','stand_up','event_type',1),('stand_up','comedy_performing_arts','stand_up','event_type',1),('play','comedy_performing_arts','theater','event_type',1),
('theater','comedy_performing_arts','theater','event_type',1),('musical','comedy_performing_arts','musicals','event_type',1),('performance','comedy_performing_arts',null,'event_category',1),
('art','arts_museums_culture',null,'event_type',1),('museum','arts_museums_culture','museum_programs','event_type',1),('gallery','arts_museums_culture','gallery_openings','event_type',1),('film','arts_museums_culture','film_screenings','event_type',1),('cultural','arts_museums_culture',null,'event_type',2),
('nightlife','nightlife',null,'event_type',1),('nightclub','nightlife','nightclubs','event_type',1),('lounge','nightlife','lounges','event_type',1),('party','nightlife','weekly_parties','event_type',5),
('dj_night','nightlife','weekly_parties','event_type',1),('after_party','nightlife','after_parties','event_type',1),('hookah','nightlife','hookah_nights','event_type',1),
('recurring_night','nightlife','weekly_parties','event_type',1),('theme_night','nightlife','weekly_parties','event_type',1),
('day_party','day_parties_brunch','day_parties','event_type',1),('pool_party','day_parties_brunch','pool_parties','event_type',1),('brunch','day_parties_brunch','brunch_parties','event_type',1),
('sports','sports_watch',null,'event_type',1),('watch_party','sports_watch','watch_parties','event_type',1),('race','wellness_fitness','runs_races','event_type',1),('5k','wellness_fitness','runs_races','event_type',1),
('food','dining_culinary',null,'event_type',5),('food_special','dining_culinary',null,'event_type',1),('food_event','dining_culinary',null,'event_type',1),
('tasting','dining_culinary','tastings','event_type',1),('wine','dining_culinary','wine_cocktails','event_type',1),
('family','family_kids',null,'event_type',1),('kids','family_kids','kids_activities','event_type',1),('community','community_civic',null,'event_type',1),
('civic','community_civic','civic_events','event_type',1),('charity','community_civic','nonprofit_charity','event_type',1),
('fashion','fashion_beauty_shopping','fashion_shows','event_type',1),('beauty','fashion_beauty_shopping','beauty_expos','event_type',1),('shopping','fashion_beauty_shopping','shopping_markets','event_type',1),
('wellness','wellness_fitness','wellness_events','event_type',1),('fitness','wellness_fitness','fitness_classes','event_type',1),
('college','college_alumni','campus_events','event_type',1),('alumni','college_alumni','alumni_events','event_type',1),('homecoming','college_alumni','homecoming','event_type',1),
('faith','faith_inspirational','church_events','event_type',1),('gospel','faith_inspirational','gospel_events','event_type',1),
('networking','dating_social','networking','event_type',1),('mixer','dating_social','mixers','event_type',1),('singles','dating_social','singles_events','event_type',1),
('vip','vip_exclusive',null,'event_type',1),('exclusive','vip_exclusive','limited_access','event_type',1)
on conflict(alias_key) do update set
  category_key=excluded.category_key,subcategory_key=excluded.subcategory_key,alias_type=excluded.alias_type,
  priority=excluded.priority,is_active=true;

create or replace function public.gt_clean_taxonomy_token(raw_value text)
returns text language sql immutable parallel safe as $$
  select nullif(trim(both '_' from regexp_replace(lower(coalesce(raw_value,'')),'[^a-z0-9]+','_','g')),'');
$$;

create or replace function public.gt_category_key_v2(raw_type text,raw_category text,title text default null)
returns text language plpgsql stable set search_path=public as $$
declare
  v text:=concat_ws(' ',lower(coalesce(raw_type,'')),lower(coalesce(raw_category,'')),lower(coalesce(title,'')));
  type_token text:=gt_clean_taxonomy_token(raw_type);
  category_token text:=gt_clean_taxonomy_token(raw_category);
  direct text;
begin
  select a.category_key into direct from gt_category_aliases a
  where a.is_active and a.alias_key in (type_token,category_token)
  order by case when a.alias_key=type_token then 0 else 1 end,a.priority limit 1;
  if direct is not null then return direct; end if;
  if v similar to '%(concert|live music|jazz|karaoke|open mic|tour|album release|r&b|hip-hop|hip hop|rap show|gospel concert)%' then return 'concerts_live_music'; end if;
  if v similar to '%(festival|block party|parade|convention|expo|404 day|holiday weekend)%' then return 'festivals_major_activations'; end if;
  if v similar to '%(comedy|stand-up|stand up|theater|theatre|musical|stage|improv|spoken word|dance performance|cirque)%' then return 'comedy_performing_arts'; end if;
  if v similar to '%(museum|gallery|exhibit|exhibition|film screening|art walk|art fair|visual art|creative workshop|black expression|living canvas)%' then return 'arts_museums_culture'; end if;
  if v similar to '%(brunch|tasting|chef dinner|food pop-up|food popup|restaurant opening|restaurant week|wine|cocktail|culinary|taco tuesday)%' then return 'dining_culinary'; end if;
  if v similar to '%(game|match|watch party|sports|nba|nfl|mlb|mls|wnba|college football|boxing|ufc)%' then return 'sports_watch'; end if;
  if v similar to '%(day party|pool party|brunch party)%' then return 'day_parties_brunch'; end if;
  if v similar to '%(family|kids|children|youth)%' then return 'family_kids'; end if;
  if v similar to '%(community|civic|neighborhood|charity|nonprofit|market|summit|pride)%' then return 'community_civic'; end if;
  if v similar to '%(fashion|beauty|shopping|retail|designer|runway)%' then return 'fashion_beauty_shopping'; end if;
  if v similar to '%(wellness|fitness|yoga|5k|race|hike|outdoor)%' then return 'wellness_fitness'; end if;
  if v similar to '%(college|university|alumni|homecoming|greek|fraternity|sorority)%' then return 'college_alumni'; end if;
  if v similar to '%(faith|church|worship|inspirational|gospel)%' then return 'faith_inspirational'; end if;
  if v similar to '%(dating|singles|mixer|networking|speed dating)%' then return 'dating_social'; end if;
  if v similar to '%(vip|exclusive|invite only|invitation only|celebrity)%' then return 'vip_exclusive'; end if;
  if v similar to '%(club|lounge|nightlife|party|dj|hookah|late night|friday|saturday|wednesday|thursday)%' then return 'nightlife'; end if;
  return 'needs_review';
end;
$$;

create or replace function public.gt_subcategory_key_v2(raw_type text,raw_category text,title text default null)
returns text language plpgsql stable set search_path=public as $$
declare
  v text:=concat_ws(' ',lower(coalesce(raw_type,'')),lower(coalesce(raw_category,'')),lower(coalesce(title,'')));
  type_token text:=gt_clean_taxonomy_token(raw_type);
  category_token text:=gt_clean_taxonomy_token(raw_category);
  direct text;
begin
  select a.subcategory_key into direct from gt_category_aliases a
  where a.is_active and a.alias_key in (type_token,category_token) and a.subcategory_key is not null
  order by case when a.alias_key=type_token then 0 else 1 end,a.priority limit 1;
  if direct is not null then return direct; end if;
  if v similar to '%(state farm|mercedes-benz|mercedes benz|gas south|ameris bank)%' and v similar to '%(concert|tour|music)%' then return 'arena_concerts'; end if;
  if v similar to '%(hip-hop|hip hop|rap)%' then return 'hip_hop_rap'; end if;
  if v similar to '%(r&b|soul)%' then return 'rnb_soul'; end if;
  if v like '%jazz%' then return 'jazz'; end if;
  if v similar to '%(edm|electronic|house music|techno)%' then return 'edm_dance'; end if;
  if v like '%country%' then return 'country'; end if;
  if v like '%music festival%' then return 'music_festivals'; end if;
  if v similar to '%(food festival|wine festival|beer festival)%' then return 'food_festivals'; end if;
  if v similar to '%(cultural festival|caribbean|diaspora|latino|aapi)%' then return 'cultural_festivals'; end if;
  if v like '%block party%' then return 'block_parties'; end if;
  if v like '%parade%' then return 'parades'; end if;
  if v similar to '%(comedy|stand-up|stand up)%' then return 'stand_up'; end if;
  if v like '%musical%' then return 'musicals'; end if;
  if v similar to '%(theater|theatre|stage|cirque| play )%' then return 'theater'; end if;
  if v like '%museum%' then return 'museum_programs'; end if;
  if v similar to '%(gallery|opening reception)%' then return 'gallery_openings'; end if;
  if v similar to '%(exhibit|exhibition|art fair|living canvas)%' then return 'exhibitions'; end if;
  if v similar to '%(film|screening)%' then return 'film_screenings'; end if;
  if v similar to '%(nightclub|club night)%' then return 'nightclubs'; end if;
  if v like '%lounge%' then return 'lounges'; end if;
  if v similar to '%(after-party|after party)%' then return 'after_parties'; end if;
  if v like '%hookah%' then return 'hookah_nights'; end if;
  if v like '%rooftop%' then return 'rooftop_nights'; end if;
  if v like '%pool party%' then return 'pool_parties'; end if;
  if v like '%day party%' then return 'day_parties'; end if;
  if v like '%brunch%' then return 'brunch_parties'; end if;
  if v like '%watch party%' then return 'watch_parties'; end if;
  if v similar to '%(hawks|falcons|braves|atlanta united|atlanta dream|home game)%' then return 'pro_home_games'; end if;
  if v similar to '%(5k|race|run )%' then return 'runs_races'; end if;
  if v similar to '%(fashion|runway)%' then return 'fashion_shows'; end if;
  if v similar to '%(beauty|hair|makeup)%' then return 'beauty_expos'; end if;
  if v like '%network%' then return 'networking'; end if;
  if v like '%mixer%' then return 'mixers'; end if;
  if v similar to '%(single|speed dating)%' then return 'singles_events'; end if;
  if v similar to '%(concert|tour|live music)%' then return 'intimate_shows'; end if;
  return null;
end;
$$;

alter table public.gt_shows add column if not exists good_times_score numeric(6,2);
alter table public.gt_shows add column if not exists category_key_v2 text;
alter table public.gt_shows add column if not exists subcategory_key_v2 text;
alter table public.gt_city_events add column if not exists good_times_score numeric(6,2);
alter table public.gt_city_events add column if not exists display_priority integer;
alter table public.gt_city_events add column if not exists category_key_v2 text;
alter table public.gt_city_events add column if not exists subcategory_key_v2 text;
alter table public.gt_sourced_events add column if not exists good_times_score numeric(6,2);
alter table public.gt_sourced_events add column if not exists category_key_v2 text;
alter table public.gt_sourced_events add column if not exists subcategory_key_v2 text;
alter table public.eventbrite_events add column if not exists good_times_score numeric(6,2);
alter table public.eventbrite_events add column if not exists category_key_v2 text;
alter table public.eventbrite_events add column if not exists subcategory_key_v2 text;
alter table public.gt_daily_events add column if not exists good_times_score numeric(6,2);
alter table public.gt_daily_events add column if not exists category_key_v2 text;
alter table public.gt_daily_events add column if not exists subcategory_key_v2 text;
