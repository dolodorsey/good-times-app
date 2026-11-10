-- GOOD TIMES · restore purged Atlanta venues from their official sites + source category signals (2026-11-09)
-- Owner feedback 2026-11-09: categories are thin (1 date-night restaurant, 0 brunch-tagged, Tonight/Date Night empty),
-- named Atlanta staples (Magic City, Onyx, Blue Flame, Utopia, Pasha, Happy Hour) missing or mislabeled.
-- Root cause: 404 Atlanta venues were hidden by the 2026-08-26 freshness purge (stale, not wrong) and nothing ever
-- re-checked them; restaurant meal/occasion tags were never sourced.
--
-- 1. Restore: a purged venue returns ONLY when its official site is live (2xx), names the venue (>=0.6), shows no
--    closure/parked language. Discovery of a missing official site additionally requires the venue's street address
--    or phone on the page. Venues an operator manually rejected are never retried. Every attempt is logged with prior
--    values (reversible).
-- 2. Signals: the same official pages are read for brunch / late night / happy hour / hookah / rooftop / patio /
--    live music / DJ / date-night language and reservation-platform links. Tags are added only from that evidence.
-- 3. Date night: deterministic rule over stored facts only (site language, price, reservation platform, reviewed vibes).

create table if not exists public.gt_venue_site_signals (
  venue_id uuid primary key references public.gt_venues(id) on delete cascade,
  checked_at timestamptz not null default now(),
  source_url text,
  pages text[] not null default '{}',
  signals text[] not null default '{}',
  booking_link text,
  evidence jsonb not null default '{}'::jsonb
);
alter table public.gt_venue_site_signals enable row level security;
revoke all on public.gt_venue_site_signals from anon, authenticated;

-- Candidates: purged (never manually rejected) Atlanta venues. mode=restore when an official site is on file,
-- mode=discover when only a name + street address are on file (site guessed by the worker, strictly verified).
create or replace function public.gt_venue_restore_candidates_v1(p_limit integer default 30)
returns table(venue_id uuid, name text, website text, address text, phone text, mode text)
language sql security definer set search_path to 'public','pg_temp' stable as $fn$
  select v.id, v.name, nullif(btrim(v.website),''), v.address, v.phone,
         case when nullif(btrim(v.website),'') is not null and v.website !~* '(instagram|facebook|tiktok|twitter|x\.com|linktr\.ee|yelp|google)\.' then 'restore' else 'discover' end
  from public.gt_venues v
  where v.city_key='atlanta' and v.verification_status='needs_reverification'
    and coalesce(v.verification_method,'') not ilike '%reject%'
    and (
      (nullif(btrim(v.website),'') is not null and v.website !~* '(instagram|facebook|tiktok|twitter|x\.com|linktr\.ee|yelp|google)\.')
      or (nullif(btrim(v.address),'') is not null and v.address ~ '^\s*\d+')
    )
    and not exists (select 1 from public.gt_venue_reverification_log l where l.venue_id=v.id and l.method like 'official_site_restore_auto_v1%' and l.checked_at > now() - interval '3 days')
  order by (nullif(btrim(v.website),'') is null), v.quality_score desc nulls last, v.name
  limit greatest(1, least(coalesce(p_limit,30), 40));
$fn$;
revoke all on function public.gt_venue_restore_candidates_v1(integer) from public, anon, authenticated;

