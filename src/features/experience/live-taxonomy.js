export const CATEGORY_META = {
  nightlife:{icon:'🌙',accent:'#a855f7',scene:'gt-bg-nightlife-district.webp'},
  concerts_live_music:{icon:'🎵',accent:'#ff4d6d',scene:'gt-bg-social-scene.webp'},
  festivals_major_activations:{icon:'🎪',accent:'#ff8a3d',scene:'gt-bg-grand-venue.webp'},
  comedy_performing_arts:{icon:'🎭',accent:'#e5b567',scene:'gt-bg-courtyard-evening.webp'},
  arts_museums_culture:{icon:'🎨',accent:'#f59e0b',scene:'gt-bg-aurora-complex.webp'},
  dining_culinary:{icon:'🍽️',accent:'#fb7185',scene:'gt-bg-cocktail-lounge.webp'},
  sports_watch:{icon:'🏟️',accent:'#34d399',scene:'gt-bg-panoramic-skyline.webp'},
  day_parties_brunch:{icon:'☀️',accent:'#fbbf24',scene:'gt-bg-skyline-terrace.webp'},
  family_kids:{icon:'🎈',accent:'#60a5fa',scene:'gt-bg-future-city.webp'},
  community_civic:{icon:'🤝',accent:'#38bdf8',scene:'gt-bg-waterfront-venue.webp'},
  fashion_beauty_shopping:{icon:'🛍️',accent:'#f472b6',scene:'gt-bg-vip-arrival.webp'},
  wellness_fitness:{icon:'🧘',accent:'#4ade80',scene:'gt-bg-infinity-bar.webp'},
  college_alumni:{icon:'🎓',accent:'#818cf8',scene:'gt-bg-aerial-nightlife.webp'},
  faith_inspirational:{icon:'✨',accent:'#facc15',scene:'gt-bg-cigar-terrace.webp'},
  dating_social:{icon:'💘',accent:'#fb7185',scene:'gt-bg-neon-skyline.webp'},
  free_things_to_do:{icon:'🆓',accent:'#2dd4bf',scene:'gt-bg-rainy-street.webp'},
  vip_exclusive:{icon:'♛',accent:'#d4a853',scene:'gt-bg-penthouse-view.webp'},
  attractions_experiences:{icon:'🎡',accent:'#22d3ee',scene:'gt-bg-spiral-lounge.webp'},
  business_professional:{icon:'💼',accent:'#60a5fa',scene:'gt-bg-valet-entrance.webp'},
  classes_workshops:{icon:'🧠',accent:'#a3e635',scene:'gt-bg-courtyard-evening.webp'},
  creative_creator:{icon:'🎬',accent:'#c084fc',scene:'gt-bg-social-scene.webp'},
  games_interactive:{icon:'🎮',accent:'#22d3ee',scene:'gt-bg-future-city.webp'},
  travel_staycations:{icon:'🧳',accent:'#38bdf8',scene:'gt-bg-panoramic-skyline.webp'},
  black_culture_diaspora:{icon:'🌍',accent:'#f59e0b',scene:'gt-bg-grand-venue.webp'},
  seasonal_holiday:{icon:'🎉',accent:'#f87171',scene:'gt-bg-aurora-complex.webp'},
}

const category = (id,name,description,subs) => ({
  id,name,description,
  ...CATEGORY_META[id],
  count:0,
  image:null,
  subcategories:subs.map(([subId,subName])=>({id:subId,name:subName,count:0,image:null})),
})

