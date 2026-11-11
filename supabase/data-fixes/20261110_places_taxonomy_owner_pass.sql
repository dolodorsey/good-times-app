-- GOOD TIMES · Places taxonomy owner pass (2026-11-10)
-- Owner notes: "Wellness showing Ponce City Market", "shopping subcategories bad (fashion-show venues)",
-- "family lacking", "Attractions not full", "Places vs Entertainment confused".
-- Data-only (DML) on the content project; applied with execute_sql. Event subcategories are left untouched —
-- only the *venue* eligibility rules change, and the Places browser hides subcategories with no places.

begin;

-- 1) Place-shaped subcategories (additive; existing keys untouched).
insert into public.gt_taxonomy_subcategories(subcategory_key,category_key,subcategory_name,description,sort_order,minimum_upcoming_inventory,is_active) values
 ('shop_districts','fashion_beauty_shopping','Malls & Shopping Districts','Malls, luxury centers and walkable shopping districts',10,0,true),
 ('shop_boutiques','fashion_beauty_shopping','Boutiques & Designers','Independent boutiques, menswear, womenswear and designers',11,0,true),
 ('shop_sneakers','fashion_beauty_shopping','Sneakers & Streetwear','Sneaker boutiques and streetwear',12,0,true),
 ('shop_vintage','fashion_beauty_shopping','Vintage, Thrift & Antiques','Vintage, thrift, antique and flea markets',13,0,true),
 ('shop_markets','fashion_beauty_shopping','Markets & Food Halls','Market halls and food halls with shops',14,0,true),
 ('shop_books_gifts','fashion_beauty_shopping','Books, Gifts & Jewelry','Bookshops, gift shops and jewelers',15,0,true),
 ('shop_beauty','fashion_beauty_shopping','Beauty & Grooming','Facials, nails, barbers and grooming',16,0,true),
 ('well_spas','wellness_fitness','Spas & Saunas','Day spas, Korean spas and saunas',10,0,true),
 ('well_yoga','wellness_fitness','Yoga & Meditation','Yoga studios and meditation centers',11,0,true),
 ('well_trails','wellness_fitness','Trails & Greenways','Hiking trails, greenways and cycling routes',12,0,true),
 ('well_parks','wellness_fitness','Parks & Gardens','Parks, gardens and nature centers for a reset',13,0,true),
 ('fam_museums','family_kids','Museums & Learning','Kid-friendly museums, aquariums and science centers',10,0,true),
 ('fam_play','family_kids','Indoor Play & Trampolines','Indoor playgrounds, trampoline parks and sensory play',11,0,true),
 ('fam_fun_centers','family_kids','Family Fun Centers','Skating, karting, mini golf and multi-attraction centers',12,0,true),
 ('fam_outdoors','family_kids','Parks, Zoos & Nature','Zoos, parks, playgrounds and nature centers',13,0,true),
 ('attr_landmarks','attractions_experiences','Landmarks & History','Historic sites, civil rights landmarks and icons',8,0,true),
 ('attr_museums','attractions_experiences','Museums & Galleries','Art, history and science museums and galleries',9,0,true),
 ('attr_districts','attractions_experiences','Destination Districts','Mixed-use districts worth the trip',10,0,true)
on conflict (subcategory_key) do update set subcategory_name=excluded.subcategory_name,description=excluded.description,sort_order=excluded.sort_order,is_active=true,updated_at=now();

-- 2) Retire venue rules that put non-matching places in these categories.
update public.gt_venue_taxonomy_eligibility set is_active=false,updated_at=now(),
  rationale=coalesce(rationale,'')||' [retired 2026-11-10 owner pass: wrong place type]'
where is_active and (
  (category_key='fashion_beauty_shopping' and subcategory_key in ('fashion_shows','shopping_markets','brand_popups'))
  or (category_key='wellness_fitness' and subcategory_key in ('outdoor_adventure','wellness_events'))
  or (category_key='wellness_fitness' and subcategory_key='runs_races' and venue_category_key='outdoor_adventures')
  or (category_key='family_kids' and subcategory_key in ('kids_activities','youth_programs'))
  or (category_key='attractions_experiences' and subcategory_key='scenic_views' and (venue_category_key='rooftop' or venue_subcategory_pattern is null))
  or (category_key='attractions_experiences' and subcategory_key='unique_attractions' and venue_category_key='entertainment' and venue_subcategory_pattern is null)
  or (category_key='attractions_experiences' and subcategory_key='tours_sightseeing' and venue_category_key='outdoor_adventures')
);

