-- GOOD TIMES · owner editorial for Atlanta (2026-11-10)
-- Source: owner direction 2026-11-09 ("Opium and Revel are clubs. Utopia is a lounge. Magic City is a strip club.",
-- Top Places list) and the owner's November 2026 GOOD TIMES Atlanta magazine (venue picks + date-night spots).
-- Facts written here are owner-stated types/picks or come from an independent public listing (cited per row).
-- Visibility still requires the normal verified gate; owner picks only change ORDER and CATEGORY, never existence.

-- 1. Safety: restored/og-image venues must not collide with the active-hero uniqueness index.
create or replace function public.gt_hero_image_in_use(p_image text, p_except uuid)
returns boolean language sql stable security definer set search_path to 'public','pg_temp' as $fn$
  select exists (select 1 from public.gt_venues g
    where g.id <> p_except and g.status='active' and coalesce(trim(g.hero_image),'') <> ''
      and regexp_replace(lower(trim(g.hero_image)),'\?.*$','') = regexp_replace(lower(trim(coalesce(p_image,''))),'\?.*$',''));
$fn$;
revoke all on function public.gt_hero_image_in_use(text,uuid) from public, anon, authenticated;

create or replace function public.gt_venue_hero_guard()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
begin
  -- A venue becoming active with a hero already used by another active venue keeps its record but drops the
  -- duplicate photo (premium no-photo state) instead of failing the whole verification.
  if new.status='active' and coalesce(trim(new.hero_image),'') <> '' and public.gt_hero_image_in_use(new.hero_image, new.id) then
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('duplicate_hero_image_dropped', new.hero_image, 'duplicate_hero_dropped_at', now());
    new.hero_image := null;
  end if;
  return new;
end $fn$;
drop trigger if exists gt_venue_hero_guard_trg on public.gt_venues;
create trigger gt_venue_hero_guard_trg before insert or update of status, hero_image on public.gt_venues
  for each row execute function public.gt_venue_hero_guard();

-- 2. Nightlife taxonomy gets a Strip Clubs lane (owner: "Magic City is a Strip Club").
insert into public.gt_taxonomy_subcategories(subcategory_key, category_key, subcategory_name, description, sort_order, minimum_upcoming_inventory, is_active)
values ('strip_clubs','nightlife','Strip Clubs','Atlanta gentlemen''s clubs and strip clubs (21+).', 75, 1, true)
on conflict do nothing;

-- 3. Owner-stated types + corrected listings (independent listing cited in metadata).
update public.gt_venues set website='http://magiccity.com/', address='241 Forsyth St SW, Atlanta, GA', neighborhood='Downtown',
  category_key='nightclub', subcategory='strip_club', age_range='21+',
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('owner_editorial','2026-11-09 owner: strip club','listing_source','https://www.atly.com/location/MagicCity'),
  updated_at=now()
where id='2d84a096-af50-4b4e-a07f-460c83ce6da9';

update public.gt_venues set website='http://blueflamelounge.com/', address='1097 Harwell Rd NW, Atlanta, GA',
  category_key='nightclub', subcategory='strip_club', age_range='21+',
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('owner_editorial','2026-11-09 owner top places; strip club','listing_source','https://www.atly.com/location/BlueFlameLounge'),
  updated_at=now()
where id='64ed4ad0-ed00-441d-a413-3c7dbb2e9d0b';

-- Onyx publishes only on Instagram (no crawlable site). Owner named it; atly independently lists the same address.
update public.gt_venues set neighborhood='Cheshire Bridge', category_key='nightclub', subcategory='strip_club', age_range='21+',
  instagram_handle=coalesce(nullif(instagram_handle,''),'onyx_atlanta'),
  status='active', is_verified=true, verification_status='verified_current', verified_at=now(),
  freshness_expires_at=now()+interval '30 days', verification_method='owner_editorial_plus_independent_listing_v1',
  evidence_url_1='https://www.atly.com/location/Onyx-Gentlemen''s-Club--Atlanta', evidence_type_1='independent_listing',
  verification_evidence_count=2,
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('owner_editorial','2026-11-09 owner top places; strip club','previous_status',status,'previous_verification_method',verification_method),
  updated_at=now()
where id='d6bce20a-48f7-43b3-a5dd-3f135689f4a4';

update public.gt_venues set category_key='lounge', subcategory='restaurant_lounge',
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('owner_editorial','2026-11-09 owner: Utopia is a lounge','previous_category_key',category_key),
  updated_at=now()
where id='c73a1fc4-3ec4-4257-b0e2-5fcd758bfb9c';

