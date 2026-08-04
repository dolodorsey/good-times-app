-- Lock autonomous worker controls to trusted database/service execution only.

revoke all on function public.gt_refresh_intelligence_profiles() from public,anon,authenticated;
revoke all on function public.gt_enqueue_due_operational_tasks() from public,anon,authenticated;
revoke all on function public.gt_claim_agent_task(text) from public,anon,authenticated;
revoke all on function public.gt_complete_agent_task(uuid,uuid,jsonb,text,numeric,numeric,boolean) from public,anon,authenticated;
revoke all on function public.gt_fail_agent_task(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.gt_release_stale_agent_tasks(integer) from public,anon,authenticated;
revoke all on function public.gt_gateway_rpc(text) from public,anon,authenticated;
revoke all on function public.gt_execute_operational_cycle(integer,text) from public,anon,authenticated;

grant execute on function public.gt_refresh_intelligence_profiles() to service_role;
grant execute on function public.gt_enqueue_due_operational_tasks() to service_role;
grant execute on function public.gt_claim_agent_task(text) to service_role;
grant execute on function public.gt_complete_agent_task(uuid,uuid,jsonb,text,numeric,numeric,boolean) to service_role;
grant execute on function public.gt_fail_agent_task(uuid,uuid,text) to service_role;
grant execute on function public.gt_release_stale_agent_tasks(integer) to service_role;
grant execute on function public.gt_gateway_rpc(text) to service_role;
grant execute on function public.gt_execute_operational_cycle(integer,text) to service_role;
