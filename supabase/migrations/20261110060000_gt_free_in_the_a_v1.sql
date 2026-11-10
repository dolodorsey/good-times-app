-- GOOD TIMES · FREE IN THE A (2026-11-10)
-- Verified free food, free events, giveaways, birthday rewards, deals and partner drops inside Entertainment.
-- Rules: nothing publishes without verified_at + verification_status='verified' + approval_status='approved' +
-- a source_url; expired offers drop automatically; partner submissions enter an approval queue; analytics are
-- raw events (claim CLICKS are not redemptions). City-scoped for future markets.

create table if not exists public.gt_offers (
  id uuid primary key default gen_random_uuid(),
  city_key text not null default 'atlanta',
  title text not null check (char_length(title) between 3 and 140),
  description text check (description is null or char_length(description) <= 2000),
  category text not null check (category in ('food_drinks','events','giveaways','birthday','deals','exclusive_drops')),
  offer_type text not null check (offer_type in ('free','free_with_purchase','discount','giveaway')),
  merchant_name text not null,
  venue_id uuid references public.gt_venues(id) on delete set null,
  show_id uuid references public.gt_shows(id) on delete set null,
  image_url text check (image_url is null or image_url ~* '^https://'),
  location text,
  participating_locations text[] not null default '{}',
  actual_value text,
  requirements text,
  claim_method text check (claim_method in ('online','in_store','app','rsvp','ticket','entry_form','show_code')),
  claim_url text check (claim_url is null or claim_url ~* '^https://'),
  redemption_instructions text,
  source_url text check (source_url is null or source_url ~* '^https://'),
  source_type text not null default 'official' check (source_type in ('official','partner','good_times','public_listing')),
  starts_at timestamptz,
  expires_at timestamptz,
  verified_at timestamptz,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected','expired','flagged')),
  approval_status text not null default 'submitted' check (approval_status in ('submitted','approved','rejected')),
  featured boolean not null default false,
  featured_on date,
  dedupe_key text,
  submitted_by uuid,
  submitter_contact text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gt_offers_window check (expires_at is null or starts_at is null or expires_at > starts_at),
  -- A giveaway can never be conditioned on follows/likes/shares (platform + sweepstakes rules).
  constraint gt_offers_giveaway_no_social_gate check (offer_type <> 'giveaway' or coalesce(requirements,'') !~* '(follow|like|share|comment|tag)\s')
);
create unique index if not exists gt_offers_dedupe_uidx on public.gt_offers(city_key, dedupe_key) where dedupe_key is not null;
create index if not exists gt_offers_public_idx on public.gt_offers(city_key, category, expires_at) where verification_status='verified' and approval_status='approved';

create or replace function public.gt_offers_touch() returns trigger language plpgsql set search_path to 'public','pg_temp' as $fn$
begin
  new.updated_at := now();
  if new.dedupe_key is null then
    new.dedupe_key := lower(regexp_replace(coalesce(new.merchant_name,'')||'|'||coalesce(new.title,'')||'|'||coalesce(to_char(new.expires_at,'YYYY-MM-DD'),''),'[^a-z0-9|]+','','gi'));
  end if;
  -- Approving requires verification evidence.
  if new.approval_status='approved' and (new.verification_status <> 'verified' or new.verified_at is null or new.source_url is null) then
    raise exception 'GOOD TIMES: an offer can be approved only after it is verified with a source URL';
  end if;
  return new;
end $fn$;
drop trigger if exists gt_offers_touch_trg on public.gt_offers;
create trigger gt_offers_touch_trg before insert or update on public.gt_offers for each row execute function public.gt_offers_touch();

alter table public.gt_offers enable row level security;
drop policy if exists gt_offers_public_read on public.gt_offers;
create policy gt_offers_public_read on public.gt_offers for select to anon, authenticated
  using (verification_status='verified' and approval_status='approved' and verified_at is not null and source_url is not null
         and (expires_at is null or expires_at > now()) and (starts_at is null or starts_at <= now() + interval '21 days'));
grant select on public.gt_offers to anon, authenticated;

-- Public read model (only live, verified, approved offers).
create or replace view public.v_gt_offers_public with (security_invoker = true) as
  select id, city_key, title, description, category, offer_type, merchant_name, venue_id, show_id, image_url, location,
         participating_locations, actual_value, requirements, claim_method, claim_url, redemption_instructions, source_url,
         source_type, starts_at, expires_at, verified_at, featured, featured_on
  from public.gt_offers
  where verification_status='verified' and approval_status='approved' and verified_at is not null and source_url is not null
    and (expires_at is null or expires_at > now()) and (starts_at is null or starts_at <= now() + interval '21 days');
