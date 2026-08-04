-- GOOD TIMES category stocking engine.
-- Builds a private, category-specific sourcing queue from the canonical taxonomy,
-- expands quality-gated Eventbrite lanes, and dispatches bounded approved source refreshes.

insert into public.gt_event_sources(
  city,source_name,source_url,source_type,scrape_method,scrape_frequency,
  selectors,is_active,last_scrape_status,events_found_last_run,
  scrape_category,scrape_priority,replacement_method,updated_at
)
values
  ('atlanta','Eventbrite ATL Fashion','https://www.eventbrite.com/b/ga--atlanta/fashion/','eventbrite','manual','daily','{}',true,'pending',0,'fashion_beauty_shopping',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Health','https://www.eventbrite.com/b/ga--atlanta/health/','eventbrite','manual','daily','{}',true,'pending',0,'wellness_fitness',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Family & Education','https://www.eventbrite.com/b/ga--atlanta/family-and-education/','eventbrite','manual','daily','{}',true,'pending',0,'family_kids',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Community','https://www.eventbrite.com/b/ga--atlanta/community/','eventbrite','manual','daily','{}',true,'pending',0,'community_civic',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Spirituality','https://www.eventbrite.com/b/ga--atlanta/spirituality/','eventbrite','manual','daily','{}',true,'pending',0,'faith_inspirational',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Business & Networking','https://www.eventbrite.com/b/ga--atlanta/business/','eventbrite','manual','daily','{}',true,'pending',0,'dating_social',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Hobbies','https://www.eventbrite.com/b/ga--atlanta/hobbies/','eventbrite','manual','daily','{}',true,'pending',0,'arts_museums_culture',8,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','Eventbrite ATL Free Events','https://www.eventbrite.com/d/ga--atlanta/free--events/','eventbrite','manual','daily','{}',true,'pending',0,'free_things_to_do',9,'canonical_taxonomy_stocking_2026_08_04',now()),
  ('atlanta','High Museum Events','https://high.org/events/','official','manual','daily','{}',true,'pending',0,'arts_museums_culture',8,'official_calendar_stocking_2026_08_04',now()),
  ('atlanta','Atlanta History Center Programs & Events','https://www.atlantahistorycenter.com/programs-events/','official','manual','daily','{}',true,'pending',0,'arts_museums_culture',8,'official_calendar_stocking_2026_08_04',now()),
  ('atlanta','Atlanta BeltLine Events','https://beltline.org/events/','official','manual','daily','{}',true,'pending',0,'wellness_fitness',8,'official_calendar_stocking_2026_08_04',now()),
  ('atlanta','Museum of Design Atlanta Events','https://www.museumofdesign.org/moda-events','official','manual','daily','{}',true,'pending',0,'fashion_beauty_shopping',8,'official_calendar_stocking_2026_08_04',now()),
  ('atlanta','Fulton County Library Events','https://fulcolibrary.bibliocommons.com/v2/events','official','manual','daily','{}',true,'pending',0,'family_kids',8,'official_calendar_stocking_2026_08_04',now()),
  ('atlanta','City of Atlanta Calendar','https://www.atlantaga.gov/government/mayor-s-office/executive-offices/office-of-communications/city-calendar','official','manual','daily','{}',true,'pending',0,'community_civic',8,'official_calendar_stocking_2026_08_04',now())
on conflict(city,source_url) do update set
  source_name=excluded.source_name,
  source_type=excluded.source_type,
  scrape_method=excluded.scrape_method,
  scrape_frequency=excluded.scrape_frequency,
  scrape_category=excluded.scrape_category,
  scrape_priority=greatest(coalesce(public.gt_event_sources.scrape_priority,0),excluded.scrape_priority),
  replacement_method=excluded.replacement_method,
  is_active=true,
  updated_at=now();

create or replace function public.gt_run_atlanta_eventbrite_refresh_by_ids(p_source_ids uuid[])
returns bigint
language plpgsql
security definer
set search_path='public','extensions','net'
as $function$
declare
  v_key text;
  v_request_id bigint;
  v_source_ids text[];
begin
  if p_source_ids is null or cardinality(p_source_ids)=0 or cardinality(p_source_ids)>10 then
    raise exception 'Provide between 1 and 10 source IDs';
  end if;

  select array_agg(distinct source_id::text order by source_id::text)
    into v_source_ids
  from unnest(p_source_ids) source_id
  join public.gt_event_sources source on source.id=source_id
  where lower(source.city)='atlanta'
    and source.is_active=true
    and source.source_type='eventbrite';

  if v_source_ids is null or cardinality(v_source_ids)=0 then
    raise exception 'No eligible active Atlanta Eventbrite sources were supplied';
  end if;

  select credential_value->>'api_key'
    into v_key
  from public.credentials
  where credential_key='gt_atlanta_source_internal' and is_active=true
  limit 1;

  if coalesce(v_key,'')='' then
    raise exception 'GOOD TIMES internal source credential unavailable';
  end if;

  select net.http_post(
    url=>'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-eventbrite-refresh',
    headers=>jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body=>jsonb_build_object('limit',cardinality(v_source_ids),'source_ids',to_jsonb(v_source_ids)),
    timeout_milliseconds=>120000
  ) into v_request_id;

  return v_request_id;
end;
$function$;

revoke all on function public.gt_run_atlanta_eventbrite_refresh_by_ids(uuid[]) from public,anon,authenticated;
grant execute on function public.gt_run_atlanta_eventbrite_refresh_by_ids(uuid[]) to service_role;

create table if not exists public.gt_taxonomy_sourcing_queue (
  city_key text not null default 'atlanta',
  category_key text not null references public.gt_taxonomy_categories(category_key) on update cascade on delete restrict,
  subcategory_key text not null references public.gt_taxonomy_subcategories(subcategory_key) on update cascade on delete restrict,
  source_lane text not null,
  target_inventory integer not null default 0,
  current_inventory integer not null default 0,
  inventory_gap integer not null default 0,
  missing_images integer not null default 0,
  missing_tickets integer not null default 0,
  missing_venues integer not null default 0,
  missing_organizers integer not null default 0,
  information_completeness_pct numeric(5,1) not null default 0,
  stock_status text not null check(stock_status in ('empty','critical','thin','stocked','deep')),
  priority smallint not null default 5 check(priority between 1 and 10),
  status text not null default 'queued' check(status in ('queued','dispatched','resolved','paused','failed')),
  next_action_at timestamptz not null default now(),
  last_dispatched_at timestamptz,
  last_direct_request_id bigint,
  last_eventbrite_request_id bigint,
  attempt_count integer not null default 0,
  last_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(city_key,subcategory_key)
);
create index if not exists gt_taxonomy_sourcing_queue_ready_idx
  on public.gt_taxonomy_sourcing_queue(status,priority desc,next_action_at,inventory_gap desc);
alter table public.gt_taxonomy_sourcing_queue enable row level security;
revoke all on public.gt_taxonomy_sourcing_queue from anon,authenticated;
grant select,insert,update,delete on public.gt_taxonomy_sourcing_queue to service_role;

create or replace function public.gt_refresh_taxonomy_sourcing_queue()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $function$
declare
  v_upserted integer:=0;
  v_resolved integer:=0;
begin
  insert into public.gt_taxonomy_sourcing_queue(
    city_key,category_key,subcategory_key,source_lane,
    target_inventory,current_inventory,inventory_gap,
    missing_images,missing_tickets,missing_venues,missing_organizers,
    information_completeness_pct,stock_status,priority,status,next_action_at,updated_at
  )
  select
    'atlanta',h.category_key,h.subcategory_key,
    case h.category_key
      when 'nightlife' then 'nightlife'
      when 'concerts_live_music' then 'concerts'
      when 'festivals_major_activations' then 'festivals'
      when 'comedy_performing_arts' then 'comedy'
      when 'arts_museums_culture' then 'arts_culture'
      when 'dining_culinary' then 'food'
      else h.category_key
    end,
    h.minimum_upcoming_inventory,h.upcoming_inventory,h.inventory_gap,
    greatest(h.upcoming_inventory-h.with_image,0),
    greatest(h.upcoming_inventory-h.with_ticket,0),
    greatest(h.upcoming_inventory-h.with_venue,0),
    greatest(h.upcoming_inventory-h.with_organizer,0),
    h.information_completeness_pct,h.stock_status,
    case
      when h.upcoming_inventory=0 then 10
      when h.stock_status='critical' then 9
      when h.stock_status='thin' then 8
      when h.information_completeness_pct<50 then 8
      when h.information_completeness_pct<75 then 7
      else 3
    end::smallint,
    case
      when h.upcoming_inventory>=h.minimum_upcoming_inventory and h.information_completeness_pct>=75 then 'resolved'
      else 'queued'
    end,
    now(),now()
  from public.v_gt_atlanta_taxonomy_stock_health h
  on conflict(city_key,subcategory_key) do update set
    category_key=excluded.category_key,
    source_lane=excluded.source_lane,
    target_inventory=excluded.target_inventory,
    current_inventory=excluded.current_inventory,
    inventory_gap=excluded.inventory_gap,
    missing_images=excluded.missing_images,
    missing_tickets=excluded.missing_tickets,
    missing_venues=excluded.missing_venues,
    missing_organizers=excluded.missing_organizers,
    information_completeness_pct=excluded.information_completeness_pct,
    stock_status=excluded.stock_status,
    priority=excluded.priority,
    status=case
      when excluded.status='resolved' then 'resolved'
      when public.gt_taxonomy_sourcing_queue.status='dispatched'
       and public.gt_taxonomy_sourcing_queue.last_dispatched_at>now()-interval '4 hours'
        then 'dispatched'
      else 'queued'
    end,
    next_action_at=case
      when excluded.status='resolved' then now()+interval '24 hours'
      when public.gt_taxonomy_sourcing_queue.status='dispatched'
       and public.gt_taxonomy_sourcing_queue.last_dispatched_at>now()-interval '4 hours'
        then public.gt_taxonomy_sourcing_queue.last_dispatched_at+interval '4 hours'
      else now()
    end,
    updated_at=now();
  get diagnostics v_upserted=row_count;

  select count(*) into v_resolved
  from public.gt_taxonomy_sourcing_queue
  where city_key='atlanta' and status='resolved';

  return jsonb_build_object(
    'upserted',v_upserted,
    'resolved',v_resolved,
    'open',(select count(*) from public.gt_taxonomy_sourcing_queue where city_key='atlanta' and status<>'resolved'),
    'refreshed_at',now()
  );
end;
$function$;

revoke all on function public.gt_refresh_taxonomy_sourcing_queue() from public,anon,authenticated;
grant execute on function public.gt_refresh_taxonomy_sourcing_queue() to service_role;

create or replace function public.gt_dispatch_taxonomy_sourcing_queue(p_limit integer default 3)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public'
as $function$
declare
  r record;
  v_direct_ids uuid[];
  v_eventbrite_ids uuid[];
  v_direct_request bigint;
  v_eventbrite_request bigint;
  v_dispatched integer:=0;
  v_failures integer:=0;
  v_error text;
begin
  perform public.gt_refresh_taxonomy_sourcing_queue();

  for r in
    select *
    from public.gt_taxonomy_sourcing_queue
    where city_key='atlanta'
      and status in ('queued','failed')
      and next_action_at<=now()
      and (inventory_gap>0 or information_completeness_pct<75)
    order by priority desc,inventory_gap desc,information_completeness_pct,updated_at
    limit least(greatest(coalesce(p_limit,3),1),6)
    for update skip locked
  loop
    begin
      v_direct_ids:=null;
      v_eventbrite_ids:=null;
      v_direct_request:=null;
      v_eventbrite_request:=null;

      select array_agg(id order by source_rank,scrape_priority desc,source_name)
        into v_direct_ids
      from (
        select id,coalesce(scrape_priority,0) scrape_priority,source_name,
          case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end source_rank
        from public.gt_event_sources
        where lower(city)='atlanta'
          and is_active=true
          and source_type in ('official','venue','comedy_club','blog','aggregator')
          and coalesce(last_scrape_status,'pending')<>'failed'
          and scrape_category in (r.source_lane,'general','city_guide')
        order by source_rank,coalesce(scrape_priority,0) desc,source_name
        limit 4
      ) q;

      select array_agg(id order by source_rank,scrape_priority desc,source_name)
        into v_eventbrite_ids
      from (
        select id,coalesce(scrape_priority,0) scrape_priority,source_name,
          case last_scrape_status when 'success' then 0 when 'pending' then 1 when 'empty' then 2 else 3 end source_rank
        from public.gt_event_sources
        where lower(city)='atlanta'
          and is_active=true
          and source_type='eventbrite'
          and scrape_category in (r.source_lane,'general')
        order by source_rank,coalesce(scrape_priority,0) desc,source_name
        limit 3
      ) q;

      if coalesce(cardinality(v_direct_ids),0)>0 then
        v_direct_request:=public.gt_run_atlanta_direct_sources_by_ids(v_direct_ids);
      end if;
      if coalesce(cardinality(v_eventbrite_ids),0)>0 then
        v_eventbrite_request:=public.gt_run_atlanta_eventbrite_refresh_by_ids(v_eventbrite_ids);
      end if;

      if v_direct_request is null and v_eventbrite_request is null then
        raise exception 'No eligible source lane for %',r.subcategory_key;
      end if;

      update public.gt_taxonomy_sourcing_queue
      set status='dispatched',last_dispatched_at=now(),next_action_at=now()+interval '4 hours',
          last_direct_request_id=v_direct_request,last_eventbrite_request_id=v_eventbrite_request,
          attempt_count=attempt_count+1,
          last_result=jsonb_build_object(
            'direct_source_ids',coalesce(to_jsonb(v_direct_ids),'[]'::jsonb),
            'eventbrite_source_ids',coalesce(to_jsonb(v_eventbrite_ids),'[]'::jsonb),
            'direct_request_id',v_direct_request,
            'eventbrite_request_id',v_eventbrite_request,
            'dispatched_at',now()
          ),updated_at=now()
      where city_key=r.city_key and subcategory_key=r.subcategory_key;
      v_dispatched:=v_dispatched+1;
    exception when others then
      get stacked diagnostics v_error=message_text;
      update public.gt_taxonomy_sourcing_queue
      set status='failed',next_action_at=now()+interval '2 hours',attempt_count=attempt_count+1,
          last_result=jsonb_build_object('error',left(v_error,500),'failed_at',now()),updated_at=now()
      where city_key=r.city_key and subcategory_key=r.subcategory_key;
      v_failures:=v_failures+1;
    end;
  end loop;

  return jsonb_build_object('dispatched',v_dispatched,'failed',v_failures,'finished_at',now());
end;
$function$;

revoke all on function public.gt_dispatch_taxonomy_sourcing_queue(integer) from public,anon,authenticated;
grant execute on function public.gt_dispatch_taxonomy_sourcing_queue(integer) to service_role;

create or replace function public.gt_get_public_atlanta_taxonomy_stock_health()
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','public'
as $function$
  select jsonb_build_object(
    'city_key','atlanta',
    'upcoming_events',(select count(*) from public.gt_public_atlanta_feed where event_date>=current_date),
    'subcategory_count',(select count(*) from public.v_gt_atlanta_taxonomy_stock_health),
    'resolved_subcategories',(select count(*) from public.gt_taxonomy_sourcing_queue where city_key='atlanta' and status='resolved'),
    'open_subcategories',(select count(*) from public.gt_taxonomy_sourcing_queue where city_key='atlanta' and status<>'resolved'),
    'empty_subcategories',(select count(*) from public.v_gt_atlanta_taxonomy_stock_health where stock_status='empty'),
    'average_information_completeness_pct',(select round(avg(information_completeness_pct),1) from public.v_gt_atlanta_taxonomy_stock_health),
    'top_gaps',coalesce((
      select jsonb_agg(to_jsonb(g) order by g.priority desc,g.inventory_gap desc,g.information_completeness_pct)
      from (
        select category_key,subcategory_key,source_lane,target_inventory,current_inventory,inventory_gap,
               missing_images,missing_tickets,missing_venues,missing_organizers,
               information_completeness_pct,stock_status,priority,status,next_action_at
        from public.gt_taxonomy_sourcing_queue
        where city_key='atlanta' and status<>'resolved'
        order by priority desc,inventory_gap desc,information_completeness_pct
        limit 25
      ) g
    ),'[]'::jsonb),
    'generated_at',now()
  );
$function$;

revoke all on function public.gt_get_public_atlanta_taxonomy_stock_health() from public;
grant execute on function public.gt_get_public_atlanta_taxonomy_stock_health() to anon,authenticated,service_role;

select public.gt_refresh_taxonomy_sourcing_queue();

do $block$
begin
  if not exists(select 1 from cron.job where jobname='gt-taxonomy-stock-refresh') then
    perform cron.schedule('gt-taxonomy-stock-refresh','12 * * * *',$cmd$select public.gt_refresh_taxonomy_sourcing_queue();$cmd$);
  end if;
  if not exists(select 1 from cron.job where jobname='gt-taxonomy-stock-dispatch') then
    perform cron.schedule('gt-taxonomy-stock-dispatch','50 */4 * * *',$cmd$select public.gt_dispatch_taxonomy_sourcing_queue(3);$cmd$);
  end if;
end
$block$;
