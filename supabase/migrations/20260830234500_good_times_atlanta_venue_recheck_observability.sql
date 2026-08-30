-- GOOD TIMES only: restore a safe Atlanta venue freshness lane without
-- conflating website reachability with venue operating-status verification.

create table if not exists public.gt_venue_recheck_state (
  venue_id uuid primary key references public.gt_venues(id) on delete cascade,
  city_key text not null,
  last_checked_at timestamptz,
  last_http_status integer,
  last_final_url text,
  last_ok boolean,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  last_error text,
  next_check_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gt_venue_recheck_state enable row level security;
revoke all on table public.gt_venue_recheck_state from public, anon, authenticated;
grant select, insert, update, delete on table public.gt_venue_recheck_state to service_role;

create index if not exists gt_venue_recheck_state_city_next_idx
  on public.gt_venue_recheck_state (city_key, next_check_at, last_checked_at);

create or replace view public.gt_atlanta_venue_recheck_queue
with (security_invoker = true) as
select
  v.id as venue_id,
  v.name,
  v.website,
  v.status as venue_status,
  v.verification_status,
  v.is_verified,
  v.hours,
  v.phone,
  v.address,
  v.hero_image,
  s.last_checked_at,
  s.last_http_status,
  s.last_ok,
  coalesce(s.consecutive_failures, 0) as consecutive_failures,
  coalesce(s.next_check_at, now()) as next_check_at,
  (
    case when v.status = 'needs_reverification' then 100 else 0 end +
    case when coalesce(v.verification_status, 'unverified') <> 'verified_current' then 50 else 0 end +
    case when v.hours is null or v.hours = '{}'::jsonb then 20 else 0 end +
    case when v.phone is null or btrim(v.phone) = '' then 10 else 0 end +
    case when v.address is null or btrim(v.address) = '' then 10 else 0 end +
    case when v.hero_image is null or btrim(v.hero_image) = '' then 5 else 0 end
  )::integer as priority_score
from public.gt_venues v
left join public.gt_venue_recheck_state s on s.venue_id = v.id
where v.city_key = 'atlanta'
  and v.status in ('active', 'needs_reverification', 'pending_review', 'temporarily_closed')
  and v.website is not null
  and btrim(v.website) <> '';

revoke all on table public.gt_atlanta_venue_recheck_queue from public, anon, authenticated;
grant select on table public.gt_atlanta_venue_recheck_queue to service_role;

create or replace view public.gt_venue_data_quality_health
with (security_invoker = true) as
select
  v.city_key,
  count(*)::bigint as customer_candidate_venues,
  count(*) filter (where v.is_verified)::bigint as legacy_verified_flag,
  count(*) filter (where v.verification_status = 'verified_current')::bigint as verified_current,
  count(*) filter (where v.status = 'needs_reverification' or v.verification_status = 'needs_reverification')::bigint as needs_reverification,
  count(*) filter (where v.address is null or btrim(v.address) = '')::bigint as missing_address,
  count(*) filter (where v.phone is null or btrim(v.phone) = '')::bigint as missing_phone,
  count(*) filter (where v.website is null or btrim(v.website) = '')::bigint as missing_website,
  count(*) filter (where v.hero_image is null or btrim(v.hero_image) = '')::bigint as missing_hero_image,
  count(*) filter (where v.hours is null or v.hours = '{}'::jsonb)::bigint as missing_structured_hours,
  count(*) filter (where v.latitude is null or v.longitude is null)::bigint as missing_coordinates,
  round(100.0 * count(*) filter (where v.verification_status = 'verified_current') / nullif(count(*), 0), 2) as verified_current_pct,
  now() as measured_at
from public.gt_venues v
where v.status not in ('closed', 'inactive', 'archived')
group by v.city_key;

revoke all on table public.gt_venue_data_quality_health from public, anon, authenticated;
grant select on table public.gt_venue_data_quality_health to service_role;

create or replace function public.gt_run_atlanta_venue_recheck(p_limit integer default 20)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, pg_temp
as $$
declare
  v_key text;
  v_request_id bigint;
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 20));
begin
  select credential_value->>'api_key'
    into v_key
  from public.credentials
  where credential_key = 'gt_atlanta_source_internal'
    and is_active = true
  limit 1;

  if coalesce(v_key, '') = '' then
    raise exception 'GOOD TIMES internal source credential unavailable';
  end if;

  select net.http_post(
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-venue-recheck',
    headers => jsonb_build_object(
      'content-type', 'application/json',
      'x-khg-internal-key', v_key
    ),
    body => jsonb_build_object('limit', v_limit),
    timeout_milliseconds => 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.gt_run_atlanta_venue_recheck(integer) from public, anon, authenticated;
grant execute on function public.gt_run_atlanta_venue_recheck(integer) to service_role;

comment on function public.gt_run_atlanta_venue_recheck(integer) is
  'GOOD TIMES Atlanta direct-website freshness worker trigger. Website reachability is evidence only and never marks a venue operating-status verified.';

-- Replace only this new job name if the migration is replayed. The disabled legacy
-- gt-atlanta-places-refresh job is intentionally left untouched for forensic history.
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'gt-atlanta-venue-recheck-v2';
exception when others then
  null;
end $$;

select cron.schedule(
  'gt-atlanta-venue-recheck-v2',
  '*/30 * * * *',
  'select public.gt_run_atlanta_venue_recheck(20);'
);
