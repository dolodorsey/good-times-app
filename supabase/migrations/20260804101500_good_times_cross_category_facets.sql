-- GOOD TIMES cross-category taxonomy facets.
-- Free Things To Do and VIP & Exclusive are browse facets, not mutually exclusive primary event types.
-- An event keeps its primary category while receiving zero or more facet memberships from explicit evidence.

update public.gt_taxonomy_categories
set description=case category_key
  when 'free_things_to_do' then 'Cross-category browse facet for events with explicit free-entry evidence or a verified free-event source.'
  when 'vip_exclusive' then 'Cross-category browse facet for events with explicit invitation, VIP, celebrity, premium-table, or limited-access evidence.'
  else description
end,
updated_at=now()
where category_key in ('free_things_to_do','vip_exclusive');

create or replace view public.v_gt_atlanta_taxonomy_event_memberships
with (security_invoker=true)
as
with eligible as (
  select
    f.event_key,
    f.source_table,
    f.source_id,
    f.city_key,
    f.title,
    f.event_date,
    f.event_time,
    f.venue_name,
    f.venue_address,
    f.raw_type,
    f.raw_category,
    f.description,
    f.ticket_url,
    f.image_url,
    f.organizer,
    f.source_name,
    f.source_url,
    f.is_free,
    f.is_featured,
    f.is_curated,
    f.is_first_party,
    f.is_verified,
    f.good_times_score,
    f.display_priority,
    f.rank_order,
    f.category_key as primary_category_key,
    f.subcategory_key as primary_subcategory_key,
    lower(concat_ws(' ',f.title,f.raw_type,f.raw_category,f.description,f.source_name)) as evidence_text
  from public.v_gt_atlanta_ranked_feed_internal f
  where f.event_date>=current_date
    and f.duplicate_rank=1
    and not f.is_excluded
    and f.category_key<>'needs_review'
), memberships as (
  -- Primary taxonomy membership. Facet categories are intentionally excluded here.
  select
    e.*,
    e.primary_category_key as category_key,
    e.primary_subcategory_key as subcategory_key,
    'primary'::text as membership_type,
    'primary_taxonomy'::text as membership_reason
  from eligible e
  where e.primary_category_key not in ('free_things_to_do','vip_exclusive')

  union all

  -- Free facet membership. Verified source-lane evidence is accepted because the source query is price-filtered.
  select
    e.*,
    'free_things_to_do'::text as category_key,
    case
      when e.primary_category_key='concerts_live_music'
        or e.evidence_text ~ '(concert|live music|gospel|symphony|orchestra|music festival)'
        then 'free_concerts'
      when e.primary_category_key='arts_museums_culture'
        or e.evidence_text ~ '(museum|gallery|exhibit|exhibition|art walk)'
        then 'free_museums'
      when e.primary_category_key='festivals_major_activations'
        or e.evidence_text ~ '(^|[^a-z])(festival|fest|fair|parade)([^a-z]|$)'
        then 'free_festivals'
      else 'free_community'
    end as subcategory_key,
    'facet'::text as membership_type,
    case
      when e.is_free then 'explicit_is_free'
      when e.source_name='Eventbrite ATL Free Events' then 'verified_free_source'
      else 'explicit_free_language'
    end as membership_reason
  from eligible e
  where e.is_free
     or e.source_name='Eventbrite ATL Free Events'
     or e.evidence_text ~ '(^|[^a-z])(free admission|free entry|free before|no cover|no cost|complimentary admission)([^a-z]|$)'

  union all

  -- VIP facet membership requires explicit access or premium-service evidence.
  select
    e.*,
    'vip_exclusive'::text as category_key,
    case
      when e.evidence_text ~ '(invite[- ]?only|invitation only|members only|private event)'
        then 'invitation_only'
      when e.evidence_text ~ '(vip table|premium table|bottle service|table reservation|cabana)'
        then 'premium_tables'
      when e.evidence_text ~ '(celebrity|red carpet|official after party)'
        then 'celebrity_events'
      else 'limited_access'
    end as subcategory_key,
    'facet'::text as membership_type,
    'explicit_vip_access_language'::text as membership_reason
  from eligible e
  where e.evidence_text ~ '(invite[- ]?only|invitation only|members only|private event|celebrity|red carpet|official after party|vip table|premium table|bottle service|table reservation|cabana|limited access|exclusive|private access|backstage|\mVIP\M)'
)
select distinct on (event_key,category_key,subcategory_key)
  event_key,source_table,source_id,city_key,title,event_date,event_time,
  venue_name,venue_address,raw_type,raw_category,description,ticket_url,image_url,
  organizer,source_name,source_url,is_free,is_featured,is_curated,is_first_party,is_verified,
  good_times_score,display_priority,rank_order,
  primary_category_key,primary_subcategory_key,
  category_key,subcategory_key,membership_type,membership_reason
from memberships
order by event_key,category_key,subcategory_key,
         case membership_reason when 'explicit_is_free' then 1 when 'verified_free_source' then 2 else 3 end;