export const FALLBACK_TAXONOMY = [
  category('nightlife','Nightlife','Clubs, lounges, after-parties and recurring nightlife.',[
    ['nightclubs','Nightclubs'],['lounges','Lounges'],['weekly_parties','Weekly Parties'],['after_parties','After-Parties'],['hookah_nights','Hookah Nights'],['rooftop_nights','Rooftop Nights'],['late_night','Late Night'],
  ]),
  category('concerts_live_music','Concerts & Live Music','Arena, theater, intimate and recurring live music.',[
    ['arena_concerts','Arena Concerts'],['theater_concerts','Theater Concerts'],['intimate_shows','Intimate Shows'],['hip_hop_rap','Hip-Hop & Rap'],['rnb_soul','R&B & Soul'],['jazz','Jazz'],['edm_dance','EDM & Dance'],['country','Country'],['gospel','Gospel'],['open_mic','Open Mic'],['karaoke','Karaoke'],
  ]),
  category('festivals_major_activations','Festivals & Major Activations','Festivals, conventions, parades and citywide activations.',[
    ['music_festivals','Music Festivals'],['food_festivals','Food Festivals'],['cultural_festivals','Cultural Festivals'],['block_parties','Block Parties'],['conventions_expos','Conventions & Expos'],['parades','Parades'],['holiday_weekends','Holiday Weekends'],
  ]),
  category('comedy_performing_arts','Comedy & Performing Arts','Stand-up, theater, dance, improv and spoken word.',[
    ['stand_up','Stand-Up Comedy'],['theater','Theater & Plays'],['musicals','Musicals'],['dance_performance','Dance Performance'],['spoken_word','Spoken Word'],['improv','Improv'],
  ]),
  category('arts_museums_culture','Arts, Museums & Culture','Museums, galleries, exhibitions, film and cultural programs.',[
    ['museum_programs','Museum Programs'],['gallery_openings','Gallery Openings'],['exhibitions','Exhibitions'],['film_screenings','Film Screenings'],['creative_workshops','Creative Workshops'],['public_art','Public Art'],
  ]),
  category('dining_culinary','Dining & Culinary Events','Brunch, tastings, chef events, pop-ups and beverage experiences.',[
    ['brunch_events','Brunch Events'],['tastings','Tastings'],['chef_dinners','Chef Dinners'],['food_popups','Food Pop-Ups'],['restaurant_openings','Restaurant Openings'],['wine_cocktails','Wine & Cocktails'],
  ]),
  category('sports_watch','Sports & Watch Experiences','Games, matches, watch parties and sports experiences.',[
    ['pro_home_games','Professional Home Games'],['college_sports','College Sports'],['watch_parties','Watch Parties'],['combat_sports','Combat Sports'],['racing','Racing'],
  ]),
  category('day_parties_brunch','Day Parties & Brunch','Daytime social events and brunch activations.',[
    ['day_parties','Day Parties'],['pool_parties','Pool Parties'],['brunch_parties','Brunch Parties'],
  ]),
  category('family_kids','Family & Kids','Family-friendly events and youth activities.',[
    ['family_festivals','Family Festivals'],['kids_activities','Kids Activities'],['youth_programs','Youth Programs'],
  ]),
  category('community_civic','Community & Civic','Neighborhood, civic, nonprofit and community programs.',[
    ['neighborhood_events','Neighborhood Events'],['civic_events','Civic Events'],['nonprofit_charity','Nonprofit & Charity'],['markets','Community Markets'],
  ]),
  category('fashion_beauty_shopping','Fashion, Beauty & Shopping','Fashion shows, beauty activations, markets and retail events.',[
    ['fashion_shows','Fashion Shows'],['beauty_expos','Beauty Expos'],['shopping_markets','Shopping Markets'],['brand_popups','Brand Pop-Ups'],
  ]),
  category('wellness_fitness','Wellness & Fitness','Fitness, wellness, spa, outdoor and healthy lifestyle events.',[
    ['fitness_classes','Fitness Classes'],['runs_races','Runs & Races'],['wellness_events','Wellness Events'],['outdoor_adventure','Outdoor Adventure'],
  ]),
  category('college_alumni','College & Alumni','Campus, alumni, homecoming and collegiate activations.',[
    ['campus_events','Campus Events'],['alumni_events','Alumni Events'],['homecoming','Homecoming'],['greek_life','Greek Life'],
  ]),
  category('faith_inspirational','Faith & Inspirational','Faith, gospel, inspirational and service events.',[
    ['church_events','Church Events'],['gospel_events','Gospel Events'],['inspirational_speakers','Inspirational Speakers'],
  ]),
  category('dating_social','Dating & Social','Singles, mixers, networking and social discovery.',[
    ['singles_events','Singles Events'],['mixers','Mixers'],['networking','Networking'],['date_night','Date Night'],
  ]),
  category('free_things_to_do','Free Things To Do','Events with explicit free-entry evidence or a verified free-event source.',[
    ['free_concerts','Free Concerts'],['free_museums','Free Museums'],['free_festivals','Free Festivals'],['free_community','Free Community Events'],
  ]),
  category('vip_exclusive','VIP & Exclusive','Invitation, celebrity, premium-table and limited-access experiences.',[
    ['invitation_only','Invitation Only'],['celebrity_events','Celebrity Events'],['premium_tables','Premium Tables'],['limited_access','Limited Access'],
  ]),
  category('attractions_experiences','Attractions & Experiences','Immersive attractions, sightseeing, tours, hidden gems and unique city experiences.',[
    ['immersive_experiences','Immersive Experiences'],['tours_sightseeing','Tours & Sightseeing'],['zoos_aquariums','Zoos & Aquariums'],['amusement_theme_parks','Amusement & Theme Parks'],['scenic_views','Scenic Views'],['unique_attractions','Unique Attractions'],['hidden_gems','Hidden Gems'],
  ]),
  category('business_professional','Business, Tech & Professional','Entrepreneurship, career, technology, finance and professional events.',[
    ['entrepreneurship','Entrepreneurship'],['tech_startups','Tech & Startups'],['career_fairs','Career Fairs'],['conferences_summits','Conferences & Summits'],['professional_networking','Professional Networking'],['real_estate_business','Real Estate & Business'],['finance_investing','Finance & Investing'],
  ]),
  category('classes_workshops','Classes, Workshops & Learning','Hands-on classes, workshops and skill-building experiences.',[
    ['cooking_classes','Cooking Classes'],['art_workshops','Art Workshops'],['dance_classes','Dance Classes'],['diy_maker','DIY & Maker'],['professional_development','Professional Development'],['language_culture_classes','Language & Culture Classes'],['health_wellness_classes','Health & Wellness Classes'],
  ]),
  category('creative_creator','Creative, Film & Creator','Creator, film, photography, music-industry and content-production experiences.',[
    ['creator_meetups','Creator Meetups'],['film_tv_industry','Film & TV Industry'],['photography_video','Photography & Video'],['music_industry','Music Industry'],['content_workshops','Content Workshops'],['auditions_castings','Auditions & Castings'],['studio_experiences','Studio Experiences'],
  ]),
  category('games_interactive','Games, Trivia & Interactive','Trivia, gaming, bowling, escape rooms and interactive social play.',[
    ['trivia','Trivia'],['game_nights','Game Nights'],['bowling','Bowling'],['escape_rooms','Escape Rooms'],['esports','Esports'],['tabletop_games','Tabletop Games'],['interactive_sports','Interactive Sports'],
  ]),
  category('travel_staycations','Travel, Hotels & Staycations','Hotels, staycations, day trips, travel events and luxury local escapes.',[
    ['hotel_events','Hotel Events'],['staycations','Staycations'],['day_trips','Day Trips'],['road_trips','Road Trips'],['travel_expos','Travel Expos'],['luxury_stays','Luxury Stays'],['resorts_spas','Resorts & Spas'],
  ]),
  category('black_culture_diaspora','Black Culture & Diaspora','Black arts, business, history, HBCU culture and African-diaspora experiences.',[
    ['black_arts','Black Arts'],['black_business','Black Business'],['black_history','Black History'],['diaspora_festivals','Diaspora Festivals'],['afrobeats_world','Afrobeats & Global Sounds'],['hbcu_culture','HBCU Culture'],['cultural_networking','Cultural Networking'],
  ]),
  category('seasonal_holiday','Seasonal & Holiday','Holiday, seasonal and special-calendar experiences throughout the year.',[
    ['halloween','Halloween'],['thanksgiving','Thanksgiving'],['christmas_holidays','Christmas & Holidays'],['new_years','New Year’s'],['valentines','Valentine’s'],['spring_break','Spring Break'],['summer_season','Summer Season'],
  ]),
]

export const TAXONOMY_TOTALS = {
  categories: FALLBACK_TAXONOMY.length,
  subcategories: FALLBACK_TAXONOMY.reduce((sum,item)=>sum+item.subcategories.length,0),
}

export const GT_SCENE_BASE = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds'
export const categoryScene = category => category?.image || `${GT_SCENE_BASE}/${category?.scene || 'gt-homescreen-atlanta.webp'}`