grant select on public.v_gt_offers_public to anon, authenticated;

-- Partner submissions: land in the approval queue only (never public until reviewed).
create or replace function public.gt_submit_offer(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare v_id uuid;
begin
  if coalesce(p->>'title','')='' or coalesce(p->>'merchant_name','')='' or coalesce(p->>'category','')='' or coalesce(p->>'offer_type','')='' then
    raise exception 'title, merchant_name, category and offer_type are required';
  end if;
  insert into public.gt_offers(city_key,title,description,category,offer_type,merchant_name,image_url,location,actual_value,requirements,
    claim_method,claim_url,redemption_instructions,source_url,source_type,starts_at,expires_at,submitter_contact,verification_status,approval_status)
  values (coalesce(nullif(p->>'city_key',''),'atlanta'), left(p->>'title',140), left(p->>'description',2000), p->>'category', p->>'offer_type',
    left(p->>'merchant_name',160), nullif(p->>'image_url',''), left(p->>'location',300), left(p->>'actual_value',120), left(p->>'requirements',1000),
    nullif(p->>'claim_method',''), nullif(p->>'claim_url',''), left(p->>'redemption_instructions',1000), nullif(p->>'source_url',''), 'partner',
    nullif(p->>'starts_at','')::timestamptz, nullif(p->>'expires_at','')::timestamptz, left(p->>'submitter_contact',200), 'pending', 'submitted')
  returning id into v_id;
  return v_id;
end $fn$;
revoke all on function public.gt_submit_offer(jsonb) from public;
grant execute on function public.gt_submit_offer(jsonb) to anon, authenticated;

-- Analytics: raw interaction events. claim_click = someone tapped Claim (NOT a confirmed redemption).
create table if not exists public.gt_offer_events (
  id bigint generated always as identity primary key,
  offer_id uuid references public.gt_offers(id) on delete set null,
  show_id uuid,
  city_key text not null default 'atlanta',
  event_type text not null check (event_type in ('section_view','category_view','impression','detail_view','save','share','claim_click','external_click','rsvp_click','ig_referral','alert_opt_in')),
  category text,
  anon_id text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists gt_offer_events_offer_idx on public.gt_offer_events(offer_id, event_type, created_at desc);
alter table public.gt_offer_events enable row level security;
revoke all on public.gt_offer_events from anon, authenticated;

create or replace function public.gt_track_offer_event(p jsonb)
returns void language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
begin
  insert into public.gt_offer_events(offer_id, show_id, city_key, event_type, category, anon_id, utm_source, utm_medium, utm_campaign, utm_content, referrer)
  values (case when (p->>'offer_id') ~ '^[0-9a-f-]{36}$' and exists(select 1 from public.gt_offers o where o.id=(p->>'offer_id')::uuid) then (p->>'offer_id')::uuid end,
          case when (p->>'show_id') ~ '^[0-9a-f-]{36}$' then (p->>'show_id')::uuid end,
          coalesce(nullif(left(p->>'city_key',40),''),'atlanta'), p->>'event_type', left(p->>'category',40), left(p->>'anon_id',64),
          left(p->>'utm_source',80), left(p->>'utm_medium',80), left(p->>'utm_campaign',120), left(p->>'utm_content',120), left(p->>'referrer',300));
end $fn$;
revoke all on function public.gt_track_offer_event(jsonb) from public;
grant execute on function public.gt_track_offer_event(jsonb) to anon, authenticated;

-- Admin: queue, approve/reject/feature/expire, reporting. Service role only (internal dashboard / n8n / ops).
create or replace function public.gt_admin_review_offer(p_offer_id uuid, p_action text, p_reviewer text, p_note text default null,
  p_verified_source_url text default null, p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare o public.gt_offers%rowtype;
begin
  select * into o from public.gt_offers where id=p_offer_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
  case p_action
    when 'verify' then update public.gt_offers set verification_status='verified', verified_at=now(), source_url=coalesce(p_verified_source_url,source_url),
      expires_at=coalesce(p_expires_at,expires_at), reviewed_by=p_reviewer, reviewed_at=now(), review_note=p_note where id=o.id;
    when 'approve' then update public.gt_offers set approval_status='approved', reviewed_by=p_reviewer, reviewed_at=now(), review_note=coalesce(p_note,review_note) where id=o.id;
    when 'reject' then update public.gt_offers set approval_status='rejected', verification_status='rejected', reviewed_by=p_reviewer, reviewed_at=now(), review_note=p_note where id=o.id;
    when 'flag' then update public.gt_offers set verification_status='flagged', approval_status='submitted', reviewed_by=p_reviewer, reviewed_at=now(), review_note=p_note where id=o.id;
    when 'feature' then update public.gt_offers set featured=true, featured_on=current_date where id=o.id;
    when 'unfeature' then update public.gt_offers set featured=false, featured_on=null where id=o.id;
    when 'expire' then update public.gt_offers set verification_status='expired', expires_at=least(coalesce(expires_at,now()),now()) where id=o.id;
    when 'set_expiration' then update public.gt_offers set expires_at=p_expires_at where id=o.id;
    else return jsonb_build_object('ok',false,'reason','unknown_action');
  end case;
  return jsonb_build_object('ok',true,'action',p_action);
end $fn$;
revoke all on function public.gt_admin_review_offer(uuid,text,text,text,text,timestamptz) from public, anon, authenticated;

create or replace view public.v_gt_offers_admin_queue with (security_invoker = true) as
  select o.*, (select count(*) from public.gt_offers d where d.city_key=o.city_key and d.dedupe_key=o.dedupe_key and d.id<>o.id) as duplicate_count,
    (o.expires_at is not null and o.expires_at < now()) as is_expired
  from public.gt_offers o
  order by (o.approval_status='submitted') desc, o.created_at desc;
revoke all on public.v_gt_offers_admin_queue from anon, authenticated;

create or replace view public.v_gt_offer_metrics with (security_invoker = true) as
  select o.id as offer_id, o.title, o.category, o.city_key,
    count(e.*) filter (where e.event_type='impression') impressions,
    count(e.*) filter (where e.event_type='detail_view') detail_views,
    count(e.*) filter (where e.event_type='save') saves,
    count(e.*) filter (where e.event_type='share') shares,
    count(e.*) filter (where e.event_type='claim_click') claim_clicks,
    count(e.*) filter (where e.event_type='external_click') external_clicks,
    count(e.*) filter (where e.event_type='rsvp_click') rsvp_clicks,
    count(e.*) filter (where e.utm_source ilike 'instagram%' or e.event_type='ig_referral') instagram_referrals
  from public.gt_offers o left join public.gt_offer_events e on e.offer_id=o.id
  group by o.id;
revoke all on public.v_gt_offer_metrics from anon, authenticated;

-- Daily expiry sweep.
create or replace function public.gt_expire_offers_v1() returns integer language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare n integer;
begin
  update public.gt_offers set verification_status='expired', featured=false where verification_status='verified' and expires_at is not null and expires_at < now();
  get diagnostics n = row_count; return n;
end $fn$;
revoke all on function public.gt_expire_offers_v1() from public, anon, authenticated;
-- Expired offers are already hidden at read time (RLS + view). A scheduled sweep (gt_expire_offers_v1) is
-- optional housekeeping and is scheduled separately with owner approval.

-- Admin key for the FREE IN THE A admin API (gt-offers-admin). Value lives only in public.credentials (service role).
insert into public.credentials(credential_type, credential_key, credential_value, is_active)
select 'api_key', 'gt_free_in_the_a_admin', jsonb_build_object('api_key', replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''), 'purpose','FREE IN THE A admin console'), true
where not exists (select 1 from public.credentials where credential_key='gt_free_in_the_a_admin');

-- Advisor fix (2026-11-10): trigger function from the editorial migration is not an API endpoint.
revoke all on function public.gt_venue_hero_guard() from public, anon, authenticated;

-- Photo guard v2 (2026-11-10): an og:image that was reviewed and rejected as a logo/graphic is never re-applied
-- by a later site-signals scan.
create or replace function public.gt_venue_hero_guard()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
begin
  if tg_op='UPDATE' and coalesce(trim(new.hero_image),'') <> ''
     and regexp_replace(lower(trim(new.hero_image)),'\?.*$','') = regexp_replace(lower(trim(coalesce(old.metadata->>'rejected_og_image',''))),'\?.*$','') then
    new.hero_image := null;
    new.photo_status := 'official_site_logo_rejected';
    return new;
  end if;
  if new.status='active' and coalesce(trim(new.hero_image),'') <> '' and public.gt_hero_image_in_use(new.hero_image, new.id) then
    new.metadata := coalesce(new.metadata,'{}'::jsonb) || jsonb_build_object('duplicate_hero_image_dropped', new.hero_image, 'duplicate_hero_dropped_at', now());
    new.hero_image := null;
  end if;
  return new;
end $fn$;
revoke all on function public.gt_venue_hero_guard() from public, anon, authenticated;