create or replace view public.v_gt_atlanta_taxonomy_stock_health
with (security_invoker=true)
as
with inventory as (
  select
    f.category_key,
    f.subcategory_key,
    count(*)::integer as upcoming_inventory,
    count(*) filter(where nullif(f.image_url,'') is not null)::integer as with_image,
    count(*) filter(where nullif(f.ticket_url,'') is not null)::integer as with_ticket,
    count(*) filter(where nullif(f.venue_name,'') is not null)::integer as with_venue,
    count(*) filter(where nullif(f.organizer,'') is not null)::integer as with_organizer,
    round(avg(f.good_times_score),2) as avg_good_times_score,
    min(f.event_date) as nearest_event_date,
    max(f.event_date) as furthest_event_date
  from public.v_gt_atlanta_taxonomy_event_memberships f
  group by f.category_key,f.subcategory_key
)
select
  c.category_key,
  c.category_name,
  c.sort_order as category_sort_order,
  s.subcategory_key,
  s.subcategory_name,
  s.sort_order as subcategory_sort_order,
  s.minimum_upcoming_inventory,
  coalesce(i.upcoming_inventory,0) as upcoming_inventory,
  greatest(s.minimum_upcoming_inventory-coalesce(i.upcoming_inventory,0),0) as inventory_gap,
  case
    when coalesce(i.upcoming_inventory,0)=0 then 'empty'
    when coalesce(i.upcoming_inventory,0)<greatest(1,ceil(s.minimum_upcoming_inventory::numeric*0.5)::integer) then 'critical'
    when coalesce(i.upcoming_inventory,0)<s.minimum_upcoming_inventory then 'thin'
    when coalesce(i.upcoming_inventory,0)<s.minimum_upcoming_inventory*2 then 'stocked'
    else 'deep'
  end as stock_status,
  coalesce(i.with_image,0) as with_image,
  coalesce(i.with_ticket,0) as with_ticket,
  coalesce(i.with_venue,0) as with_venue,
  coalesce(i.with_organizer,0) as with_organizer,
  case
    when coalesce(i.upcoming_inventory,0)=0 then 0::numeric
    else round(100.0*(coalesce(i.with_image,0)+coalesce(i.with_ticket,0)+coalesce(i.with_venue,0)+coalesce(i.with_organizer,0))::numeric/(i.upcoming_inventory*4)::numeric,1)
  end as information_completeness_pct,
  i.avg_good_times_score,
  i.nearest_event_date,
  i.furthest_event_date,
  greatest(s.minimum_upcoming_inventory-coalesce(i.upcoming_inventory,0),0)*10
    +case when coalesce(i.upcoming_inventory,0)=0 then 100 else 0 end
    +case when coalesce(i.upcoming_inventory,0)=0 then 0 else greatest(0,100-round(100.0*(coalesce(i.with_image,0)+coalesce(i.with_ticket,0)+coalesce(i.with_venue,0)+coalesce(i.with_organizer,0))::numeric/(i.upcoming_inventory*4)::numeric)::integer) end
    as sourcing_priority
from public.gt_taxonomy_categories c
join public.gt_taxonomy_subcategories s
  on s.category_key=c.category_key and s.is_active
left join inventory i
  on i.category_key=c.category_key and i.subcategory_key=s.subcategory_key
where c.is_active;

create or replace function public.gt_get_public_atlanta_taxonomy_events(
  p_category_key text,
  p_subcategory_key text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path='pg_catalog','public'
as $function$
  with selected as (
    select
      m.event_key,m.title,m.event_date,m.event_time,m.venue_name,
      m.ticket_url,m.image_url,m.organizer,m.good_times_score,
      m.category_key,m.subcategory_key,m.primary_category_key,m.primary_subcategory_key,
      m.membership_type,m.membership_reason,m.display_priority,m.rank_order
    from public.v_gt_atlanta_taxonomy_event_memberships m
    where m.category_key=public.gt_clean_taxonomy_token(p_category_key)
      and (nullif(public.gt_clean_taxonomy_token(p_subcategory_key),'') is null
           or m.subcategory_key=public.gt_clean_taxonomy_token(p_subcategory_key))
    order by m.display_priority,m.rank_order,m.event_date,m.title
    limit least(greatest(coalesce(p_limit,50),1),100)
    offset greatest(coalesce(p_offset,0),0)
  )
  select jsonb_build_object(
    'city_key','atlanta',
    'category_key',public.gt_clean_taxonomy_token(p_category_key),
    'subcategory_key',nullif(public.gt_clean_taxonomy_token(p_subcategory_key),''),
    'count',(select count(*) from selected),
    'events',coalesce((select jsonb_agg(to_jsonb(s) order by s.display_priority,s.rank_order,s.event_date,s.title) from selected s),'[]'::jsonb),
    'generated_at',now()
  );
$function$;

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
    'facet_categories',jsonb_build_array('free_things_to_do','vip_exclusive'),
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

revoke all on public.v_gt_atlanta_taxonomy_event_memberships from public,anon,authenticated;
revoke all on function public.gt_get_public_atlanta_taxonomy_events(text,text,integer,integer) from public;
grant execute on function public.gt_get_public_atlanta_taxonomy_events(text,text,integer,integer) to anon,authenticated,service_role;
