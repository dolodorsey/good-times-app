-- First-time rows have no persisted state. Use -infinity rather than now() so
-- API-side timestamp filters do not race the database clock by milliseconds.
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
  coalesce(s.next_check_at, '-infinity'::timestamptz) as next_check_at,
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
