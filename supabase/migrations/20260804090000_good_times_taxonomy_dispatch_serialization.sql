-- Serialize GOOD TIMES taxonomy stocking dispatches.
-- One exact category source request per cycle prevents promotion/ranking deadlocks.

create or replace function public.gt_dispatch_taxonomy_sourcing_queue(p_limit integer default 1)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $function$
declare
  r record;
  v_source_ids uuid[];
  v_request_id bigint;
  v_collector text;
  v_error text;
begin
  perform public.gt_refresh_taxonomy_sourcing_queue();

  select q.*
    into r
  from public.gt_taxonomy_sourcing_queue q
  join public.v_gt_atlanta_category_stock_health c using(category_key)
  where q.city_key='atlanta'
    and q.status in ('queued','failed')
    and q.next_action_at<=now()
    and (q.inventory_gap>0 or q.information_completeness_pct<75)
  order by
    case when c.upcoming_inventory=0 then 0 else 1 end,
    q.priority desc,
    q.last_dispatched_at nulls first,
    q.inventory_gap desc,
    q.information_completeness_pct,
    q.updated_at
  for update of q skip locked
  limit 1;

  if not found then
    return jsonb_build_object('dispatched',0,'reason','no_ready_gap','finished_at',now());
  end if;

  begin
    -- Prefer one exact, quality-gated Eventbrite lane for the target category.
    select array[id]
      into v_source_ids
    from public.gt_event_sources
    where lower(city)='atlanta'
      and is_active=true
      and source_type='eventbrite'
      and scrape_category=r.source_lane
    order by
      case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
      coalesce(scrape_priority,0) desc,
      last_scraped_at nulls first,
      source_name
    limit 1;

    if coalesce(cardinality(v_source_ids),0)>0 then
      v_request_id:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_source_ids);
      v_collector:='eventbrite';
    else
      -- Then use one exact official/direct source. Never reuse a known failed source.
      select array[id]
        into v_source_ids
      from public.gt_event_sources
      where lower(city)='atlanta'
        and is_active=true
        and source_type in ('official','venue','comedy_club','blog','aggregator')
        and coalesce(last_scrape_status,'pending')<>'failed'
        and scrape_category=r.source_lane
      order by
        case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
        coalesce(scrape_priority,0) desc,
        last_scraped_at nulls first,
        source_name
      limit 1;

      if coalesce(cardinality(v_source_ids),0)>0 then
        v_request_id:=public.gt_run_atlanta_direct_sources_by_ids(v_source_ids);
        v_collector:='direct';
      else
        -- Last resort: one general quality-gated Eventbrite page, not a broad parallel sweep.
        select array[id]
          into v_source_ids
        from public.gt_event_sources
        where lower(city)='atlanta'
          and is_active=true
          and source_type='eventbrite'
          and scrape_category='general'
        order by
          case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
          coalesce(scrape_priority,0) desc,
          last_scraped_at nulls first,
          source_name
        limit 1;

        if coalesce(cardinality(v_source_ids),0)>0 then
          v_request_id:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_source_ids);
          v_collector:='eventbrite_general';
        else
          raise exception 'No eligible source lane for %',r.subcategory_key;
        end if;
      end if;
    end if;

    update public.gt_taxonomy_sourcing_queue
    set status='dispatched',last_dispatched_at=now(),next_action_at=now()+interval '4 hours',
        last_direct_request_id=case when v_collector='direct' then v_request_id else last_direct_request_id end,
        last_eventbrite_request_id=case when v_collector like 'eventbrite%' then v_request_id else last_eventbrite_request_id end,
        attempt_count=attempt_count+1,
        last_result=jsonb_build_object(
          'collector',v_collector,
          'source_ids',to_jsonb(v_source_ids),
          'request_id',v_request_id,
          'dispatched_at',now()
        ),updated_at=now()
    where city_key=r.city_key and subcategory_key=r.subcategory_key;

    return jsonb_build_object(
      'dispatched',1,
      'category_key',r.category_key,
      'subcategory_key',r.subcategory_key,
      'collector',v_collector,
      'source_ids',to_jsonb(v_source_ids),
      'request_id',v_request_id,
      'finished_at',now()
    );
  exception when others then
    get stacked diagnostics v_error=message_text;
    update public.gt_taxonomy_sourcing_queue
    set status='failed',next_action_at=now()+interval '2 hours',attempt_count=attempt_count+1,
        last_result=jsonb_build_object('error',left(v_error,500),'failed_at',now()),updated_at=now()
    where city_key=r.city_key and subcategory_key=r.subcategory_key;
    return jsonb_build_object(
      'dispatched',0,'failed',1,'category_key',r.category_key,
      'subcategory_key',r.subcategory_key,'error',left(v_error,500),'finished_at',now()
    );
  end;
end;
$function$;

revoke all on function public.gt_dispatch_taxonomy_sourcing_queue(integer) from public,anon,authenticated;
grant execute on function public.gt_dispatch_taxonomy_sourcing_queue(integer) to service_role;

update public.gt_taxonomy_sourcing_queue
set status=case when current_inventory>=target_inventory and information_completeness_pct>=75 then 'resolved' else 'queued' end,
    next_action_at=now(),updated_at=now()
where city_key='atlanta';

select cron.unschedule(jobid)
from cron.job
where jobname='gt-taxonomy-stock-dispatch';

select cron.schedule(
  'gt-taxonomy-stock-dispatch',
  '50 * * * *',
  $cmd$select public.gt_dispatch_taxonomy_sourcing_queue(1);$cmd$
);
