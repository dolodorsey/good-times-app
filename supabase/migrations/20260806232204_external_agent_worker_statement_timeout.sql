-- External agent cycles can dispatch several downstream jobs. Give this private
-- service-role-only entry point enough time without changing client RPC limits.
create or replace function public.gt_run_agent_external(
  p_agent_key text,
  p_trigger text default 'external_worker'
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '120s'
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  return public.gt_run_agent_serialized(p_agent_key, p_trigger);
end;
$$;

revoke all on function public.gt_run_agent_external(text, text) from public, anon, authenticated;
grant execute on function public.gt_run_agent_external(text, text) to service_role;
