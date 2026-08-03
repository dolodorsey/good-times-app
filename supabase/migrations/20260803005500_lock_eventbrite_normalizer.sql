begin;

revoke all on function public.gt_normalize_eventbrite_source_url()
from public, anon, authenticated;
grant execute on function public.gt_normalize_eventbrite_source_url()
to service_role, postgres;

comment on function public.gt_normalize_eventbrite_source_url() is
'GOOD TIMES internal gt_sourced_events trigger function. Direct browser-role execution is revoked; URL normalization remains active through the table trigger.';

commit;
