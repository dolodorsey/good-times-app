-- GOOD TIMES taxonomy stock-health bridge.
-- Connects the Gateway stock matrix to the GOOD TIMES Data Gap Agent and QA ledger.

create or replace function public.gt_gateway_rpc(p_rpc text)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','extensions'
as $function$
declare
  v_response extensions.http_response;
begin
  if p_rpc not in (
    'gt_get_public_pipeline_health',
    'gt_get_public_city_readiness',
    'gt_get_public_atlanta_taxonomy_stock_health'
  ) then
    raise exception 'Gateway RPC not allowed';
  end if;

  v_response := extensions.http((
    'POST',
    'https://dzlmtvodpyhetvektfuo.supabase.co/rest/v1/rpc/'||p_rpc,
    array[
      extensions.http_header('apikey','sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'),
      extensions.http_header('Authorization','Bearer sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'),
      extensions.http_header('Content-Type','application/json')
    ],
    'application/json','{}'
  )::extensions.http_request);

  if v_response.status<>200 then
    raise exception 'Gateway health RPC % returned HTTP %: %',
      p_rpc,v_response.status,left(coalesce(v_response.content,''),300);
  end if;

  return v_response.content::jsonb;
end;
$function$;

create or replace function public.gt_execute_taxonomy_stocking_cycle()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $function$
declare
  v_started timestamptz:=clock_timestamp();
  v_stock jsonb;
  v_task_id uuid;
  v_run_id uuid;
  v_total numeric;
  v_resolved numeric;
  v_open numeric;
  v_empty numeric;
  v_completeness numeric;
  v_score numeric;
  v_threshold numeric:=80;
  v_passed boolean;
  v_result jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('good-times-taxonomy-stocking-agent',0)) then
    return jsonb_build_object('skipped',true,'reason','already_running','finished_at',now());
  end if;

  v_stock:=public.gt_gateway_rpc('gt_get_public_atlanta_taxonomy_stock_health');
  v_total:=coalesce((v_stock->>'subcategory_count')::numeric,0);
  v_resolved:=coalesce((v_stock->>'resolved_subcategories')::numeric,0);
  v_open:=coalesce((v_stock->>'open_subcategories')::numeric,0);
  v_empty:=coalesce((v_stock->>'empty_subcategories')::numeric,0);
  v_completeness:=coalesce((v_stock->>'average_information_completeness_pct')::numeric,0);

  v_score:=round(
    50*case when v_total=0 then 0 else least(v_resolved/v_total,1) end
    +50*least(v_completeness/100,1),
    2
  );
  v_passed:=v_score>=v_threshold and v_open=0 and v_empty=0;

  v_result:=jsonb_build_object(
    'city_key','atlanta',
    'upcoming_events',coalesce((v_stock->>'upcoming_events')::numeric,0),
    'subcategory_count',v_total,
    'resolved_subcategories',v_resolved,
    'open_subcategories',v_open,
    'empty_subcategories',v_empty,
    'average_information_completeness_pct',v_completeness,
    'top_gaps',coalesce(v_stock->'top_gaps','[]'::jsonb),
    'readiness_score',v_score,
    'threshold',v_threshold,
    'passed',v_passed,
    'source_rpc','gt_get_public_atlanta_taxonomy_stock_health',
    'evaluated_at',now()
  );

  insert into public.gt_agent_tasks(
    agent_key,task_type,input,status,priority,available_at,attempts,max_attempts,result,completed_at
  ) values (
    'gt_data_gap_agent','taxonomy_stocking_cycle',
    jsonb_build_object('scope','atlanta','source_rpc','gt_get_public_atlanta_taxonomy_stock_health'),
    'completed',9,now(),1,1,v_result,now()
  ) returning id into v_task_id;

  insert into public.gt_agent_run_ledger(
    task_id,agent_key,status,input_summary,output_summary,duration_ms,started_at,completed_at
  ) values (
    v_task_id,'gt_data_gap_agent','completed',
    jsonb_build_object('scope','atlanta','cycle','taxonomy_stocking'),
    v_result,
    greatest(0,(extract(epoch from (clock_timestamp()-v_started))*1000)::integer),
    v_started,now()
  ) returning id into v_run_id;

  insert into public.gt_agent_quality_evaluations(
    run_id,agent_key,metric_key,score,passed,threshold,details
  ) values (
    v_run_id,'gt_data_gap_agent','taxonomy_stocking_readiness',
    greatest(0,least(100,v_score)),v_passed,v_threshold,v_result
  );

  update public.gt_agent_registry
  set last_run_at=now(),
      config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
        'taxonomy_stock_rpc','gt_get_public_atlanta_taxonomy_stock_health',
        'taxonomy_stock_cadence','hourly',
        'last_taxonomy_stock_score',v_score,
        'last_taxonomy_stock_evaluated_at',now()
      ),
      updated_at=now()
  where agent_key='gt_data_gap_agent';

  return v_result||jsonb_build_object('task_id',v_task_id,'run_id',v_run_id);
end;
$function$;

revoke all on function public.gt_gateway_rpc(text) from public,anon,authenticated;
revoke all on function public.gt_execute_taxonomy_stocking_cycle() from public,anon,authenticated;
grant execute on function public.gt_gateway_rpc(text) to service_role;
grant execute on function public.gt_execute_taxonomy_stocking_cycle() to service_role;

do $block$
begin
  if not exists(select 1 from cron.job where jobname='good-times-taxonomy-stocking-agent') then
    perform cron.schedule(
      'good-times-taxonomy-stocking-agent',
      '55 * * * *',
      $cmd$select public.gt_execute_taxonomy_stocking_cycle();$cmd$
    );
  end if;
end
$block$;
