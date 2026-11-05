-- GOOD TIMES official-calendar inventory (owner directive 2026-11-05: "we are supposed to source the top info").
--
-- Problem: gt_public_live_inventory only admitted rows in gt_atlanta_editorial_selection_v1. That selector caps each
-- event_type per time window (concert 8, sports 3, everything else 3) and requires a 72h updated_at, so 963 ready
-- Atlanta events collapsed to 65 customer-facing events.
--
-- Fix: keep the editorial selection as the ranking signal, and additionally admit events that come straight from an
-- official venue/team calendar. Every truth gate stays: confirmed/tentative, real venue, image, ticket link, freshness
-- tier, in-person only. Eventbrite buckets are NOT widened; they stay behind the editorial selector because most of
-- that bucket is off-brand (trainings, shuttles, conferences).
-- Long-running programming (festivals, holiday experiences) stays discoverable until its documented end_date.

create or replace function public.gt_is_official_calendar_source(p_source text)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select coalesce(p_source,'') ~* '(official|calendar|schedule|comedy club|^foxtheatre$|^statefarmarena$)'
     and coalesce(p_source,'') !~* '(university|eventbrite|allevents|instagram|perplexity|scout)';
$$;

create or replace function public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer default 480, p_venue_limit integer default 360)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,city_key,artist_id,venue_id,event_name,event_type,genre,show_date,show_time,doors_time,end_date,end_time,timezone,venue_name,venue_address,image_url,ticket_url,ticket_price_min,ticket_price_max,is_free,free_status,admission_type,currency,price_basis,is_sold_out,age_requirement,age_requirement_verified_at,description,organizer,source,source_url,status,quality_score,good_times_score,display_priority,is_featured,is_curated,category_key_v2,subcategory_key_v2,freshness_tier,fact_verified_at,valid_until,provider_occurrence_id,updated_at
      from public.gt_shows
      where city_key=p_city
        and (show_date>=p_service_date or end_date>=p_service_date)
        and (
          p_city<>'atlanta'
          or id in(select show_id from public.gt_atlanta_editorial_selection_v1 where selected_at>now()-interval '2 hours')
          or (
            public.gt_is_official_calendar_source(source)
            and (show_date<=p_service_date+120 or is_featured is true)
            and updated_at>now()-interval '21 days'
            and coalesce(category_key_v2,'')<>'needs_review'
            and nullif(btrim(venue_name),'') is not null
            and lower(coalesce(event_name,'')||' '||coalesce(venue_name,'')) !~ '(season tickets|season pass|parking pass|parking only|premium season|fast lane|vip upgrade|open.?mic|comedy school|workshop|audition|webinar|timeshare|make money|zoom|karaoke|shuttle|virtual event|^copy of[ :]|test event|sample event)'
          )
        )
        and status in ('confirmed','tentative')
        and coalesce(freshness_tier,'unknown') not in ('expired','unknown')
        and image_url is not null
        and ticket_url is not null
        and lower(coalesce(event_name,'') || ' ' || coalesce(description,'')) !~ '\m(back-to-campus transportation|college shuttle|shuttle event|scheduled motorcoach transportation)\M'
      order by greatest(show_date,p_service_date) asc,(status='confirmed') desc,is_curated desc,quality_score desc nulls last,updated_at desc,event_name asc
      limit least(greatest(coalesce(p_event_limit,480),1),720)
    ) e),'[]'::jsonb),
    'venues',coalesce((select jsonb_agg(to_jsonb(v)) from (
      select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
      from (
        select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,category_key as venue_category_key,subcategory as venue_subcategory,culture_score,
          row_number() over(
            partition by case when hero_image is null or btrim(hero_image)='' then 'venue:'||id::text else lower(regexp_replace(split_part(hero_image,'?',1),'/+$','')) end
            order by is_culture_pick desc,is_black_owned desc,culture_score desc nulls last,quality_score desc nulls last,name asc
          ) as image_rank
        from public.gt_venues
        where city_key=p_city
          and status='active'
          and is_verified=true
          and verification_status='verified_current'
          and freshness_expires_at>now()
          and coalesce(subcategory,'') not in ('grocery_or_supermarket','supermarket')
      ) ranked where image_rank=1
      order by is_culture_pick desc,culture_tier asc nulls last,culture_score desc nulls last,quality_score desc nulls last,name asc
      limit least(greatest(coalesce(p_venue_limit,360),1),540)
    ) v),'[]'::jsonb)
  );
$function$;

