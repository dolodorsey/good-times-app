-- GOOD TIMES · owner notes 2026-11-10 (18:12)
-- 1) "Add Space" moves under Profile as "Partner with GOOD TIMES" (venues, promoters, ad-space buyers).
--    Requests land in a private review queue; nothing is published automatically.
-- 2) "Tonight/Upcoming isn't showing clubs, nightlife": club nights listed by a VERIFIED GOOD TIMES nightlife
--    venue (matched by venue id, exact venue name, or the venue's own street address) are admitted even when the
--    listing comes from the venue's ticketing page rather than an "official calendar" source. The venue must pass
--    the normal verified gate; image + https ticket + freshness + noise guards still apply. Nothing is invented.

-- ── 1. Partner requests ────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.gt_partner_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city_key text not null default 'atlanta',
  partner_type text not null check (partner_type in ('venue','promoter','advertiser')),
  business_name text not null check (char_length(business_name) between 1 and 160),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  email text check (email is null or (char_length(email) <= 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  phone text check (phone is null or char_length(phone) <= 40),
  instagram text check (instagram is null or char_length(instagram) <= 80),
  website text check (website is null or (char_length(website) <= 300 and website ~* '^https?://')),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 120),
  budget text check (budget is null or char_length(budget) <= 40),
  start_date date,
  details text check (details is null or char_length(details) <= 1500),
  interests text[] not null default '{}',
  status text not null default 'new' check (status in ('new','contacted','approved','declined','spam')),
  source text not null default 'app_profile_partner',
  constraint gt_partner_requests_contact check (email is not null or phone is not null)
);
alter table public.gt_partner_requests enable row level security;
-- No policies: the public can only reach this table through gt_submit_partner_request().
revoke all on public.gt_partner_requests from anon, authenticated;
create index if not exists gt_partner_requests_created_idx on public.gt_partner_requests (created_at desc);

create or replace function public.gt_submit_partner_request(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  v_id uuid;
  v_email text := nullif(btrim(lower(p->>'email')),'');
  v_phone text := nullif(btrim(p->>'phone'),'');
  v_interests text[];
begin
  if coalesce(p->>'partner_type','') not in ('venue','promoter','advertiser') then raise exception 'invalid partner type'; end if;
  if v_email is null and v_phone is null then raise exception 'email or phone required'; end if;
  -- Basic abuse guard: at most 5 requests per contact per day.
  if (select count(*) from public.gt_partner_requests r
      where r.created_at > now() - interval '1 day'
        and ((v_email is not null and r.email = v_email) or (v_phone is not null and r.phone = v_phone))) >= 5 then
    raise exception 'too many requests';
  end if;
  select coalesce(array_agg(x), '{}') into v_interests
    from (select jsonb_array_elements_text(coalesce(p->'interests','[]'::jsonb)) x limit 10) s
    where x in ('listing','events','photos','free','featured','recurring','collab','home','entertainment','places','newsletter');
  insert into public.gt_partner_requests(city_key,partner_type,business_name,contact_name,email,phone,instagram,website,neighborhood,budget,start_date,details,interests)
  values ('atlanta', p->>'partner_type', left(btrim(p->>'business_name'),160), left(btrim(p->>'contact_name'),120), v_email, left(v_phone,40),
          nullif(left(btrim(p->>'instagram'),80),''), nullif(left(btrim(p->>'website'),300),''), nullif(left(btrim(p->>'neighborhood'),120),''),
          nullif(left(btrim(p->>'budget'),40),''),
          case when coalesce(p->>'start_date','') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'start_date')::date end,
          nullif(left(btrim(p->>'details'),1500),''), v_interests)
  returning id into v_id;
  return v_id;
end $fn$;
revoke all on function public.gt_submit_partner_request(jsonb) from public;
grant execute on function public.gt_submit_partner_request(jsonb) to anon, authenticated;

-- ── 2. Club nights at verified nightlife venues ────────────────────────────────────────────────────────────
insert into gt_private.gt_function_snapshots(fn, reason, definition)
select 'public.gt_public_live_inventory(text,date,integer,integer)'::regprocedure,
       'before gt_partner_requests_and_club_nights_v1 (club nights at verified nightlife venues)',
       pg_get_functiondef('public.gt_public_live_inventory(text,date,integer,integer)'::regprocedure);

create or replace function public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer default 480, p_venue_limit integer default 360)
returns jsonb language sql stable set search_path to 'pg_catalog','public' as $function$
  with club_venues as (
    select g.id, lower(btrim(g.name)) as name_key, nullif(split_part(lower(btrim(g.address)),',',1),'') as street_key
    from public.gt_venues g
    where g.city_key=p_city and g.status='active' and g.is_verified=true
      and g.verification_status='verified_current' and g.freshness_expires_at>now()
      and g.category_key in ('nightclub','lounge','nightlife','rooftop','speakeasy','hookah','jazz','pool_party')
  ),
  -- One listing per verified club per night, and only when that club's own official calendar has nothing that
  -- night and GOOD TIMES has not already selected one there (so the same party never appears twice under two titles).
  club_nights as (
    select distinct on (c.id, s.show_date) s.id
    from public.gt_shows s
    join club_venues c on (s.venue_id=c.id or lower(btrim(s.venue_name))=c.name_key
                           or (c.street_key is not null and split_part(lower(btrim(s.venue_name)),',',1)=c.street_key))
    where p_city='atlanta' and s.city_key=p_city
      and s.show_date between p_service_date and p_service_date+21
      and s.updated_at>now()-interval '7 days'
      and s.status in ('confirmed','tentative')
      and coalesce(s.category_key_v2,'') in ('','needs_review','nightlife','day_parties_brunch','concerts_live_music')
      and s.ticket_url like 'https://%' and s.image_url like 'https://%'
      and lower(coalesce(s.event_name,'')||' '||coalesce(s.venue_name,'')) !~ '(season tickets|season pass|parking pass|parking only|premium season|fast lane|vip upgrade|open.?mic|comedy school|workshop|audition|webinar|timeshare|make money|zoom|karaoke|shuttle|virtual event|networking|pitch event|^copy of[ :]|test event|sample event)'
      and not exists (
        select 1 from public.gt_shows o
        where o.city_key=s.city_key and o.show_date=s.show_date and o.id<>s.id
          and o.status in ('confirmed','tentative')
          and (public.gt_is_official_calendar_source(o.source)
               or o.id in (select show_id from public.gt_atlanta_editorial_selection_v1 where selected_at>now()-interval '2 hours'))
          and (o.venue_id=c.id or lower(btrim(o.venue_name))=c.name_key
               or (c.street_key is not null and split_part(lower(btrim(o.venue_name)),',',1)=c.street_key))
      )
    order by c.id, s.show_date, (coalesce(s.category_key_v2,'') not in ('','needs_review')) desc, s.updated_at desc, s.id
  )
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,city_key,artist_id,venue_id,event_name,event_type,genre,show_date,show_time,doors_time,end_date,end_time,timezone,venue_name,venue_address,image_url,ticket_url,ticket_price_min,ticket_price_max,is_free,free_status,admission_type,currency,price_basis,is_sold_out,age_requirement,age_requirement_verified_at,description,organizer,source,source_url,status,quality_score,good_times_score,display_priority,is_featured,is_curated,
        case when id in (select id from club_nights) and coalesce(category_key_v2,'') in ('','needs_review') then 'nightlife' else category_key_v2 end as category_key_v2,
        subcategory_key_v2,freshness_tier,fact_verified_at,valid_until,provider_occurrence_id,updated_at
      from public.gt_shows
      where city_key=p_city
        and (show_date>=p_service_date or end_date>=p_service_date)
        and (
          p_city<>'atlanta'
          or id in(select show_id from public.gt_atlanta_editorial_selection_v1 where selected_at>now()-interval '2 hours')
          or id in(select id from club_nights)
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
        and lower(coalesce(event_name,'') || ' ' || coalesce(description,'')) !~ '\m(back-to-campus transportation|college shuttle|shuttle event|scheduled motorcoach transportation|concert transportation|party bus)\M'
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
