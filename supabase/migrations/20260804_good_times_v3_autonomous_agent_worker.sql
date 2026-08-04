-- GOOD TIMES V3 autonomous operational worker.
-- Claims tasks atomically, evaluates live Gateway health, refreshes taste memory,
-- records run and QA evidence, retries failures, and runs every five minutes.

create or replace function public.gt_refresh_intelligence_profiles()
returns integer
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_count integer;
begin
  with signal_base as (
    select s.auth_id,s.entity_id,s.signal_type,s.signal_value,s.metadata,s.occurred_at,
           case
             when coalesce(s.signal_value,0)<0 or lower(s.signal_type) in ('dismiss','hide','not_interested','skip','dislike') then -1
             else 1
           end as direction,
           exp(-ln(2.0)*extract(epoch from (now()-s.occurred_at))/(45.0*86400.0))
             * greatest(abs(coalesce(s.signal_value,1)),0.1) as decayed_weight
    from public.gt_taste_signals s
  ), counts as (
    select auth_id,count(*)::integer signal_count,
           count(*) filter(where direction>0)::integer positive_count,
           count(*) filter(where direction<0)::integer negative_count,
           max(occurred_at) last_signal_at
    from signal_base group by auth_id
  ), category_maps as (
    select auth_id,jsonb_object_agg(category_key,round(weight_sum::numeric,4)) category_affinity
    from (
      select auth_id,lower(nullif(trim(metadata->>'category'),'')) category_key,
             sum(direction*decayed_weight) weight_sum
      from signal_base
      where nullif(trim(metadata->>'category'),'') is not null
      group by auth_id,lower(nullif(trim(metadata->>'category'),''))
    ) q group by auth_id
  ), neighborhood_maps as (
    select auth_id,jsonb_object_agg(neighborhood_key,round(weight_sum::numeric,4)) neighborhood_affinity
    from (
      select auth_id,lower(nullif(trim(metadata->>'neighborhood'),'')) neighborhood_key,
             sum(direction*decayed_weight) weight_sum
      from signal_base
      where nullif(trim(metadata->>'neighborhood'),'') is not null
      group by auth_id,lower(nullif(trim(metadata->>'neighborhood'),''))
    ) q group by auth_id
  ), daypart_maps as (
    select auth_id,jsonb_object_agg(daypart_key,round(weight_sum::numeric,4)) daypart_affinity
    from (
      select auth_id,lower(nullif(trim(metadata->>'daypart'),'')) daypart_key,
             sum(direction*decayed_weight) weight_sum
      from signal_base
      where nullif(trim(metadata->>'daypart'),'') is not null
      group by auth_id,lower(nullif(trim(metadata->>'daypart'),''))
    ) q group by auth_id
  ), price_maps as (
    select auth_id,jsonb_object_agg(price_key,round(weight_sum::numeric,4)) price_affinity
    from (
      select auth_id,lower(nullif(trim(metadata->>'price_range'),'')) price_key,
             sum(direction*decayed_weight) weight_sum
      from signal_base
      where nullif(trim(metadata->>'price_range'),'') is not null
      group by auth_id,lower(nullif(trim(metadata->>'price_range'),''))
    ) q group by auth_id
  ), suppression_maps as (
    select auth_id,jsonb_build_object(
      'entity_ids',coalesce(jsonb_agg(entity_id order by last_negative desc),'[]'::jsonb)
    ) suppression_rules
    from (
      select auth_id,entity_id,max(occurred_at) last_negative
      from signal_base where direction<0
      group by auth_id,entity_id
    ) q group by auth_id
  ), upserted as (
    insert into public.gt_user_intelligence_profiles(
      auth_id,maturity_stage,signal_count,positive_signal_count,negative_signal_count,
      category_affinity,neighborhood_affinity,daypart_affinity,price_affinity,suppression_rules,
      exploration_rate,last_signal_at,computed_at,updated_at
    )
    select c.auth_id,
           case when c.signal_count<5 then 'cold'
                when c.signal_count<20 then 'learning'
                when c.signal_count<50 then 'familiar'
                else 'mature' end,
           c.signal_count,c.positive_count,c.negative_count,
           coalesce(cm.category_affinity,'{}'::jsonb),
           coalesce(nm.neighborhood_affinity,'{}'::jsonb),
           coalesce(dm.daypart_affinity,'{}'::jsonb),
           coalesce(pm.price_affinity,'{}'::jsonb),
           coalesce(sm.suppression_rules,'{}'::jsonb),
           case when c.signal_count<5 then 0.35
                when c.signal_count<20 then 0.25
                when c.signal_count<50 then 0.15
                else 0.10 end,
           c.last_signal_at,now(),now()
    from counts c
    left join category_maps cm using(auth_id)
    left join neighborhood_maps nm using(auth_id)
    left join daypart_maps dm using(auth_id)
    left join price_maps pm using(auth_id)
    left join suppression_maps sm using(auth_id)
    on conflict(auth_id) do update set
      maturity_stage=excluded.maturity_stage,
      signal_count=excluded.signal_count,
      positive_signal_count=excluded.positive_signal_count,
      negative_signal_count=excluded.negative_signal_count,
      category_affinity=excluded.category_affinity,
      neighborhood_affinity=excluded.neighborhood_affinity,
      daypart_affinity=excluded.daypart_affinity,
      price_affinity=excluded.price_affinity,
      suppression_rules=excluded.suppression_rules,
      exploration_rate=excluded.exploration_rate,
      last_signal_at=excluded.last_signal_at,
      computed_at=now(),updated_at=now()
    returning auth_id
  )
  select count(*) into v_count from upserted;
  return coalesce(v_count,0);
