-- Agent cycles can legitimately exceed pg_net's five-second default.
create or replace function public.gt_dispatch_external_agent_worker(p_limit integer default 4)
returns bigint
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'net', 'vault'
as $$
declare v_token text; v_request_id bigint;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'good_times_agent_worker_token'
  order by created_at desc
  limit 1;
  if nullif(v_token, '') is null then raise exception 'GOOD TIMES worker token missing'; end if;

  select net.http_post(
    url := 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/good-times-agent-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-token', v_token),
    body := jsonb_build_object('limit', least(10, greatest(1, coalesce(p_limit, 4)))),
    timeout_milliseconds := 50000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.gt_dispatch_external_agent_worker(integer) from public, anon, authenticated;
grant execute on function public.gt_dispatch_external_agent_worker(integer) to service_role;