-- 3) Precise venue rules (pattern is matched against lower(venue.subcategory)).
insert into public.gt_venue_taxonomy_eligibility(venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active) values
 ('shopping','luxury|mall|plaza|outlet','fashion_beauty_shopping','shop_districts',95,'owner pass 2026-11-10',true),
 ('entertainment','^district$','fashion_beauty_shopping','shop_districts',85,'owner pass 2026-11-10',true),
 ('shopping','boutique|menswear|womenswear|designer|apparel','fashion_beauty_shopping','shop_boutiques',92,'owner pass 2026-11-10',true),
 ('shopping','sneaker|streetwear','fashion_beauty_shopping','shop_sneakers',95,'owner pass 2026-11-10',true),
 ('shopping','vintage|thrift|antique|flea','fashion_beauty_shopping','shop_vintage',95,'owner pass 2026-11-10',true),
 ('food_hall',null,'fashion_beauty_shopping','shop_markets',80,'owner pass 2026-11-10',true),
 ('shopping','book|gift|jewel','fashion_beauty_shopping','shop_books_gifts',92,'owner pass 2026-11-10',true),
 ('beauty',null,'fashion_beauty_shopping','shop_beauty',92,'owner pass 2026-11-10',true),
 ('spa',null,'wellness_fitness','well_spas',96,'owner pass 2026-11-10',true),
 ('wellness','spa|sauna','wellness_fitness','well_spas',94,'owner pass 2026-11-10',true),
 ('wellness','yoga|meditation','wellness_fitness','well_yoga',96,'owner pass 2026-11-10',true),
 ('outdoor_adventures','hiking|trail|cycling|greenway|nature_preserve','wellness_fitness','well_trails',94,'owner pass 2026-11-10',true),
 ('outdoor_adventures','botanical|garden|city_park|nature_center','wellness_fitness','well_parks',88,'owner pass 2026-11-10',true),
 ('culture','museum|aquarium|science|planetarium|puppetry','family_kids','fam_museums',92,'owner pass 2026-11-10',true),
 ('entertainment','play|playground|trampoline|sensory|slime|sandlot|skydiving|family_build','family_kids','fam_play',95,'owner pass 2026-11-10',true),
 ('entertainment','family_center|multi_attraction|skating|karting|indoor_mini_golf|theme_park|driving_edutainment|immersive_sensory_family|dinner_show','family_kids','fam_fun_centers',92,'owner pass 2026-11-10',true),
 ('outdoor_adventures','park|garden|zoo|nature_center|playground|ropes','family_kids','fam_outdoors',92,'owner pass 2026-11-10',true),
 ('culture','histor|human_rights|black_history|street art|cemetery|live_theater_historic','attractions_experiences','attr_landmarks',92,'owner pass 2026-11-10',true),
 ('culture','museum|galler|exhibit','attractions_experiences','attr_museums',92,'owner pass 2026-11-10',true),
 ('entertainment','^district$','attractions_experiences','attr_districts',88,'owner pass 2026-11-10',true),
 ('experiences','observation','attractions_experiences','scenic_views',92,'owner pass 2026-11-10',true),
 ('entertainment','escape|game_show|dinner_show|driving_experience|skydiving|interactive_art|immersive|^vr$|vr & interactive|sim_racing|darts|golf_games|karting|theme_park','attractions_experiences','unique_attractions',85,'owner pass 2026-11-10',true);

-- 4) Venue rows filed under the wrong type (facts unchanged; only classification).
update public.gt_venues set category_key='food_hall',subcategory='Market Hall',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"reclassified":"owner_pass_2026_11_10","was":"outdoor_adventures/Farmers Markets"}'
  where id in ('a86eab4d-03f4-44a4-a20c-d7315c21048e') and category_key='outdoor_adventures';