end;$$;

create or replace function public.gt_enqueue_due_operational_tasks()
returns integer
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_count integer;
begin
  with due as (
    select t.*
    from public.gt_operational_task_templates t
    where t.is_active
      and (t.last_enqueued_at is null or t.last_enqueued_at<=now()-make_interval(mins=>t.cadence_minutes))
      and not exists (
        select 1 from public.gt_agent_tasks q
        where q.agent_key=t.agent_key and q.task_type=t.task_type and q.auth_id is null
          and q.status in ('queued','running','waiting_review')
      )
  ), inserted as (
    insert into public.gt_agent_tasks(agent_key,task_type,input,status,priority,available_at,max_attempts)
    select agent_key,task_type,input,'queued',priority,now(),3 from due
    on conflict do nothing
    returning agent_key,task_type
  ), touched as (
    update public.gt_operational_task_templates t
    set last_enqueued_at=now(),updated_at=now()
    where exists(
      select 1 from inserted i where i.agent_key=t.agent_key and i.task_type=t.task_type
    )
    returning t.template_key
  )
  select count(*) into v_count from touched;
  return coalesce(v_count,0);
end;$$;

create or replace function public.gt_claim_agent_task(p_worker_id text default 'gt-v3-pg-worker')
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_task public.gt_agent_tasks%rowtype; v_run_id uuid;
begin
  select * into v_task
  from public.gt_agent_tasks
  where status='queued' and available_at<=now() and attempts<max_attempts
  order by priority desc,available_at,created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.gt_agent_tasks
  set status='running',locked_at=now(),
      locked_by=left(coalesce(nullif(p_worker_id,''),'gt-v3-pg-worker'),120),
      attempts=attempts+1,updated_at=now(),error_message=null
  where id=v_task.id
  returning * into v_task;

  insert into public.gt_agent_run_ledger(
    task_id,agent_key,auth_id,status,input_summary,started_at
  ) values (
    v_task.id,v_task.agent_key,v_task.auth_id,'started',
    jsonb_build_object(
      'task_type',v_task.task_type,
      'input',v_task.input,
      'attempt',v_task.attempts,
      'worker',v_task.locked_by
    ),now()
  ) returning id into v_run_id;

  return jsonb_build_object(
    'task_id',v_task.id,
    'run_id',v_run_id,
    'agent_key',v_task.agent_key,
    'task_type',v_task.task_type,
    'input',v_task.input,
    'attempts',v_task.attempts,
    'max_attempts',v_task.max_attempts
  );
end;$$;

