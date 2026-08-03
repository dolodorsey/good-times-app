begin;

revoke all on function public.gt_normalize_event_source_health()
from service_role, postgres;
revoke all on function public.gt_normalize_sourced_event_type()
from service_role, postgres;

grant execute on function public.gt_normalize_event_source_health()
to public, anon, authenticated, service_role, postgres;
grant execute on function public.gt_normalize_sourced_event_type()
to public, anon, authenticated, service_role, postgres;

commit;

-- Rolling this back restores PostgreSQL's former broad function grants. The
-- trigger behavior itself is unchanged in either direction.