update public.gt_venues set category_key='food_hall',subcategory='Public Market',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"reclassified":"owner_pass_2026_11_10","was":"outdoor_adventures/Farmers Markets"}'
  where city_key='atlanta' and name='Sweet Auburn Curb Market' and category_key='outdoor_adventures';
-- Duplicate of f7701d59 (same address, same place); keep the food_hall row.
update public.gt_venues set status='merged_duplicate',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"merged_into":"f7701d59-48cd-4172-a2ba-155d9c082713","merged_by":"owner_pass_2026_11_10"}'
  where id='94556b5d-72c9-4365-a542-19c2be566eaf' and status='active';
update public.gt_venues set category_key='speakeasy',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"reclassified":"owner_pass_2026_11_10","was":"entertainment/Cocktail Bars"}'
  where city_key='atlanta' and name='Red Phone Booth' and category_key='entertainment';
update public.gt_venues set category_key='lounge',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"reclassified":"owner_pass_2026_11_10","was":"entertainment/Lounges"}'
  where city_key='atlanta' and name='Red Martini' and category_key='entertainment';
update public.gt_venues set subcategory='aquarium',updated_at=now(),
  metadata=coalesce(metadata,'{}'::jsonb)||'{"reclassified":"owner_pass_2026_11_10","was":"culture/Science & Tech Museums"}'
  where city_key='atlanta' and name='Georgia Aquarium' and category_key='culture';

commit;
refresh materialized view public.mv_gt_venue_taxonomy_directory;

-- 5) (applied after 1–4) 403 of 417 curated memberships had lapsed on their 45-day timer while the venues themselves
--    stayed verified-current — that emptied Family, Attractions, nightlife clubs and Entertainment lanes.
--    A curated classification now stays valid while its venue's own verification is current.
update public.gt_curated_venue_memberships cm set expires_at=v.freshness_expires_at, updated_at=now()
from public.gt_venues v where v.id=cm.venue_id and cm.is_active and cm.expires_at<now()
  and v.status='active' and v.is_verified and v.verification_status='verified_current' and v.freshness_expires_at>now();
-- Curated-only venues receive Places memberships from the corrected place-type rules above.
insert into public.gt_curated_venue_memberships(venue_id,city_key,category_key,subcategory_key,rank_score,reason,source_url_1,verified_at,expires_at,is_active)
select m.id, m.city_key, m.category_key, m.subcategory_key, least(100,greatest(1,m.taxonomy_confidence))::smallint,
  'Place-type rule (owner pass 2026-11-10): '||v.category_key||' / '||coalesce(v.subcategory,''), v.website, coalesce(v.verified_at,now()), v.freshness_expires_at, true
from public.mv_gt_venue_taxonomy_directory m join public.gt_venues v on v.id=m.id
where m.city_key='atlanta' and v.metadata->>'taxonomy_membership_mode'='curated_only'
  and v.verification_status='verified_current' and v.freshness_expires_at>now()
  and m.category_key in ('wellness_fitness','fashion_beauty_shopping','family_kids','attractions_experiences')
  and m.subcategory_key in ('shop_districts','shop_boutiques','shop_sneakers','shop_vintage','shop_markets','shop_books_gifts','shop_beauty','well_spas','well_yoga','well_trails','well_parks','fitness_classes','fam_museums','fam_play','fam_fun_centers','fam_outdoors','attr_landmarks','attr_museums','attr_districts','zoos_aquariums','scenic_views','immersive_experiences','unique_attractions','amusement_theme_parks')
on conflict (venue_id,subcategory_key) do update set is_active=true, expires_at=excluded.expires_at, updated_at=now();

-- 6) Recurring events filed as venues (owner: "ATL Black Pride isn't a Place") → archived, not deleted.
update public.gt_venues set status='archived', metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('archived_reason','recurring_event_not_a_place','archived_by','owner_note_2026_11_10','archived_at',now())
where id in ('545325ba-3ffc-48a5-b972-35cf4f1fbcf9','e89f6879-87bc-4614-835c-974daef22709','f04e0367-3f2a-4ac3-8cae-a7957d0ec1d6','0be9e5e0-efdd-427c-9a61-5deba92dc36d','0faa4feb-8eac-4775-96c2-a6069af0c3c0') and status='active';