create or replace function public.gt_complete_agent_task(
  p_task_id uuid,
  p_run_id uuid,
  p_result jsonb,
  p_metric_key text,
  p_score numeric,
  p_threshold numeric,
  p_passed boolean
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_agent_key text; v_started timestamptz;
begin
  update public.gt_agent_tasks
  set status='completed',result=coalesce(p_result,'{}'::jsonb),
      completed_at=now(),updated_at=now(),locked_at=null,locked_by=null
  where id=p_task_id and status='running'
  returning agent_key into v_agent_key;

  if v_agent_key is null then raise exception 'Running task not found'; end if;

  select started_at into v_started
  from public.gt_agent_run_ledger
  where id=p_run_id and task_id=p_task_id;

  update public.gt_agent_run_ledger
  set status='completed',output_summary=coalesce(p_result,'{}'::jsonb),
      duration_ms=greatest(0,(extract(epoch from (now()-coalesce(v_started,now())))*1000)::integer),
      completed_at=now()
  where id=p_run_id and task_id=p_task_id;

  insert into public.gt_agent_quality_evaluations(
    run_id,agent_key,metric_key,score,passed,threshold,details
  ) values (
    p_run_id,v_agent_key,left(coalesce(nullif(p_metric_key,''),'execution_quality'),120),
    greatest(0,least(100,coalesce(p_score,0))),coalesce(p_passed,false),p_threshold,
    jsonb_build_object('task_id',p_task_id,'result',coalesce(p_result,'{}'::jsonb))
  );

  update public.gt_agent_registry
  set last_run_at=now(),updated_at=now()
  where agent_key=v_agent_key;
end;$$;

create or replace function public.gt_fail_agent_task(
  p_task_id uuid,p_run_id uuid,p_error text
)
returns void
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_attempts integer; v_max integer; v_started timestamptz;
begin
  select attempts,max_attempts into v_attempts,v_max
  from public.gt_agent_tasks where id=p_task_id for update;

  select started_at into v_started
  from public.gt_agent_run_ledger where id=p_run_id;

  update public.gt_agent_run_ledger
  set status='failed',error_message=left(coalesce(p_error,'Unknown worker error'),1000),
      duration_ms=greatest(0,(extract(epoch from (now()-coalesce(v_started,now())))*1000)::integer),
      completed_at=now()
  where id=p_run_id;

  update public.gt_agent_tasks
  set status=case when coalesce(v_attempts,0)<coalesce(v_max,3) then 'queued' else 'failed' end,
      available_at=case
        when coalesce(v_attempts,0)<coalesce(v_max,3)
          then now()+make_interval(mins=>least(30,greatest(2,v_attempts*5)))
        else available_at end,
      error_message=left(coalesce(p_error,'Unknown worker error'),1000),
      updated_at=now(),locked_at=null,locked_by=null,
      completed_at=case when coalesce(v_attempts,0)>=coalesce(v_max,3) then now() else null end
  where id=p_task_id;
end;$$;

create or replace function public.gt_release_stale_agent_tasks(p_stale_minutes integer default 20)
returns integer
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare v_count integer;
begin
  with stale as (
    select id from public.gt_agent_tasks
    where status='running'
      and locked_at<now()-make_interval(mins=>greatest(5,p_stale_minutes))
    for update skip locked
  ), updated as (
    update public.gt_agent_tasks t
    set status=case when attempts<max_attempts then 'queued' else 'failed' end,
        available_at=case when attempts<max_attempts then now()+interval '5 minutes' else available_at end,
        error_message='Released stale worker lock',locked_at=null,locked_by=null,updated_at=now(),
        completed_at=case when attempts>=max_attempts then now() else completed_at end
    where t.id in(select id from stale)
    returning t.id
  )
  select count(*) into v_count from updated;

  update public.gt_agent_run_ledger
  set status='failed',error_message='Worker lock expired',completed_at=now()
  where status='started'
    and started_at<now()-make_interval(mins=>greatest(5,p_stale_minutes));

  return coalesce(v_count,0);
end;$$;

create or replace function public.gt_gateway_rpc(p_rpc text)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','extensions'
as $$
declare v_response extensions.http_response;
begin
  if p_rpc not in ('gt_get_public_pipeline_health','gt_get_public_city_readiness') then
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
end;$$;

create or replace function public.gt_execute_operational_cycle(
  p_max_tasks integer default 10,
  p_worker_id text default 'gt-v3-pg-cron'
)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare
  v_claim jsonb; v_task_id uuid; v_run_id uuid; v_task_type text;
  v_pipeline jsonb; v_cities jsonb; v_result jsonb;
  v_score numeric; v_threshold numeric; v_passed boolean;
  v_profiles integer:=0; v_processed integer:=0; v_failed integer:=0; v_error text;
  v_active numeric; v_success numeric; v_sourcers numeric; v_expected numeric;
  v_fresh_events numeric; v_fresh_venues numeric;
  v_avg_venue_action numeric; v_avg_venue_image numeric; v_total_cities numeric;
begin
  perform public.gt_release_stale_agent_tasks(20);
  perform public.gt_enqueue_due_operational_tasks();

  for i in 1..least(greatest(coalesce(p_max_tasks,10),1),50) loop
    v_claim:=public.gt_claim_agent_task(p_worker_id);
    exit when v_claim is null;

    v_task_id:=(v_claim->>'task_id')::uuid;
    v_run_id:=(v_claim->>'run_id')::uuid;
    v_task_type:=v_claim->>'task_type';

    begin
      if v_task_type in (
        'source_health_audit','event_intake_cycle','data_gap_prioritization',
        'venue_enrichment_cycle','image_quality_audit'
      ) then
        if v_pipeline is null then
          v_pipeline:=public.gt_gateway_rpc('gt_get_public_pipeline_health');
        end if;
        if v_cities is null then
          v_cities:=public.gt_gateway_rpc('gt_get_public_city_readiness');
        end if;

        select count(*)::numeric,
               count(*) filter(
                 where coalesce((x->>'event_age_hours')::numeric,999999)<=72
               )::numeric,
               count(*) filter(
                 where coalesce((x->>'venue_age_days')::numeric,999999)<=30
               )::numeric,
               coalesce(avg((x->>'venue_action_coverage')::numeric),0),
               coalesce(avg((x->>'venue_image_coverage')::numeric),0)
        into v_total_cities,v_fresh_events,v_fresh_venues,
             v_avg_venue_action,v_avg_venue_image
        from jsonb_array_elements(v_cities) x;

        v_active:=coalesce((v_pipeline->>'active_jobs')::numeric,0);
        v_success:=coalesce((v_pipeline->>'latest_successful_jobs')::numeric,0);
        v_sourcers:=coalesce((v_pipeline->>'active_city_sourcers')::numeric,0);
        v_expected:=greatest(
          coalesce((v_pipeline->>'expected_non_atlanta_sourcers')::numeric,10),1
        );

        if v_task_type='source_health_audit' then
          v_score:=case when v_active=0 then 0 else round(100*v_success/v_active,2) end;
          v_threshold:=90;
          v_passed:=v_score>=v_threshold;
          v_result:=jsonb_build_object(
            'pipeline',v_pipeline,
            'city_count',v_total_cities,
            'audit_state',case when v_passed then 'healthy' else 'attention_required' end
          );
        elsif v_task_type='event_intake_cycle' then
          v_score:=round(
            50*least(v_sourcers/v_expected,1)
            +50*case when v_total_cities=0 then 0 else v_fresh_events/v_total_cities end,
            2
          );
          v_threshold:=80;
          v_passed:=v_score>=v_threshold;
          v_result:=jsonb_build_object(
            'active_city_sourcers',v_sourcers,
            'expected_city_sourcers',v_expected,
            'fresh_event_cities',v_fresh_events,
            'total_cities',v_total_cities,
            'actual_pipeline_active',true,
            'city_readiness',v_cities
          );
        elsif v_task_type='data_gap_prioritization' then
          v_score:=round(
            100*case when v_total_cities=0 then 0
              else coalesce((v_pipeline->>'healthy_cities')::numeric,0)/v_total_cities end,
            2
          );
          v_threshold:=80;
          v_passed:=v_score>=v_threshold;
          v_result:=jsonb_build_object(
            'healthy_cities',coalesce((v_pipeline->>'healthy_cities')::numeric,0),
            'cities_needing_work',coalesce((v_pipeline->>'cities_needing_work')::numeric,0),
            'prioritized_city_readiness',v_cities
          );
        elsif v_task_type='venue_enrichment_cycle' then
          v_score:=round(
            50*v_avg_venue_action
            +50*case when v_total_cities=0 then 0 else v_fresh_venues/v_total_cities end,
            2
          );
          v_threshold:=75;
          v_passed:=v_score>=v_threshold;
          v_result:=jsonb_build_object(
            'average_action_coverage',round(v_avg_venue_action,4),
            'fresh_venue_cities',v_fresh_venues,
            'total_cities',v_total_cities,
            'actual_gateway_workers_active',true,
            'city_readiness',v_cities
          );
        else
          v_score:=round(v_avg_venue_image*100,2);
          v_threshold:=70;
          v_passed:=v_score>=v_threshold;
          v_result:=jsonb_build_object(
            'average_venue_image_coverage',round(v_avg_venue_image,4),
            'image_qa_job_tracked',true,
            'pipeline',v_pipeline,
            'city_readiness',v_cities
          );
        end if;
      elsif v_task_type in ('taste_learning_cycle','memory_profile_refresh') then
        v_profiles:=public.gt_refresh_intelligence_profiles();
        v_score:=100;
        v_threshold:=100;
        v_passed:=true;
        v_result:=jsonb_build_object(
          'profiles_refreshed',v_profiles,
          'taste_signals_total',(select count(*) from public.gt_taste_signals),
          'learning_state',case
            when exists(select 1 from public.gt_taste_signals) then 'signals_processed'
            else 'no_live_signals_yet' end
        );
      else
        raise exception 'Unsupported operational task type: %',v_task_type;
      end if;

      perform public.gt_complete_agent_task(
        v_task_id,v_run_id,v_result,v_task_type||'_quality',
        v_score,v_threshold,v_passed
      );
      v_processed:=v_processed+1;
    exception when others then
      get stacked diagnostics v_error=message_text;
      perform public.gt_fail_agent_task(v_task_id,v_run_id,v_error);
      v_failed:=v_failed+1;
    end;
  end loop;

  return jsonb_build_object(
    'processed',v_processed,
    'failed',v_failed,
    'profiles_refreshed',v_profiles,
    'finished_at',now(),
    'worker_id',p_worker_id
  );
end;$$;

revoke all on function public.gt_refresh_intelligence_profiles() from public;
revoke all on function public.gt_enqueue_due_operational_tasks() from public;
revoke all on function public.gt_claim_agent_task(text) from public;
revoke all on function public.gt_complete_agent_task(uuid,uuid,jsonb,text,numeric,numeric,boolean) from public;
revoke all on function public.gt_fail_agent_task(uuid,uuid,text) from public;
revoke all on function public.gt_release_stale_agent_tasks(integer) from public;
revoke all on function public.gt_gateway_rpc(text) from public;
revoke all on function public.gt_execute_operational_cycle(integer,text) from public;

grant execute on function public.gt_refresh_intelligence_profiles() to service_role;
grant execute on function public.gt_enqueue_due_operational_tasks() to service_role;
grant execute on function public.gt_claim_agent_task(text) to service_role;
grant execute on function public.gt_complete_agent_task(uuid,uuid,jsonb,text,numeric,numeric,boolean) to service_role;
grant execute on function public.gt_fail_agent_task(uuid,uuid,text) to service_role;
grant execute on function public.gt_release_stale_agent_tasks(integer) to service_role;
grant execute on function public.gt_gateway_rpc(text) to service_role;
grant execute on function public.gt_execute_operational_cycle(integer,text) to service_role;

do $$
begin
  if not exists(select 1 from cron.job where jobname='good-times-v3-agent-worker') then
    perform cron.schedule(
      'good-times-v3-agent-worker',
      '*/5 * * * *',
      $cmd$select public.gt_execute_operational_cycle(10,'good-times-v3-pg-cron');$cmd$
    );
  end if;
end $$;
