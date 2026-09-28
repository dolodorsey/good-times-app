-- GOOD TIMES production reconciliation.
-- Applied to content project dzlmtvodpyhetvektfuo as migration 20260928084923.
-- Separates event-stock gaps from venue-coverage and restaurant-enrichment work.
-- Execution agents remain disabled; this migration does not activate schedules or workers.

create or replace function public.gt_refresh_discovery_upgrade_work_queue()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $function$
declare
  v_venue_touched integer := 0;
  v_restaurant_touched integer := 0;
  v_venue_resolved integer := 0;
  v_restaurant_resolved integer := 0;
begin
  insert into public.gt_agent_work_items(
    work_key,agent_key,work_type,target_type,target_key,city_key,
    priority,status,payload,last_seen_at,updated_at
  )
  select
    'gt:venue-coverage:'||c.subcategory_key,
    'GT__DATA_STEWARD',
    'close_venue_taxonomy_coverage',
    'subcategory',
    c.subcategory_key,
    'atlanta',
    case c.venue_coverage_status
      when 'empty' then 95
      when 'thin' then 85
      when 'quality_gap' then 75
      else 50
    end,
    'queued',
    jsonb_build_object(
      'category_key',c.category_key,
      'subcategory_key',c.subcategory_key,
      'subcategory_name',c.subcategory_name,
      'minimum_eligible_venues',c.minimum_eligible_venues,
      'eligible_verified_venues',c.eligible_verified_venues,
      'high_quality_eligible_venues',c.high_quality_eligible_venues,
      'eligible_active_venues',c.eligible_active_venues,
      'eligible_venue_gap',c.venue_gap,
      'venue_coverage_status',c.venue_coverage_status,
      'upcoming_event_inventory',coalesce(s.upcoming_inventory,0),
      'event_inventory_gap',coalesce(s.inventory_gap,0),
      'routing_reason','venue_coverage_not_event_stock'
    ),
    now(),now()
  from public.v_gt_atlanta_venue_eligibility_coverage c
  left join public.v_gt_atlanta_subcategory_coverage s
    on s.category_key=c.category_key
   and s.subcategory_key=c.subcategory_key
  where c.venue_coverage_status <> 'equipped'
  on conflict(work_key) do update set
    priority=excluded.priority,
    payload=excluded.payload,
    last_seen_at=now(),
    status=case
      when public.gt_agent_work_items.status='completed' then 'queued'
      else public.gt_agent_work_items.status
    end,
    completed_at=case
      when public.gt_agent_work_items.status='completed' then null
      else public.gt_agent_work_items.completed_at
    end,
    updated_at=now();
  get diagnostics v_venue_touched=row_count;

  update public.gt_agent_work_items w
  set status='completed',
      completed_at=now(),
      updated_at=now(),
      result=coalesce(result,'{}'::jsonb)||jsonb_build_object(
        'resolved_reason','venue_coverage_equipped',
        'resolved_at',now()
      )
  where w.work_type='close_venue_taxonomy_coverage'
    and w.city_key='atlanta'
    and w.status not in ('completed','cancelled','quarantined')
    and exists (
      select 1
      from public.v_gt_atlanta_venue_eligibility_coverage c
      where c.subcategory_key=w.target_key
        and c.venue_coverage_status='equipped'
    );
  get diagnostics v_venue_resolved=row_count;

  insert into public.gt_agent_work_items(
    work_key,agent_key,work_type,target_type,target_key,city_key,
    priority,status,payload,last_seen_at,updated_at
  )
  select
    'gt:restaurant-enrich:'||r.entity_id::text,
    'GT__DATA_STEWARD',
    'enrich_restaurant_profile',
    'venue',
    r.entity_id::text,
    'atlanta',
    case
      when coalesce(r.quality_score,0)>=80 then 95
      when coalesce(r.quality_score,0)>=70 then 90
      when coalesce(r.quality_score,0)>=60 then 85
      else 80
    end,
    'queued',
    jsonb_build_object(
      'venue_name',r.name,
      'neighborhood',r.neighborhood,
      'quality_score',r.quality_score,
      'verification_status',r.verification_status,
      'profile_confidence',r.profile_confidence,
      'missing_fields',to_jsonb(r.missing_fields),
      'routing_reason','restaurant_profile_enrichment'
    ),
    now(),now()
  from public.v_gt_restaurant_enrichment_queue r
  where r.needs_review=true
  on conflict(work_key) do update set
    priority=excluded.priority,
    payload=excluded.payload,
    last_seen_at=now(),
    status=case
      when public.gt_agent_work_items.status='completed' then 'queued'
      else public.gt_agent_work_items.status
    end,
    completed_at=case
      when public.gt_agent_work_items.status='completed' then null
      else public.gt_agent_work_items.completed_at
    end,
    updated_at=now();
  get diagnostics v_restaurant_touched=row_count;

  update public.gt_agent_work_items w
  set status='completed',
      completed_at=now(),
      updated_at=now(),
      result=coalesce(result,'{}'::jsonb)||jsonb_build_object(
        'resolved_reason','restaurant_profile_enriched',
        'resolved_at',now()
      )
  where w.work_type='enrich_restaurant_profile'
    and w.city_key='atlanta'
    and w.status not in ('completed','cancelled','quarantined')
    and not exists (
      select 1
      from public.v_gt_restaurant_enrichment_queue r
      where r.entity_id::text=w.target_key
        and r.needs_review=true
    );
  get diagnostics v_restaurant_resolved=row_count;

  return jsonb_build_object(
    'venue_work_touched',v_venue_touched,
    'venue_work_resolved',v_venue_resolved,
    'restaurant_work_touched',v_restaurant_touched,
    'restaurant_work_resolved',v_restaurant_resolved,
    'generated_at',now()
  );
