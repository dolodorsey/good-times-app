begin;

revoke all on function public.gt_normalize_eventbrite_source_url()
from service_role, postgres;

grant execute on function public.gt_normalize_eventbrite_source_url()
to public, anon, authenticated, service_role, postgres;

commit;

-- This rollback restores the former broad function grant. The table trigger is
-- active before and after rollback.
