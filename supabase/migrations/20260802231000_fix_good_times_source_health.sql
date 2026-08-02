begin;

create or replace function public.gt_normalize_event_source_health()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.last_scrape_status = 'success'
     and coalesce(new.events_found_last_run, 0) = 0 then
    new.last_scrape_status := 'empty';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gt_normalize_event_source_health
on public.gt_event_sources;

create trigger trg_gt_normalize_event_source_health
before insert or update of last_scrape_status, events_found_last_run
on public.gt_event_sources
for each row
execute function public.gt_normalize_event_source_health();

-- Correct existing false-positive health states. No source content or event data
-- is deleted by this update.
update public.gt_event_sources
set last_scrape_status = 'empty',
    updated_at = now()
where last_scrape_status = 'success'
  and coalesce(events_found_last_run, 0) = 0;

-- Current official calendar locations, verified 2026-08-02. Preserve each
-- source's legacy allowed scrape_method; the direct Edge Function collector is
-- recorded in replacement_method rather than expanding a production enum here.
update public.gt_event_sources
set source_url = 'https://aisle5atl.com/calendar/',
    replacement_method = 'direct_jsonld_official_calendar_verified_2026_08_02',
    is_active = true,
    updated_at = now()
where id = '63de734f-309c-43f5-9571-a46263b2136b';

update public.gt_event_sources
set source_url = 'https://www.cocacolaroxy.com/',
    replacement_method = 'direct_jsonld_official_calendar_verified_2026_08_02',
    is_active = true,
    updated_at = now()
where id = '065aa875-b12e-44b7-b633-a4f80f8f47fb';

update public.gt_event_sources
set source_url = 'https://www.variety-playhouse.com/calendar/',
    replacement_method = 'direct_jsonld_official_calendar_verified_2026_08_02',
    is_active = true,
    updated_at = now()
where id = '289bdf4f-4be2-489c-8551-e15b6cfc3cec';

-- The official Discover Atlanta calendar is valuable, but its current site
-- rejects the direct Edge Function collector. Keep the canonical record while
-- pausing repeated failed requests until a provider-specific adapter is added.
update public.gt_event_sources
set source_url = 'https://discoveratlanta.com/events/all/',
    scrape_method = 'none',
    replacement_method = 'paused_http_403_pending_adapter_2026_08_02',
    is_active = false,
    updated_at = now()
where id = '849e861a-61bb-4eb8-a2a1-654537119a2f';

-- Duplicate legacy Discover Atlanta record.
update public.gt_event_sources
set scrape_method = 'none',
    replacement_method = 'duplicate_of_849e861a_61bb_4eb8_a2a1_654537119a2f',
    is_active = false,
    updated_at = now()
where id = '5b732ede-f532-431f-960f-2a3942a28a8c';

-- The former Atlanta CultureMap hostname no longer resolves. Preserve the row
-- for provenance but stop repeated DNS failures.
update public.gt_event_sources
set scrape_method = 'none',
    replacement_method = 'retired_hostname_unresolvable_2026_08_02',
    is_active = false,
    updated_at = now()
where id = 'bfa10c9f-1aa5-4711-aefa-eb95b270dd23';

create or replace view public.v_gt_event_source_health
with (security_invoker = true)
as
select
  s.id,
  lower(s.city) as city_key,
  s.source_name,
  s.source_type,
  s.source_url,
  s.scrape_method,
  s.replacement_method,
  s.is_active,
  s.last_scrape_status,
  coalesce(s.events_found_last_run, 0) as events_found_last_run,
  s.last_scraped_at,
  case
    when not s.is_active then 'paused'
    when s.last_scraped_at is null then 'never_run'
    when s.last_scrape_status = 'failed' then 'failed'
    when s.last_scrape_status = 'empty' then 'empty'
    when coalesce(s.events_found_last_run, 0) > 0 then 'productive'
    when s.last_scraped_at < now() - interval '48 hours' then 'stale'
    else 'unknown'
  end as health_state,
  case
    when not s.is_active then 5
    when s.last_scrape_status = 'failed' then 1
    when s.last_scraped_at is null then 2
    when s.last_scrape_status = 'empty' then 3
    when s.last_scraped_at < now() - interval '48 hours' then 4
    when coalesce(s.events_found_last_run, 0) > 0 then 6
    else 0
  end as health_sort
from public.gt_event_sources s;

revoke all on table public.v_gt_event_source_health
from public, anon, authenticated;
grant select on table public.v_gt_event_source_health
to service_role, postgres;

comment on function public.gt_normalize_event_source_health() is
'Prevents a zero-result source run from being labeled successful. Zero usable entries are explicitly marked empty.';

comment on view public.v_gt_event_source_health is
'Private GOOD TIMES source-health register separating productive, empty, failed, stale, never-run, and intentionally paused sources.';

commit;