-- Falcons schedule adapter stored kickoff times in UTC. Home games: 18:00 UTC is 1:00 PM ET
-- (confirmed for Chiefs by mercedesbenzstadium.com: "Sunday November 15, 2026 1:00 pm").
update public.gt_shows
set show_time='13:00',
    event_name=regexp_replace(event_name,'^(.+) vs (Atlanta Falcons)$','Falcons vs \1'),
    image_url=coalesce(image_url,'https://cdn.prod.website-files.com/5ddedb3aabcf2c01a3f45461/6ace4ffc98b9b9c1503262f7_open-g.jpg'),
    category_key_v2='sports_watch',
    is_featured=true,
    is_curated=true,
    fact_verified_at=now(),
    curation_reason='2026-11-05 kickoff corrected from UTC; home game confirmed on Mercedes-Benz Stadium calendar',
    updated_at=now()
where source='Atlanta Falcons Schedule' and city_key='atlanta' and show_date>=date '2026-11-05'
  and venue_name='Mercedes-Benz Stadium' and show_time='18:00';

-- Away and international games were tagged Atlanta (wrong-city, P0). They stay on record but leave Atlanta inventory.
update public.gt_shows
set status='cancelled',
    curation_reason='2026-11-05 not in Atlanta (away/international game: '||venue_name||'); withheld from Atlanta inventory, not an actual cancellation',
    updated_at=now()
where source='Atlanta Falcons Schedule' and city_key='atlanta' and show_date>=date '2026-11-05'
  and venue_name<>'Mercedes-Benz Stadium';

-- "Chris Brown x Usher" Nov 7 came from an Instagram flyer with no time. The stadium moved Nov 7 to Nov 6.
-- Replaced by the five official nights inserted below.
update public.gt_shows
set status='cancelled',
    curation_reason='2026-11-05 superseded: Nov 7 rescheduled to Nov 6 per Mercedes-Benz Stadium calendar; see official R&B Tour rows',
    updated_at=now()
where id='f9cbe807-b9be-4867-8463-b8566f36eeb3';

-- Duplicate of the State Farm Arena calendar row for the same night. Not a cancellation.
update public.gt_shows
set status='cancelled',
    curation_reason='2026-11-05 duplicate of State Farm Arena calendar row 01d4dd5c; not an actual cancellation',
    updated_at=now()
where id='975074af-8f59-42fa-808f-cf2fb4083698';
update public.gt_shows set is_featured=true, is_curated=true, updated_at=now()
where id in ('01d4dd5c-81bc-4ae1-b267-22b42ae99ca6','fbbe09a9-ec00-4c8f-9108-ce2e1d5effe3','eebeebef-8147-47a5-bd36-b4932e0b1844','0248ea38-6f15-4518-93af-fc9819e6a166','a96ee647-c326-4839-9b08-e7fddeb7b1ce','b1231c7d-01fb-41e3-b7c7-b51aed550a73','44dca918-a9b8-491c-a3d6-7cd5de87afd2','36e2f675-79e4-418b-a766-e3783da181a2');

-- Chomp & Stomp: official site confirms 11/07/2026, 11am-7pm, Cabbagetown.
update public.gt_shows
set event_name='Chomp & Stomp',
    show_time='11:00', end_time='19:00',
    venue_name='Cabbagetown Park',
    source='Chomp & Stomp Official Calendar',
    source_url='https://chompandstomp.com/',
    ticket_url='https://chompandstomp.com/',
    image_url='https://chompandstomp.com/wp-content/uploads/2025/06/Chomp-Stomp-Aerial-Shot.png',
    category_key_v2='festivals_major_activations',
    is_free=true, is_featured=true, is_curated=true, fact_verified_at=now(), updated_at=now()
where id='3f93fe8d-8638-4a6d-a5f9-e81f92e948f8';