end;
$function$;

create or replace function public.gt_dispatch_taxonomy_sourcing_queue(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  v_source_ids uuid[];
  v_request_id bigint;
  v_collector text;
  v_error text;
  v_iteration integer;
  v_max integer:=greatest(1,least(coalesce(p_limit,10),20));
  v_dispatched integer:=0;
  v_failed integer:=0;
  v_results jsonb:='[]'::jsonb;
begin
  perform public.gt_refresh_taxonomy_sourcing_queue();

  for v_iteration in 1..v_max loop
    r:=null; v_source_ids:=null; v_request_id:=null; v_collector:=null; v_error:=null;

    select q.* into r
    from public.gt_taxonomy_sourcing_queue q
    where q.city_key='atlanta'
      and q.status in ('queued','failed')
      and q.next_action_at<=now()
      and q.inventory_gap>0
      and not exists(
        select 1 from public.gt_taxonomy_sourcing_queue recent
        where recent.category_key=q.category_key
          and recent.last_dispatched_at>=date_trunc('minute',now())
      )
    order by
      case q.category_key
        when 'free_things_to_do' then 0
        when 'college_alumni' then 1
        when 'concerts_live_music' then 2
        when 'arts_museums_culture' then 3
        when 'festivals_major_activations' then 4
        else 5
      end,
      case when q.current_inventory=0 then 0 else 1 end,
      q.priority desc,q.inventory_gap desc,
      q.last_dispatched_at nulls first,q.updated_at
    for update of q skip locked
    limit 1;

    exit when not found;

    begin
      select array[id] into v_source_ids
      from public.gt_event_sources
      where lower(city)='atlanta'
        and is_active=true
        and source_type='eventbrite'
        and selectors->>'subcategory_key'=r.subcategory_key
      order by
        case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
        coalesce(scrape_priority,0) desc,
        last_scraped_at nulls first,
        source_name
      limit 1;

      if coalesce(cardinality(v_source_ids),0)>0 then
        v_request_id:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_source_ids);
        v_collector:='eventbrite_subcategory';
      else
        select array[id] into v_source_ids
        from public.gt_event_sources
        where lower(city)='atlanta' and is_active=true
          and source_type='eventbrite' and scrape_category=r.source_lane
        order by
          case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
          coalesce(scrape_priority,0) desc,last_scraped_at nulls first,source_name
        limit 1;

        if coalesce(cardinality(v_source_ids),0)>0 then
          v_request_id:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_source_ids);
          v_collector:='eventbrite_category';
        else
          select array[id] into v_source_ids
          from public.gt_event_sources
          where lower(city)='atlanta' and is_active=true
            and source_type in ('official','venue','comedy_club','blog','aggregator')
            and coalesce(last_scrape_status,'pending')<>'failed'
            and scrape_category=r.source_lane
          order by
            case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end,
            coalesce(scrape_priority,0) desc,last_scraped_at nulls first,source_name
          limit 1;

          if coalesce(cardinality(v_source_ids),0)>0 then
            v_request_id:=public.gt_run_atlanta_direct_sources_by_ids(v_source_ids);
            v_collector:='direct';
          else
            select array[id] into v_source_ids
            from public.gt_event_sources
            where lower(city)='atlanta' and is_active=true
              and source_type='eventbrite' and scrape_category='general'
            order by coalesce(scrape_priority,0) desc,last_scraped_at nulls first,source_name
            limit 1;
            if coalesce(cardinality(v_source_ids),0)>0 then
              v_request_id:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_source_ids);
              v_collector:='eventbrite_general';
            else
              raise exception 'No eligible source lane for %',r.subcategory_key;
            end if;
          end if;
        end if;
      end if;

      update public.gt_taxonomy_sourcing_queue
      set status='dispatched',last_dispatched_at=now(),next_action_at=now()+interval '90 minutes',
          last_direct_request_id=case when v_collector='direct' then v_request_id else last_direct_request_id end,
          last_eventbrite_request_id=case when v_collector like 'eventbrite%' then v_request_id else last_eventbrite_request_id end,
          attempt_count=attempt_count+1,
          last_result=coalesce(last_result,'{}'::jsonb)||jsonb_build_object(
            'collector',v_collector,'source_ids',to_jsonb(v_source_ids),'request_id',v_request_id,
            'category_key',r.category_key,'subcategory_key',r.subcategory_key,'event_gap',r.inventory_gap,
            'routing_reason','event_inventory_gap',
            'dispatched_at',now()),updated_at=now()
      where city_key=r.city_key and subcategory_key=r.subcategory_key;

      v_dispatched:=v_dispatched+1;
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'category_key',r.category_key,'subcategory_key',r.subcategory_key,'collector',v_collector,
        'source_ids',to_jsonb(v_source_ids),'request_id',v_request_id));
    exception when others then
      get stacked diagnostics v_error=message_text;
      update public.gt_taxonomy_sourcing_queue
      set status='failed',next_action_at=now()+interval '1 hour',attempt_count=attempt_count+1,
          last_result=coalesce(last_result,'{}'::jsonb)||jsonb_build_object('error',left(v_error,500),'failed_at',now()),updated_at=now()
      where city_key=r.city_key and subcategory_key=r.subcategory_key;
      v_failed:=v_failed+1;
      v_results:=v_results||jsonb_build_array(jsonb_build_object(
        'category_key',r.category_key,'subcategory_key',r.subcategory_key,'error',left(v_error,500)));
    end;
  end loop;

  return jsonb_build_object(
    'dispatched',v_dispatched,'failed',v_failed,'requested_limit',v_max,
    'results',v_results,'finished_at',now()
  );
end;
$function$;
