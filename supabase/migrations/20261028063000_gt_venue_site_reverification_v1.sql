-- GOOD TIMES · strict official-site re-verification for previously verified Atlanta venues (2026-10-28)
-- Root cause: 230 of 298 active verified Atlanta venues silently aged past freshness_expires_at, so Places
-- showed ~66 venues. gt-atlanta-venue-recheck only records reachability and never renews verification.
-- This renews a venue ONLY when: still active + verified_current + previously verified, official site 2xx,
-- venue name found on the page (>=0.6 token match), and no closure/parked-domain language. Every attempt is
-- logged with prior values so any renewal is reversible. Unverified inventory can never be upgraded here.
-- Applied to project dzlmtvodpyhetvektfuo as migrations gt_venue_site_reverification_v1{,_fn,_dispatch}.

create table if not exists public.gt_venue_reverification_log (
  id bigint generated always as identity primary key,
  venue_id uuid not null references public.gt_venues(id) on delete cascade,
  city_key text not null,
  checked_at timestamptz not null default now(),
  method text not null default 'official_site_reverify_auto_v1',
  http_status integer,
  final_url text,
  name_match_score numeric,
  closed_signal text,
  passed boolean not null,
  reason text,
  page_title text,
  previous_verified_at timestamptz,
  previous_freshness_expires_at timestamptz,
  previous_verification_method text,
  new_freshness_expires_at timestamptz,
  rolled_back_at timestamptz
);
create index if not exists gt_venue_reverification_log_venue_idx on public.gt_venue_reverification_log(venue_id, checked_at desc);
alter table public.gt_venue_reverification_log enable row level security;
revoke all on public.gt_venue_reverification_log from anon, authenticated;

create or replace function public.gt_apply_venue_site_reverification_v1(
  p_venue_id uuid, p_http_status integer, p_final_url text, p_name_match_score numeric,
  p_closed_signal text, p_page_title text, p_passed boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare
  v public.gt_venues%rowtype;
  v_new timestamptz;
  v_ok boolean := false;
  v_reason text := p_reason;
begin
  select * into v from public.gt_venues where id = p_venue_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','venue_not_found'); end if;
  v_ok := coalesce(p_passed,false)
    and v.status = 'active' and v.is_verified is true and v.verification_status = 'verified_current'
    and v.verified_at is not null and coalesce(p_http_status,0) between 200 and 299
    and coalesce(p_name_match_score,0) >= 0.6 and p_closed_signal is null;
  if coalesce(p_passed,false) and not v_ok then v_reason := coalesce(v_reason,'') || ' ineligible_record_state'; end if;
  if v_ok then
    v_new := now() + make_interval(days => public.gt_venue_freshness_days(coalesce(nullif(v.category_key,''),'other')));
  end if;
  insert into public.gt_venue_reverification_log(venue_id, city_key, http_status, final_url, name_match_score, closed_signal,
    passed, reason, page_title, previous_verified_at, previous_freshness_expires_at, previous_verification_method, new_freshness_expires_at)
  values (v.id, v.city_key, p_http_status, p_final_url, p_name_match_score, p_closed_signal,
    v_ok, v_reason, left(p_page_title,300), v.verified_at, v.freshness_expires_at, v.verification_method, v_new);
  if v_ok then
    update public.gt_venues set
      verified_at = now(), freshness_expires_at = v_new, verification_method = 'official_site_reverify_auto_v1',
      metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object('last_auto_reverification', jsonb_build_object(
        'checked_at', now(), 'final_url', p_final_url, 'http_status', p_http_status,
        'name_match_score', p_name_match_score, 'previous_verification_method', v.verification_method)),
      updated_at = now()
    where id = v.id;
  end if;
  return jsonb_build_object('ok', v_ok, 'reason', v_reason, 'new_freshness_expires_at', v_new);
end $$;
revoke all on function public.gt_apply_venue_site_reverification_v1(uuid,integer,text,numeric,text,text,boolean,text) from public, anon, authenticated;

create or replace function public.gt_venue_reverification_candidates_v1(p_limit integer default 25)
returns table(venue_id uuid, name text, website text, freshness_expires_at timestamptz)
language sql security definer set search_path to 'public','pg_temp' stable as $$
  select v.id, v.name, v.website, v.freshness_expires_at
  from public.gt_venues v
  where v.city_key='atlanta' and v.status='active' and v.is_verified and v.verification_status='verified_current'
    and v.verified_at is not null and v.website is not null and btrim(v.website)<>''
    and v.freshness_expires_at <= now() + interval '3 days'
    and not exists (select 1 from public.gt_venue_reverification_log l where l.venue_id=v.id and l.checked_at > now() - interval '20 hours')
  order by v.freshness_expires_at asc nulls first
  limit greatest(1, least(coalesce(p_limit,25), 40));
$$;
revoke all on function public.gt_venue_reverification_candidates_v1(integer) from public, anon, authenticated;

create or replace function public.gt_run_atlanta_venue_reverify(p_limit integer default 25)
returns bigint language plpgsql security definer set search_path to 'public','extensions','net','pg_temp' as $$
declare v_key text; v_id bigint;
begin
  select credential_value->>'api_key' into v_key from public.credentials where credential_key='gt_atlanta_source_internal' and is_active limit 1;
  if coalesce(v_key,'')='' then raise exception 'GOOD TIMES internal source credential unavailable'; end if;
  select net.http_post(
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-venue-reverify',
    headers => jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body => jsonb_build_object('limit', greatest(1, least(coalesce(p_limit,25),40))),
    timeout_milliseconds => 150000) into v_id;
  return v_id;
end $$;
revoke all on function public.gt_run_atlanta_venue_reverify(integer) from public, anon, authenticated;

-- Schedule (applied): select cron.schedule('gt-atlanta-venue-reverify-v1','3-59/10 * * * *',$$select public.gt_run_atlanta_venue_reverify(30);$$);

-- Restaurants: expose the venue's own sourced subcategory so cuisine lanes can be derived deterministically.
create or replace view public.v_gt_restaurant_entities with (security_invoker = true) as
 SELECT v.id, v.city_key, v.name, v.slug, v.neighborhood, v.side_of_town, v.address, v.latitude, v.longitude, v.phone, v.website,
    v.instagram_handle, v.short_desc, v.long_desc, v.hero_image, v.photos, v.price_range, v.hours, v.hours_summary, v.booking_link,
    v.booking_platform, v.google_rating, v.google_reviews, v.quality_score, v.is_verified, v.verification_status, v.verified_at,
    v.freshness_expires_at, v.is_black_owned, v.is_culture_pick, v.culture_tier, v.search_tags, v.tab_tags,
    p.service_level, p.cuisine_tags, p.occasion_tags, p.meal_tags, p.vibe_tags AS restaurant_vibe_tags, p.feature_tags,
    p.dietary_tags, p.ownership_tags, p.profile_confidence, p.needs_review,
    v.subcategory AS source_subcategory
   FROM gt_venues v
     JOIN gt_restaurant_profiles p ON p.entity_id = v.id
  WHERE v.city_key = 'atlanta'::text AND v.status = 'active'::text;

-- Rollback of renewals (if ever needed):
--   update gt_venues v set verified_at=l.previous_verified_at, freshness_expires_at=l.previous_freshness_expires_at,
--     verification_method=l.previous_verification_method
--   from gt_venue_reverification_log l where l.venue_id=v.id and l.passed and l.rolled_back_at is null;
--   update gt_venue_reverification_log set rolled_back_at=now() where passed and rolled_back_at is null;