-- Verified flyer inventory that had never been collected. provider_occurrence_id keeps this idempotent.
with verified(pid,d,t,end_d,end_t,name,etype,cat,sub,venue,addr,img,tix,src,src_url,free,age,featured,descr) as (values
 ('mbs:rb-tour:2026-11-05',date '2026-11-05','19:30',null::date,null,'The R&B Tour: Usher & Chris Brown','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6ac008e8baa95e9562e36ab5_Static_Social-Instagram_1080x1080_TheRAndBTour_2026_Regional_Mercedes-BenzStadium_1105-1111.jpg','https://www.mercedesbenzstadium.com/events/the-r-b-tour---starring-usher-raymond-chris-brown-night-5','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,'Usher and Chris Brown co-headline five nights at Mercedes-Benz Stadium, the first tour to play five shows at the venue.'),
 ('mbs:rb-tour:2026-11-06',date '2026-11-06','19:30',null,null,'The R&B Tour: Usher & Chris Brown','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6ac008e8baa95e9562e36ab5_Static_Social-Instagram_1080x1080_TheRAndBTour_2026_Regional_Mercedes-BenzStadium_1105-1111.jpg','https://www.mercedesbenzstadium.com/events/the-r-b-tour---starring-usher-raymond-chris-brown-night-1','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,'Usher and Chris Brown co-headline five nights at Mercedes-Benz Stadium, the first tour to play five shows at the venue.'),
 ('mbs:rb-tour:2026-11-08',date '2026-11-08','19:30',null,null,'The R&B Tour: Usher & Chris Brown','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6ac008e8baa95e9562e36ab5_Static_Social-Instagram_1080x1080_TheRAndBTour_2026_Regional_Mercedes-BenzStadium_1105-1111.jpg','https://www.mercedesbenzstadium.com/events/the-r-b-tour---starring-usher-raymond-chris-brown-night-2','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,'Usher and Chris Brown co-headline five nights at Mercedes-Benz Stadium, the first tour to play five shows at the venue.'),
 ('mbs:rb-tour:2026-11-10',date '2026-11-10','19:30',null,null,'The R&B Tour: Usher & Chris Brown','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6ac008e8baa95e9562e36ab5_Static_Social-Instagram_1080x1080_TheRAndBTour_2026_Regional_Mercedes-BenzStadium_1105-1111.jpg','https://www.mercedesbenzstadium.com/events/the-r-b-tour---starring-usher-raymond-chris-brown-night-3','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,'Usher and Chris Brown co-headline five nights at Mercedes-Benz Stadium, the first tour to play five shows at the venue.'),
 ('mbs:rb-tour:2026-11-11',date '2026-11-11','19:30',null,null,'The R&B Tour: Usher & Chris Brown','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6ac008e8baa95e9562e36ab5_Static_Social-Instagram_1080x1080_TheRAndBTour_2026_Regional_Mercedes-BenzStadium_1105-1111.jpg','https://www.mercedesbenzstadium.com/events/the-r-b-tour---starring-usher-raymond-chris-brown-night-4','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,'Usher and Chris Brown co-headline five nights at Mercedes-Benz Stadium, the first tour to play five shows at the venue.'),
 ('mbs:sec-championship:2026-12-05',date '2026-12-05','16:00',null,null,'SEC Championship','sports','sports_watch',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6995e01a71654cca8f543d30_Web_1x1_SEC_Champ.jpg','https://www.mercedesbenzstadium.com/events/sec-championship-4','Mercedes-Benz Stadium Official Calendar','https://www.ncaa.com/news/football/article/2026-06-01/2026-sec-championship-game-date-time-tv-channel-history',false,null,true,'The SEC title game. Kickoff 4 p.m. ET on ABC.'),
 ('mbs:band-of-the-year:2026-12-11',date '2026-12-11','19:00',null,null,'Band of the Year','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/69960d4888c05b45434def9e_Web_1x1_Band_of_Year.jpg','https://www.mercedesbenzstadium.com/events/band-of-the-year-3','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,false,null),
 ('mbs:celebration-bowl:2026-12-12',date '2026-12-12',null,null,null,'Cricket Celebration Bowl','sports','sports_watch',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/68d42c98c40e6f675817edf3_web_1x1_Celebration_Bowl.png','https://www.mercedesbenzstadium.com/events/cricket-celebration-bowl-2026','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,null),
 ('mbs:harry-styles:2027-05-21',date '2027-05-21',null,null,null,'Harry Styles: Together, Together','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6aa2a5b73f465358b4366332_harry-styles-1x1.png','https://www.mercedesbenzstadium.com/events/harry-styles-together-together-night-1','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,null),
 ('mbs:harry-styles:2027-05-22',date '2027-05-22',null,null,null,'Harry Styles: Together, Together','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6aa2a5b73f465358b4366332_harry-styles-1x1.png','https://www.mercedesbenzstadium.com/events/harry-styles-together-together-night-2','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,null),
 ('mbs:kenny-chesney:2027-07-31',date '2027-07-31',null,null,null,'Kenny Chesney: Original Vibe Room Tour','concert','concerts_live_music',null,'Mercedes-Benz Stadium','1 AMB Dr NW, Atlanta, GA 30313','https://cdn.prod.website-files.com/5ddedd0e3047ab406ee3c37e/6aa94a4e0a44cf9f9b862617_0731-AtlantaGA_KennyChesney_2027_Social_PreSale_1080x1080.jpg','https://www.mercedesbenzstadium.com/events/kenny-chesney-vibe-room-tour','Mercedes-Benz Stadium Official Calendar','https://www.mercedesbenzstadium.com/events',false,null,true,null),
 ('high:hff:2026-11-06',date '2026-11-06','18:00',null,'22:00','HIGH Frequency Friday','special_event','arts_museums_culture',null,'High Museum of Art','1280 Peachtree St NE, Atlanta, GA 30309','https://highmuseum-redesign.s3.amazonaws.com/uploads/2024/10/HighMuseum_HighFrequencyFriday-SOL06867-Enhanced-NR-FullRes-300dpi-240508-scaled.jpg','https://high.org/event/high-frequency-friday-november-2026/','High Museum Official Calendar','https://high.org/event/high-frequency-friday-november-2026/',false,null,true,'After-hours at the High with the city''s most popular DJs and access to the special exhibitions and collections.'),
 ('high:hff:2026-12-04',date '2026-12-04','18:00',null,'22:00','HIGH Frequency Friday','special_event','arts_museums_culture',null,'High Museum of Art','1280 Peachtree St NE, Atlanta, GA 30309','https://highmuseum-redesign.s3.amazonaws.com/uploads/2024/07/HighMuseum_HighFrequencyFriday-SOL07475-FullRes-300dpi-240508_o4.jpg','https://high.org/event/high-frequency-friday-december-2026/','High Museum Official Calendar','https://high.org/event/high-frequency-friday-december-2026/',false,null,true,'After-hours at the High with the city''s most popular DJs and access to the special exhibitions and collections.'),
 ('high:second-sunday:2026-11-08',date '2026-11-08','12:00',null,'17:00','UPS Second Sunday','special_event','arts_museums_culture',null,'High Museum of Art','1280 Peachtree St NE, Atlanta, GA 30309','https://highmuseum-redesign.s3.amazonaws.com/uploads/2025/10/EVE-FY23-SecondSundayFeb2023-106_o3.jpg','https://high.org/event/ups-second-sunday-november-2026/','High Museum Official Calendar','https://high.org/event/ups-second-sunday-november-2026/',true,null,true,'Free general admission at the High, with drop-in art making and performances.'),
 ('fernbank:after-dark:2026-11-13',date '2026-11-13','19:00',null,'23:00','Fernbank After Dark: Amazing Animals','special_event','arts_museums_culture',null,'Fernbank Museum of Natural History','767 Clifton Rd, Atlanta, GA 30307',null,'https://fernbankmuseum.org/experiences/fernbank-after-dark/','Fernbank Museum Official Calendar','https://fernbankmuseum.org/experiences/fernbank-after-dark/',false,'21+',true,'Adults-only night at the museum: exhibits, music, bars and small plates.'),
 ('abg:garden-lights:2026-11-14',date '2026-11-14',null,date '2027-01-10',null,'Garden Lights, Holiday Nights','festival','seasonal_holiday',null,'Atlanta Botanical Garden','1345 Piedmont Ave NE, Atlanta, GA 30309','https://atlantabg.org/wp-content/uploads/2020/09/GLHN_Home_2020-copy.jpg','https://atlantabg.org/calendar/garden-lights-holiday-nights/','Atlanta Botanical Garden Official Calendar','https://atlantabg.org/calendar/garden-lights-holiday-nights/',false,null,true,'The Garden''s holiday light experience, November 14 through January 10. Timed tickets.'),
 ('smp:christmas:2026-11-07',date '2026-11-07',null,date '2027-01-03',null,'Stone Mountain Christmas','festival','seasonal_holiday',null,'Stone Mountain Park','1000 Robert E Lee Blvd, Stone Mountain, GA 30083','https://bunny-wp-pullzone-2v7xwnunut.b-cdn.net/wp-content/uploads/2024/06/Christmas-Light-Show-ornaments.jpg','https://stonemountainpark.com/activities/events/christmas-light-show-atlanta/','Stone Mountain Park Official Calendar','https://stonemountainpark.com/activity/events/magical-flight-to-the-north-pole',false,null,true,'Holiday lights, shows and the North Pole experience on select dates through January 3. Check the park calendar for your date.'),
 ('chastain:fall-arts:2026-11-07',date '2026-11-07',null,date '2026-11-08',null,'Chastain Park Fall Arts Festival','festival','festivals_major_activations',null,'Chastain Park','4469 Stella Dr NW, Atlanta, GA 30327',null,'https://www.chastainparkartsfestival.com/','Chastain Park Arts Festival Official Calendar','https://www.chastainparkartsfestival.com/',true,null,true,'Juried two-day outdoor fine arts festival in Buckhead. Free admission.'),
 ('decatur:wine-festival:2026-11-07',date '2026-11-07','12:30',null,'16:30','Decatur Wine Festival','festival','festivals_major_activations',null,'Decatur Square','101 E Court Square, Decatur, GA 30030','https://decaturartsalliance.org/wp-content/uploads/2026/08/DWF26-logodate.png','https://decaturartsalliance.org/dwf','Decatur Arts Alliance Official Calendar','https://decaturartsalliance.org/dwf',false,'21+',true,'Unlimited pours and a tasting glass on the Decatur Square. Gates open at noon.'),
 ('aso:bach-brahms:2026-11-05',date '2026-11-05','20:00',null,null,'Atlanta Symphony: Bach + Brahms','concert','concerts_live_music',null,'Atlanta Symphony Hall','1280 Peachtree St NE, Atlanta, GA 30309','https://www.aso.org/assets/img/26.27-CS4-EV-760x500-805d053e13.jpg','https://www.aso.org/events/all','Atlanta Symphony Official Calendar','https://www.aso.org/events/all',false,null,true,'Nathalie Stutzmann conducts Bach''s Orchestral Suite No. 3 and Brahms'' Piano Concerto No. 2 with pianist Anna Geniushene.'),
 ('aso:bach-brahms:2026-11-07',date '2026-11-07','20:00',null,null,'Atlanta Symphony: Bach + Brahms','concert','concerts_live_music',null,'Atlanta Symphony Hall','1280 Peachtree St NE, Atlanta, GA 30309','https://www.aso.org/assets/img/26.27-CS4-EV-760x500-805d053e13.jpg','https://www.aso.org/events/all','Atlanta Symphony Official Calendar','https://www.aso.org/events/all',false,null,true,'Nathalie Stutzmann conducts Bach''s Orchestral Suite No. 3 and Brahms'' Piano Concerto No. 2 with pianist Anna Geniushene.'),
 ('aso:youth-overture:2026-11-08',date '2026-11-08',null,null,null,'Atlanta Symphony Youth Orchestra: Overture Concert','concert','concerts_live_music',null,'Atlanta Symphony Hall','1280 Peachtree St NE, Atlanta, GA 30309','https://www.aso.org/assets/img/ASYO-Overture-ev-ef5005e596.jpg','https://www.aso.org/events/all','Atlanta Symphony Official Calendar','https://www.aso.org/events/all',true,null,false,'Free concert. Confirm the start time and reservation details on the ASO calendar.'),
 ('gatech:louisville:2026-11-07',date '2026-11-07','19:30',null,null,'Georgia Tech vs Louisville','sports','sports_watch',null,'Bobby Dodd Stadium','177 North Ave NW, Atlanta, GA 30313','https://ramblinwreck.com/imgproxy/HTwiqHVd2B4phUAaKOVemEvxrbAH8DZFnq4t94T8oNc/rs:fit:1200:630:0:0/g:ce:0:0/q:70/aHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3JhbWJsaW53cmVjay1jb20tcHJvZC8yMDI2LzA4LzI1L1ZTbHY5ZHprbG9JWFUwUFlpTGhMOEQ4Tm1LUDQ3NkNIZkk2cHdXQ04uanBn.jpg','https://ramblinwreck.com/sports/m-footbl/schedule/','Georgia Tech Athletics Official Schedule','https://ramblinwreck.com/sports/m-footbl/schedule/',false,null,true,'Dodd After Dark and Military Appreciation Day. 7:30 p.m. kickoff on ACC Network.')
)
insert into public.gt_shows(city_key,provider_occurrence_id,show_date,show_time,end_date,end_time,event_name,event_type,category_key_v2,subcategory_key_v2,venue_name,venue_address,image_url,ticket_url,source,source_url,is_free,age_requirement,is_featured,is_curated,description,status,fact_verified_at,curation_reason,updated_at)
select 'atlanta',v.pid,v.d,v.t,v.end_d,v.end_t,v.name,v.etype,v.cat,v.sub,v.venue,v.addr,
       coalesce(v.img,(select hero_image from public.gt_venues gv where gv.city_key='atlanta' and gv.name=v.venue and gv.status='active' and gv.hero_image is not null limit 1)),
       v.tix,v.src,v.src_url,v.free,v.age,v.featured,true,v.descr,'confirmed',now(),'2026-11-05 owner flyer reconciliation; verified against official source',now()
from verified v
where not exists(select 1 from public.gt_shows s where s.provider_occurrence_id=v.pid);

select public.gt_refresh_atlanta_live_inventory_cache_v1();