create or replace function public.gt_apply_venue_site_restore_v1(
  p_venue_id uuid, p_mode text, p_http_status integer, p_final_url text, p_name_match_score numeric,
  p_closed_signal text, p_page_title text, p_contact_match boolean, p_passed boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  v public.gt_venues%rowtype;
  v_new timestamptz;
  v_ok boolean;
  v_reason text := p_reason;
  v_method text := 'official_site_restore_auto_v1' || case when p_mode='discover' then '_discover' else '' end;
begin
  select * into v from public.gt_venues where id = p_venue_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','venue_not_found'); end if;
  v_ok := coalesce(p_passed,false)
    and v.city_key='atlanta' and v.verification_status='needs_reverification'
    and coalesce(v.verification_method,'') not ilike '%reject%'
    and coalesce(p_http_status,0) between 200 and 299
    and coalesce(p_name_match_score,0) >= case when p_mode='discover' then 0.8 else 0.6 end
    and p_closed_signal is null
    and (p_mode <> 'discover' or coalesce(p_contact_match,false));
  if coalesce(p_passed,false) and not v_ok then v_reason := coalesce(v_reason,'') || ' ineligible_record_state'; end if;
  if v_ok then v_new := now() + make_interval(days => public.gt_venue_freshness_days(coalesce(nullif(v.category_key,''),'other'))); end if;
  insert into public.gt_venue_reverification_log(venue_id, city_key, method, http_status, final_url, name_match_score, closed_signal,
    passed, reason, page_title, previous_verified_at, previous_freshness_expires_at, previous_verification_method, new_freshness_expires_at)
  values (v.id, v.city_key, v_method, p_http_status, p_final_url, p_name_match_score, p_closed_signal,
    v_ok, v_reason, left(p_page_title,300), v.verified_at, v.freshness_expires_at, v.verification_method, v_new);
  if v_ok then
    update public.gt_venues set
      status='active', is_verified=true, verification_status='verified_current',
      verified_at=now(), freshness_expires_at=v_new, verification_method=v_method,
      website=case when p_mode='discover' then p_final_url else website end,
      evidence_url_1=coalesce(nullif(evidence_url_1,''), p_final_url), evidence_type_1=coalesce(nullif(evidence_type_1,''),'official_website'),
      verification_evidence_count=greatest(coalesce(verification_evidence_count,0),1) + case when p_mode='discover' then 1 else 0 end,
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('site_restore', jsonb_build_object(
        'checked_at',now(),'mode',p_mode,'final_url',p_final_url,'http_status',p_http_status,
        'name_match_score',p_name_match_score,'contact_match',p_contact_match,'previous_status',v.status,
        'previous_verification_method',v.verification_method)),
      updated_at=now()
    where id=v.id;
    -- Restored eateries join the restaurant directory (profile flagged for review; tags come only from signals).
    if v.category_key in ('restaurant','brunch','coffee','food_truck','food_hall','wine_bar','food','food_and_dining') then
      insert into public.gt_restaurant_profiles(entity_id, profile_source, profile_confidence, needs_review, evidence)
      values (v.id, 'site_restore_v1', 60, true, jsonb_build_object('restored_from', p_final_url))
      on conflict (entity_id) do nothing;
    end if;
  end if;
  return jsonb_build_object('ok', v_ok, 'reason', v_reason, 'new_freshness_expires_at', v_new);
end $fn$;
revoke all on function public.gt_apply_venue_site_restore_v1(uuid,text,integer,text,numeric,text,text,boolean,boolean,text) from public, anon, authenticated;

-- Signal candidates: live verified Atlanta venues with an official site, never scanned or scanned > 14 days ago.
create or replace function public.gt_venue_signal_candidates_v1(p_limit integer default 30)
returns table(venue_id uuid, name text, website text, address text, phone text, mode text)
language sql security definer set search_path to 'public','pg_temp' stable as $fn$
  select v.id, v.name, v.website, v.address, v.phone, 'signals'
  from public.gt_venues v
  left join public.gt_venue_site_signals s on s.venue_id=v.id
  where v.city_key='atlanta' and v.status='active' and v.verification_status='verified_current'
    and nullif(btrim(v.website),'') is not null and v.website !~* '(instagram|facebook|tiktok|twitter|x\.com|linktr\.ee|yelp|google)\.'
    and (s.venue_id is null or s.checked_at < now() - interval '14 days')
  order by (s.venue_id is not null), (v.hero_image is null) desc, (v.category_key in ('restaurant','brunch','lounge','nightclub','bar','rooftop','wine_bar','hookah','speakeasy','jazz')) desc, v.name
  limit greatest(1, least(coalesce(p_limit,30), 40));
$fn$;
revoke all on function public.gt_venue_signal_candidates_v1(integer) from public, anon, authenticated;

create or replace function public.gt_apply_venue_site_signals_v1(
  p_venue_id uuid, p_source_url text, p_pages text[], p_signals text[], p_booking_link text, p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  v public.gt_venues%rowtype;
  s text[] := coalesce(p_signals,'{}');
  meal text[]; feat text[]; occ text[];
  v_platform text;
  v_img text := nullif(btrim(coalesce(p_evidence->>'official_image','')),'');
begin
  select * into v from public.gt_venues where id=p_venue_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','venue_not_found'); end if;
  insert into public.gt_venue_site_signals(venue_id, checked_at, source_url, pages, signals, booking_link, evidence)
  values (v.id, now(), p_source_url, coalesce(p_pages,'{}'), s, p_booking_link, coalesce(p_evidence,'{}'::jsonb))
  on conflict (venue_id) do update set checked_at=now(), source_url=excluded.source_url, pages=excluded.pages,
    signals=excluded.signals, booking_link=excluded.booking_link, evidence=excluded.evidence;

  if p_booking_link is not null and nullif(btrim(coalesce(v.booking_link,'')),'') is null and p_booking_link ~* '^https://' then
    v_platform := case when p_booking_link ~* 'resy\.com' then 'resy' when p_booking_link ~* 'opentable\.' then 'opentable'
      when p_booking_link ~* 'sevenrooms\.com' then 'sevenrooms' when p_booking_link ~* 'exploretock\.com' then 'tock'
      when p_booking_link ~* 'tablelist\.com' then 'tablelist' when p_booking_link ~* 'yelp\.com/reservations' then 'yelp' else 'official' end;
    update public.gt_venues set booking_link=p_booking_link, booking_platform=coalesce(booking_platform,v_platform), updated_at=now() where id=v.id;
  end if;

  -- The venue's own published share image (og:image) on its official site is a verified photo of that place.
  if v_img is not null and v_img ~* '^https://' and nullif(btrim(coalesce(v.hero_image,'')),'') is null then
    update public.gt_venues set hero_image=v_img, photo_source='official_website',
      photo_credit=left(regexp_replace(coalesce(p_source_url,''),'^https?://(www\.)?([^/]+).*$','\2'),120),
      is_stock_photo=false, photo_status='official_site_og', updated_at=now() where id=v.id;
  end if;

  meal := array(select x from unnest(array['brunch','breakfast','lunch','dinner','late_night','dessert']) x where x = any(s));
  feat := array(select x from unnest(array['hookah','rooftop','patio','live_music','dj','happy_hour','private_events','bottle_service']) x where x = any(s));
  occ  := array(select x from unnest(array['date_night','group_dining','birthday']) x where x = any(s));

  update public.gt_restaurant_profiles p set
    meal_tags = array(select distinct unnest(coalesce(p.meal_tags,'{}') || meal)),
    feature_tags = array(select distinct unnest(coalesce(p.feature_tags,'{}') || feat)),
    occasion_tags = array(select distinct unnest(coalesce(p.occasion_tags,'{}') || occ)),
    evidence = coalesce(p.evidence,'{}'::jsonb) || jsonb_build_object('site_signals', jsonb_build_object('source_url',p_source_url,'signals',s,'checked_at',now())),
    updated_at = now()
  where p.entity_id = v.id and (cardinality(meal)+cardinality(feat)+cardinality(occ)) > 0;

  if cardinality(s) > 0 then
    update public.gt_venues set
      search_tags = array(select distinct unnest(coalesce(search_tags,'{}') || s)),
      updated_at = now()
    where id = v.id;
  end if;
  return jsonb_build_object('ok',true,'signals',s);
end $fn$;
revoke all on function public.gt_apply_venue_site_signals_v1(uuid,text,text[],text[],text,jsonb) from public, anon, authenticated;

-- Date night: deterministic rule over stored, sourced facts. Never removes a reviewed tag.
create or replace function public.gt_refresh_date_night_tags_v1()
returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare n integer;
begin
  update public.gt_restaurant_profiles p set
    occasion_tags = array(select distinct unnest(coalesce(p.occasion_tags,'{}') || array['date_night'])),
    evidence = coalesce(p.evidence,'{}'::jsonb) || jsonb_build_object('date_night_rule','gt_refresh_date_night_tags_v1'),
    updated_at = now()
  from public.gt_venues v
  left join public.gt_venue_site_signals s on s.venue_id = v.id
  where p.entity_id = v.id and v.city_key='atlanta' and v.status='active' and v.verification_status='verified_current'
    and not ('date_night' = any(coalesce(p.occasion_tags,'{}')))
    and v.category_key not in ('coffee','food_truck','food_hall')
    and (
      'date_night' = any(coalesce(s.signals,'{}'))
      or v.price_range in ('$$$','$$$$')
      or exists (select 1 from unnest(coalesce(v.best_for,'{}') || coalesce(v.vibe_tags,'{}') || coalesce(p.vibe_tags,'{}')) t
                 where lower(t) ~ '(date|romantic|intimate|upscale|fine dining|special occasion)')
      or (coalesce(v.booking_link,'') ~* '(resy\.com|opentable\.|sevenrooms\.com|exploretock\.com)'
          and lower(coalesce(v.subcategory,'')||' '||coalesce(v.category_key,'')) ~ '(steak|sushi|omakase|italian|french|wine|seafood|tapas|cocktail|rooftop|fine|chophouse|mediterranean|japanese)')
    );
  get diagnostics n = row_count;
  return n;
end $fn$;
revoke all on function public.gt_refresh_date_night_tags_v1() from public, anon, authenticated;

create or replace function public.gt_run_atlanta_venue_restore(p_limit integer default 30, p_mode text default 'restore')
returns bigint language plpgsql security definer set search_path to 'public','extensions','net','pg_temp' as $fn$
declare v_key text; v_id bigint;
begin
  select credential_value->>'api_key' into v_key from public.credentials where credential_key='gt_atlanta_source_internal' and is_active limit 1;
  if coalesce(v_key,'')='' then raise exception 'GOOD TIMES internal source credential unavailable'; end if;
  select net.http_post(
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-venue-source',
    headers => jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body => jsonb_build_object('limit', greatest(1, least(coalesce(p_limit,30),40)), 'mode', p_mode),
    timeout_milliseconds => 150000) into v_id;
  return v_id;
end $fn$;
revoke all on function public.gt_run_atlanta_venue_restore(integer,text) from public, anon, authenticated;

-- Owner-curated "Top Places in Atlanta" order. Only venues that pass the normal verified gate ever reach customers.
create table if not exists public.gt_editorial_top_places (
  venue_id uuid primary key references public.gt_venues(id) on delete cascade,
  city_key text not null default 'atlanta',
  rank integer not null,
  owner_type_label text,
  source text not null default 'owner_editorial_2026_11_09',
  created_at timestamptz not null default now()
);
alter table public.gt_editorial_top_places enable row level security;
drop policy if exists gt_editorial_top_places_read on public.gt_editorial_top_places;
create policy gt_editorial_top_places_read on public.gt_editorial_top_places for select to anon, authenticated using (true);
grant select on public.gt_editorial_top_places to anon, authenticated;