update public.gt_venues set subcategory='nightclub', neighborhood=case when neighborhood is null or neighborhood ~* '^atlanta$' then 'West Midtown' else neighborhood end,
  metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('owner_editorial','2026-11-09 owner: club'), updated_at=now()
where id in ('3c84cc79-af41-47d5-9b22-75c8729c60cb','6867cd40-941f-4628-bda9-83b626382a9c');

-- Pasha moved: independent listing (atly) shows 631 Miami Cir NE Suite 27 and pashaatl.com (file had a dead domain).
update public.gt_venues set website='http://www.pashaatl.com/', address='631 Miami Cir NE Suite 27, Atlanta, GA', neighborhood='Buckhead',
  subcategory='mediterranean', metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('listing_source','https://www.atly.com/location/PashaRestaurantAndBar','previous_website',website,'previous_address',address),
  updated_at=now()
where id='f5eb57f1-9adc-422c-9bbe-03ea0fc064fa';
update public.gt_venue_reverification_log set method='superseded_'||method, reason=coalesce(reason,'')||' (superseded: corrected official site 2026-11-10)'
where venue_id='f5eb57f1-9adc-422c-9bbe-03ea0fc064fa' and method like 'official_site_restore_auto_v1%';

update public.gt_venues set website='https://www.aso.org/', updated_at=now()
where id='9815c6f6-1354-4116-b2e4-f92de37a1c54' and nullif(website,'') is null;

-- 4. Owner/magazine venues missing from inventory. Enter as needs_reverification; they go live only after the
--    official-site check passes (gt-atlanta-venue-source restore mode).
insert into public.gt_venues(city_key, name, slug, category_key, subcategory, address, neighborhood, website, status, verification_status,
  data_source, metadata)
values
 ('atlanta','Hungry AF','hungry-af','restaurant','american','2740 Greenbriar Pkwy SW B14, Atlanta, GA 30331','Greenbriar','https://thehungryaf.com/',
  'needs_reverification','needs_reverification','owner_editorial_2026_11_09',
  jsonb_build_object('owner_editorial','2026-11-09 owner top places + November magazine','listing_source','https://www.theinfatuation.com/atlanta/reviews/hungry-af')),
 ('atlanta','Goodfellas Pizza & Wings','goodfellas-pizza-wings-west-end','restaurant','pizza_wings','898 Oak St SW, Atlanta, GA','West End','https://www.goodfellaspizzaandwings.com/',
  'needs_reverification','needs_reverification','owner_editorial_2026_11_09',
  jsonb_build_object('owner_editorial','2026-11-09 owner top places + November magazine','listing_source','https://www.atly.com/location/GOODFELLAS-PIZZA-WINGS-WESTEND'))
on conflict (city_key, slug) do nothing;

-- 5. Curated nightlife memberships (owner-stated types). Shown only while each venue passes the verified gate.
insert into public.gt_curated_venue_memberships(venue_id, city_key, category_key, subcategory_key, rank_score, reason, source_url_1, expires_at)
select v.id, 'atlanta', 'nightlife', m.sub, 95, 'owner_editorial_2026_11_09', m.src, now()+interval '120 days'
from (values
  ('3c84cc79-af41-47d5-9b22-75c8729c60cb'::uuid,'nightclubs','https://opiumatl.com/'),
  ('6867cd40-941f-4628-bda9-83b626382a9c'::uuid,'nightclubs','https://clubrevelatlanta.com/'),
  ('c73a1fc4-3ec4-4257-b0e2-5fcd758bfb9c'::uuid,'lounges','https://utopialoungeatl.com/'),
  ('7b3bdf81-0292-41d3-a5c8-a0902bb54f42'::uuid,'lounges','https://happyhouratl.com'),
  ('2d84a096-af50-4b4e-a07f-460c83ce6da9'::uuid,'strip_clubs','https://www.atly.com/location/MagicCity'),
  ('d6bce20a-48f7-43b3-a5dd-3f135689f4a4'::uuid,'strip_clubs','https://www.atly.com/location/Onyx-Gentlemen''s-Club--Atlanta'),
  ('64ed4ad0-ed00-441d-a413-3c7dbb2e9d0b'::uuid,'strip_clubs','https://www.atly.com/location/BlueFlameLounge')
) m(id, sub, src)
join public.gt_venues v on v.id=m.id
where not exists (select 1 from public.gt_curated_venue_memberships c where c.venue_id=v.id and c.subcategory_key=m.sub and c.is_active);

