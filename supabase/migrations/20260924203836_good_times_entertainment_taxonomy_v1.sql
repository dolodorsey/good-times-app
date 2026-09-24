-- GOOD TIMES Entertainment discovery taxonomy v1
-- Production data was applied through the Supabase MCP on 2026-09-24.
-- This file keeps repository migration history aligned and is idempotent.

insert into public.gt_taxonomy_categories(
  category_key,category_name,description,sort_order,forward_coverage_days,minimum_upcoming_inventory,is_active,created_at,updated_at
) values (
  'entertainment','Entertainment',
  'Interactive play, bowling, escape rooms, immersive/VR, cinemas, comedy venues, museums, attractions and other social entertainment places. Dated events remain separate event records.',
  6,60,18,true,now(),now()
)
on conflict(category_key) do update set
  category_name=excluded.category_name,description=excluded.description,sort_order=excluded.sort_order,
  forward_coverage_days=excluded.forward_coverage_days,minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,
  is_active=true,updated_at=now();

insert into public.gt_taxonomy_subcategories(
  subcategory_key,category_key,subcategory_name,description,sort_order,minimum_upcoming_inventory,is_active,created_at,updated_at
) values
('ent_social_games','entertainment','Social Games','Bowling, arcade-style play, interactive venues and other social competition. Exact activity comes from the verified venue record.',1,3,true,now(),now()),
('ent_bowling','entertainment','Bowling','Verified bowling destinations and bowling-led social venues.',2,2,true,now(),now()),
('ent_escape_rooms','entertainment','Escape Rooms','Verified escape-room destinations and story-driven puzzle experiences.',3,3,true,now(),now()),
('ent_immersive','entertainment','Immersive Experiences','Verified immersive, projection, interactive and shared-reality experiences.',4,2,true,now(),now()),
('ent_vr','entertainment','VR Experiences','Verified free-roam or location-based virtual-reality experiences.',5,2,true,now(),now()),
('ent_museums','entertainment','Museums & Exhibits','Museums, major exhibitions and interactive cultural attractions that work as entertainment destinations.',6,3,true,now(),now()),
('ent_zoos_aquariums','entertainment','Zoos & Aquariums','Verified animal and aquarium attractions.',7,1,true,now(),now()),
('ent_movies','entertainment','Movies & Cinema','Verified movie theaters and dine-in cinema experiences.',8,1,true,now(),now()),
('ent_comedy_clubs','entertainment','Comedy Clubs','Verified comedy clubs and improv venues. Individual shows remain dated event records.',9,2,true,now(),now()),
('ent_theme_parks','entertainment','Theme Parks & Attractions','Verified theme parks and large entertainment attractions.',10,1,true,now(),now()),
('ent_mini_golf','entertainment','Mini Golf','Verified mini-golf and tech-enabled putting venues.',11,1,true,now(),now()),
('ent_social_darts','entertainment','Darts & Social Sports','Verified darts and social-sport venues.',12,1,true,now(),now()),
('ent_sim_racing','entertainment','Racing & Simulators','Verified social simulator and racing entertainment venues. Real races and watch parties remain separate event records.',13,1,true,now(),now())
on conflict(subcategory_key) do update set
  category_key=excluded.category_key,subcategory_name=excluded.subcategory_name,description=excluded.description,
  sort_order=excluded.sort_order,minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,
  is_active=excluded.is_active,updated_at=now();

delete from public.gt_venue_taxonomy_eligibility where category_key='entertainment';

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
) values
('entertainment','immersive|interactive exhibits','entertainment','ent_immersive',98,'Explicit immersive/interactivity classification on a verified venue.',true,now(),now()),
('experiences','immersive|interactive','entertainment','ent_immersive',96,'Explicit immersive/interactivity classification on a verified experience venue.',true,now(),now()),
('entertainment','escape rooms|escape_room','entertainment','ent_escape_rooms',98,'Explicit escape-room classification on a verified venue.',true,now(),now()),
('entertainment','bowling|bowling_lounge','entertainment','ent_bowling',98,'Explicit bowling classification on a verified venue.',true,now(),now()),
('wine_bar','bowling_lounge','entertainment','ent_bowling',98,'Verified venue explicitly classified as a bowling lounge.',true,now(),now()),
('entertainment','vr|virtual reality','entertainment','ent_vr',98,'Explicit VR classification on a verified venue.',true,now(),now()),
('entertainment','arcades & gaming|gaming lounges|interactive_social|darts & games|mini golf|go karts|bowling|vr|immersive','entertainment','ent_social_games',94,'Explicit social-game or interactive-play classification on a verified venue.',true,now(),now()),
('wine_bar','bowling_lounge','entertainment','ent_social_games',94,'Verified bowling lounge is also eligible for social gaming discovery.',true,now(),now()),
('entertainment','movie_theater|luxury theaters|cinema','entertainment','ent_movies',98,'Explicit movie/cinema classification on a verified venue.',true,now(),now()),
('culture','science & tech museums|art galleries|history museums|museum','entertainment','ent_museums',94,'Explicit museum/gallery classification on a verified cultural venue.',true,now(),now()),
('outdoor_adventures','zoos & aquariums|zoo|aquarium','entertainment','ent_zoos_aquariums',98,'Explicit zoo/aquarium classification on a verified attraction.',true,now(),now()),
('comedy','comedy clubs|comedy_club|improv','entertainment','ent_comedy_clubs',98,'Explicit comedy-club or improv classification on a verified venue.',true,now(),now()),
('entertainment','theme_park|amusement','entertainment','ent_theme_parks',98,'Explicit theme-park/amusement classification on a verified venue.',true,now(),now()),
('entertainment','mini golf','entertainment','ent_mini_golf',98,'Explicit mini-golf classification on a verified venue.',true,now(),now()),
('entertainment','darts & games|darts','entertainment','ent_social_darts',98,'Explicit darts classification on a verified venue.',true,now(),now());

insert into public.gt_category_aliases(alias_key,category_key,subcategory_key,alias_type,priority,is_active,created_at)
values
('entertainment','entertainment',null,'title_keyword',100,true,now()),
('things to do','entertainment',null,'title_keyword',98,true,now()),
('fun things to do','entertainment',null,'title_keyword',98,true,now()),
('games and activities','entertainment','ent_social_games','title_keyword',96,true,now()),
('bowling','entertainment','ent_bowling','title_keyword',100,true,now()),
('escape rooms','entertainment','ent_escape_rooms','title_keyword',100,true,now()),
('vr','entertainment','ent_vr','title_keyword',100,true,now()),
('virtual reality','entertainment','ent_vr','title_keyword',100,true,now()),
('immersive','entertainment','ent_immersive','title_keyword',100,true,now()),
('museums','entertainment','ent_museums','title_keyword',95,true,now()),
('movies','entertainment','ent_movies','title_keyword',95,true,now()),
('sim racing','entertainment','ent_sim_racing','title_keyword',100,true,now()),
('racing simulators','entertainment','ent_sim_racing','title_keyword',100,true,now()),
('f1 arcade','entertainment','ent_sim_racing','title_keyword',100,true,now())
on conflict(alias_key) do update set
  category_key=excluded.category_key,subcategory_key=excluded.subcategory_key,
  alias_type=excluded.alias_type,priority=excluded.priority,is_active=true;

refresh materialized view public.mv_gt_venue_taxonomy_directory;
select public.gt_refresh_venue_taxonomy_directory_cache();
