begin;

-- Trigger functions are invoked by their table triggers; browser roles do not
-- need direct EXECUTE permission. PostgreSQL grants function execution to
-- PUBLIC by default, so remove that inherited API surface explicitly.
revoke all on function public.gt_normalize_event_source_health()
from public, anon, authenticated;
revoke all on function public.gt_normalize_sourced_event_type()
from public, anon, authenticated;

grant execute on function public.gt_normalize_event_source_health()
to service_role, postgres;
grant execute on function public.gt_normalize_sourced_event_type()
to service_role, postgres;

comment on function public.gt_normalize_event_source_health() is
'GOOD TIMES internal trigger function. Direct browser-role execution is revoked; the gt_event_sources trigger remains active.';
comment on function public.gt_normalize_sourced_event_type() is
'GOOD TIMES internal trigger function. Direct browser-role execution is revoked; the gt_sourced_events trigger remains active.';

commit;
