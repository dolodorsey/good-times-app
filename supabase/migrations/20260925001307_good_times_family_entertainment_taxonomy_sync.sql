-- GOOD TIMES Atlanta Family Entertainment taxonomy sync.
-- Production Supabase already contains these additive categories/mappings as of 2026-09-24.
-- This file keeps repository history aligned with the live reviewed-place taxonomy.

insert into public.gt_categories(category_key,category_name,sort_order,is_active)
values
('entertainment','Entertainment',18,true),
('culture','Culture & Museums',19,true),
('experiences','Experiences',20,true),
('outdoor_adventures','Outdoor Adventures',21,true)
on conflict(category_key) do update set
  category_name=excluded.category_name,
  sort_order=excluded.sort_order,
  is_active=true;

insert into public.gt_taxonomy_subcategories(
  subcategory_key,category_key,subcategory_name,description,sort_order,minimum_upcoming_inventory,is_active,created_at,updated_at
)
values
('ent_lounges','entertainment','Lounges','Verified social lounges and late-night lounge destinations. Hookah is a separate evidence-backed feature/cross-list, not assumed for every lounge.',17,5,true,now(),now()),
('ent_golf_games','entertainment','Golf & Driving Games','Verified golf-entertainment and technology-enabled driving-range experiences.',18,1,true,now(),now()),
('ent_gardens','entertainment','Gardens & Scenic Attractions','Verified botanical gardens and scenic ticketed attractions that function as leisure/entertainment destinations.',19,1,true,now(),now()),
('ent_family_play','entertainment','Family Play & Kids','Verified family attractions spanning young children, school-age kids and mixed-age family experiences.',20,12,true,now(),now()),
('ent_driving_experiences','entertainment','Driving Experiences','Verified bookable driving, track, karting and automotive experience destinations.',21,1,true,now(),now()),
('ent_live_theaters','entertainment','Live Theaters','Verified theater and performing-arts destinations with ongoing public programming. Individual productions remain dated event records.',22,3,true,now(),now()),
('ent_observation_rides','entertainment','Skyline & Observation Rides','Verified observation wheels, aerial rides and skyline-view attractions.',23,1,true,now(),now()),
('ent_indoor_playgrounds','entertainment','Indoor Playgrounds','Verified indoor playgrounds and active-play centers designed primarily for children and families.',24,5,true,now(),now()),
('ent_build_create','entertainment','Build & Create','Verified family destinations centered on building, making, imaginative play, art or hands-on creation.',25,3,true,now(),now()),
('ent_sensory_play','entertainment','Sensory Play','Verified family experiences centered on tactile, sensory or interactive play.',26,2,true,now(),now()),
('ent_trampoline_adventure','entertainment','Trampoline & Adventure Parks','Verified trampoline, ninja, climbing and high-energy indoor adventure parks for families.',27,2,true,now(),now()),
('ent_nature_centers','entertainment','Nature Centers','Verified nature centers with trails, wildlife, discovery exhibits and family education experiences.',28,2,true,now(),now()),
('ent_roller_skating','entertainment','Roller Skating','Verified roller skating rinks and family skate centers.',29,1,true,now(),now()),
('ent_trains_transport','entertainment','Trains & Transportation','Verified transportation museums, train experiences and family attractions centered on vehicles, rail or transit history.',30,1,true,now(),now()),
('ent_teens_tweens','entertainment','Teens & Tweens','Verified attractions and activities with current evidence supporting older kids, tweens or teens.',31,8,true,now(),now()),
('ent_parks_playgrounds','entertainment','Parks & Playgrounds','Verified parks, playgrounds and public outdoor spaces with current family-use evidence.',32,4,true,now(),now()),
('ent_free_family','entertainment','Free Family Fun','Verified places and experiences with current evidence of free general access or free family use.',33,4,true,now(),now()),
('ent_water_play','entertainment','Water Play & Splash Pads','Verified splash pads, interactive fountains and family water-play places. Seasonal operation is not implied year-round.',34,4,true,now(),now()),
('ent_science_discovery','entertainment','Science & Discovery','Verified hands-on science, natural history, aviation, technology and discovery attractions with strong family learning experiences.',35,4,true,now(),now())
on conflict(subcategory_key) do update set
  category_key=excluded.category_key,
  subcategory_name=excluded.subcategory_name,
  description=excluded.description,
  sort_order=excluded.sort_order,
  minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,
  is_active=true,
  updated_at=now();

insert into public.gt_category_aliases(alias_key,category_key,subcategory_key,alias_type,priority,is_active,created_at)
values
('lounge','entertainment','ent_lounges','title_keyword',100,true,now()),
('lounges','entertainment','ent_lounges','title_keyword',100,true,now()),
('golf entertainment','entertainment','ent_golf_games','title_keyword',100,true,now()),
('driving range','entertainment','ent_golf_games','title_keyword',95,true,now()),
('botanical garden','entertainment','ent_gardens','title_keyword',100,true,now()),
('kids activities','entertainment','ent_family_play','title_keyword',100,true,now()),
('family activities','entertainment','ent_family_play','title_keyword',100,true,now()),
('driving experience','entertainment','ent_driving_experiences','title_keyword',100,true,now()),
('theater','entertainment','ent_live_theaters','title_keyword',100,true,now()),
('theatre','entertainment','ent_live_theaters','title_keyword',100,true,now()),
('observation wheel','entertainment','ent_observation_rides','title_keyword',100,true,now()),
('ferris wheel','entertainment','ent_observation_rides','title_keyword',100,true,now()),
('indoor playground','entertainment','ent_indoor_playgrounds','title_keyword',100,true,now()),
('kids play','entertainment','ent_indoor_playgrounds','title_keyword',95,true,now()),
('build and create','entertainment','ent_build_create','title_keyword',100,true,now()),
('lego','entertainment','ent_build_create','title_keyword',100,true,now()),
('sensory play','entertainment','ent_sensory_play','title_keyword',100,true,now()),
('slime','entertainment','ent_sensory_play','title_keyword',100,true,now()),
('trampoline park','entertainment','ent_trampoline_adventure','title_keyword',100,true,now()),
('nature center','entertainment','ent_nature_centers','title_keyword',100,true,now()),
('roller skating','entertainment','ent_roller_skating','title_keyword',100,true,now()),
('train museum','entertainment','ent_trains_transport','title_keyword',100,true,now()),
('teens','entertainment','ent_teens_tweens','title_keyword',100,true,now()),
('tweens','entertainment','ent_teens_tweens','title_keyword',100,true,now()),
('parks','entertainment','ent_parks_playgrounds','title_keyword',100,true,now()),
('playgrounds','entertainment','ent_parks_playgrounds','title_keyword',100,true,now()),
('free family fun','entertainment','ent_free_family','title_keyword',100,true,now()),
('splash pad','entertainment','ent_water_play','title_keyword',100,true,now()),
('water play','entertainment','ent_water_play','title_keyword',100,true,now()),
('science museum','entertainment','ent_science_discovery','title_keyword',100,true,now()),
('hands-on science','entertainment','ent_science_discovery','title_keyword',100,true,now())
on conflict(alias_key) do update set
  category_key=excluded.category_key,
  subcategory_key=excluded.subcategory_key,
  alias_type=excluded.alias_type,
  priority=excluded.priority,
  is_active=true;

refresh materialized view public.mv_gt_venue_taxonomy_directory;
select public.gt_refresh_venue_taxonomy_directory_cache();