-- 6. Owner Top Places order (then the magazine's picks).
insert into public.gt_editorial_top_places(venue_id, rank, owner_type_label)
select v.id, r.rank, r.label
from (values
  (1,'^opium$',null::text,'Nightclub'),(2,'^revel atlanta$',null,'Nightclub'),(3,'^tulum atl$',null,null),(4,'^sea salt$',null,null),
  (5,'^hungry af$',null,null),(6,'^goodfellas pizza',null,null),(7,'^happy hour atl$',null,'Lounge'),(8,'^utopia restaurant underground$',null,'Lounge'),
  (9,'^magic city$',null,'Strip Club'),(10,'^onyx atlanta$',null,'Strip Club'),(11,'^pasha restaurant',null,null),(12,'^blue flame lounge$',null,'Strip Club'),
  (13,'^cosm atlanta$',null,null),(14,'^heritage supper club$',null,null),(15,'^sargent$',null,null),(16,'^sozou$',null,null),(17,'^pataaka$',null,null),
  (18,'^mr\. everything',null,null),(19,'^le petit marche$',null,null),(20,'^puttshack atlanta$',null,null),(21,'^flight club atlanta$',null,null),
  (22,'^f1 arcade atlanta$',null,null),(23,'^topgolf atlanta$',null,null),(24,'^high museum of art$',null,null),(25,'^fernbank museum',null,null)
) r(rank, pattern, _unused, label)
join lateral (select g.id from public.gt_venues g where g.city_key='atlanta' and lower(g.name) ~ r.pattern
              order by (g.status='active') desc, (g.verification_status='verified_current') desc, g.updated_at desc limit 1) v on true
on conflict (venue_id) do update set rank=excluded.rank, owner_type_label=excluded.owner_type_label;

-- 7. Magazine "Top Date-Night Spots" (owner editorial).
update public.gt_restaurant_profiles p set
  occasion_tags = array(select distinct unnest(coalesce(p.occasion_tags,'{}') || array['date_night'])),
  evidence = coalesce(p.evidence,'{}'::jsonb) || jsonb_build_object('date_night_owner_editorial','GOOD TIMES Atlanta magazine, November 2026'),
  updated_at = now()
where p.entity_id in ('5de14bcd-991d-4063-87d7-2b79ca93e33a','4d7ac719-3aa7-4d5a-baef-2c4aa39f5024','c53d8e6e-9b47-4dab-b398-aacbbd3b4753','0d933960-487b-4677-87d6-845c65382445');

-- 8. Feed carries editorial_rank and leads with owner picks.
insert into gt_private.gt_function_snapshots(id, fn, reason, definition)
select coalesce((select max(id) from gt_private.gt_function_snapshots),0)+1, 'public.gt_public_live_inventory(text,date,integer,integer)'::regprocedure,
  'before owner editorial top places 2026-11-10', pg_get_functiondef('public.gt_public_live_inventory(text,date,integer,integer)'::regprocedure);

create or replace function public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer default 480, p_venue_limit integer default 360)
returns jsonb language sql stable set search_path to 'pg_catalog','public' as $function$
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
            and updated_at>now()-interval '45 days'
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
      select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory,search_tags,age_range,editorial_rank,owner_type_label
      from (
        select g.id,g.city_key,g.name,g.address,g.neighborhood,g.side_of_town,g.short_desc,g.hero_image,g.google_rating,g.google_reviews,g.quality_score,g.price_range,g.vibe_tags,g.culture_tier,g.is_khg,g.is_culture_pick,g.is_black_owned,g.culture_tags,g.instagram_handle,g.website,g.phone,g.booking_link,g.status,g.latitude,g.longitude,g.category_key as venue_category_key,g.subcategory as venue_subcategory,g.culture_score,g.search_tags,g.age_range,
          t.rank as editorial_rank, t.owner_type_label,
          row_number() over(
            partition by case when g.hero_image is null or btrim(g.hero_image)='' then 'venue:'||g.id::text else lower(regexp_replace(split_part(g.hero_image,'?',1),'/+$','')) end
            order by t.rank asc nulls last,g.is_culture_pick desc,g.is_black_owned desc,g.culture_score desc nulls last,g.quality_score desc nulls last,g.name asc
          ) as image_rank
        from public.gt_venues g
        left join public.gt_editorial_top_places t on t.venue_id=g.id and t.city_key=g.city_key
        where g.city_key=p_city
          and g.status='active'
          and g.is_verified=true
          and g.verification_status='verified_current'
          and g.freshness_expires_at>now()
          and coalesce(g.subcategory,'') not in ('grocery_or_supermarket','supermarket')
      ) ranked where image_rank=1
      order by editorial_rank asc nulls last,is_culture_pick desc,culture_tier asc nulls last,culture_score desc nulls last,quality_score desc nulls last,name asc
      limit least(greatest(coalesce(p_venue_limit,360),1),540)
    ) v),'[]'::jsonb)
  );
$function$;
