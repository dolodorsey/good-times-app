begin;

alter table public.gt_sourced_events enable row level security;
alter table public.gt_event_sources enable row level security;
alter table public.gt_culture_intake_queue enable row level security;

-- Public and signed-in clients may read currently published source data, but must
-- never mutate the internal sourcing ledger directly.
revoke insert, update, delete, truncate, references, trigger
  on table public.gt_sourced_events
  from anon, authenticated;

-- Intake is an internal service queue. No browser role should reach it.
revoke all privileges
  on table public.gt_culture_intake_queue
  from anon, authenticated;

-- Source configuration is private to staff. Preserve authenticated SELECT so the
-- existing staff-only RLS policy can continue to govern approved operators.
revoke all privileges
  on table public.gt_event_sources
  from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.gt_event_sources
  from authenticated;
grant select on table public.gt_event_sources to authenticated;

-- Promotion mutates production show data and is called only by trusted collectors.
revoke execute on function public.gt_promote_sourced_to_shows(text, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.gt_promote_sourced_to_shows(text, boolean, integer)
  to service_role, postgres;

commit;
