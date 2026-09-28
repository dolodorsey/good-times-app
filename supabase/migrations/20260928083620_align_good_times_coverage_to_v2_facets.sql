-- GOOD TIMES production reconciliation.
-- Applied to content project dzlmtvodpyhetvektfuo as migration 20260928083620.
-- Aligns coverage/read models with the existing V2 multi-facet Entertainment membership layer.
-- No scheduler, agent enablement, taxonomy deletion, or city expansion.

create or replace view public.v_gt_atlanta_subcategory_coverage as
select
  s.category_key,
  s.subcategory_key,
  s.subcategory_name,
  s.minimum_upcoming_inventory,
  count(distinct f.event_key) as upcoming_inventory,
  greatest(0::bigint, s.minimum_upcoming_inventory - count(distinct f.event_key)) as inventory_gap,
  round(
    100.0 * count(distinct f.event_key)::numeric
    / nullif(s.minimum_upcoming_inventory, 0)::numeric,
    1
  ) as pct_of_target
from public.gt_taxonomy_subcategories s
left join public.v_gt_atlanta_taxonomy_event_memberships_v2 f
  on f.subcategory_key = s.subcategory_key
 and f.event_date <= current_date + 90
where s.is_active
group by
  s.category_key,
  s.subcategory_key,
  s.subcategory_name,
  s.minimum_upcoming_inventory,
  s.sort_order
order by s.category_key, s.sort_order;

create or replace view public.v_gt_atlanta_taxonomy_stock_health as
with inventory as (
  select
    f.category_key,
    f.subcategory_key,
    count(distinct f.event_key)::integer as upcoming_inventory,
    count(distinct f.event_key) filter (where nullif(f.image_url,'') is not null)::integer as with_image,
    count(distinct f.event_key) filter (where nullif(f.ticket_url,'') is not null)::integer as with_ticket,
    count(distinct f.event_key) filter (where nullif(f.venue_name,'') is not null)::integer as with_venue,
    count(distinct f.event_key) filter (where nullif(f.organizer,'') is not null)::integer as with_organizer,
    round(avg(f.good_times_score), 2) as avg_good_times_score,
    min(f.event_date) as nearest_event_date,
    max(f.event_date) as furthest_event_date
  from public.v_gt_atlanta_taxonomy_event_memberships_v2 f
  group by f.category_key, f.subcategory_key
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
  greatest(s.minimum_upcoming_inventory - coalesce(i.upcoming_inventory,0),0) as inventory_gap,
  case
    when coalesce(i.upcoming_inventory,0)=0 then 'empty'::text
    when coalesce(i.upcoming_inventory,0) < greatest(1,ceil(s.minimum_upcoming_inventory::numeric*0.5)::integer) then 'critical'::text
    when coalesce(i.upcoming_inventory,0) < s.minimum_upcoming_inventory then 'thin'::text
    when coalesce(i.upcoming_inventory,0) < s.minimum_upcoming_inventory*2 then 'stocked'::text
    else 'deep'::text
  end as stock_status,
  coalesce(i.with_image,0) as with_image,
  coalesce(i.with_ticket,0) as with_ticket,
  coalesce(i.with_venue,0) as with_venue,
  coalesce(i.with_organizer,0) as with_organizer,
  case
    when coalesce(i.upcoming_inventory,0)=0 then 0::numeric
    else round(
      100.0 * (
        coalesce(i.with_image,0)+
        coalesce(i.with_ticket,0)+
        coalesce(i.with_venue,0)+
        coalesce(i.with_organizer,0)
      )::numeric / (i.upcoming_inventory*4)::numeric,
      1
    )
  end as information_completeness_pct,
  i.avg_good_times_score,
  i.nearest_event_date,
  i.furthest_event_date,
  greatest(s.minimum_upcoming_inventory - coalesce(i.upcoming_inventory,0),0)*10
    + case when coalesce(i.upcoming_inventory,0)=0 then 100 else 0 end
    + case
        when coalesce(i.upcoming_inventory,0)=0 then 0
        else greatest(
          0,
          100 - round(
            100.0 * (
              coalesce(i.with_image,0)+
              coalesce(i.with_ticket,0)+
              coalesce(i.with_venue,0)+
              coalesce(i.with_organizer,0)
            )::numeric / (i.upcoming_inventory*4)::numeric
          )::integer
        )
      end as sourcing_priority
from public.gt_taxonomy_categories c
join public.gt_taxonomy_subcategories s
  on s.category_key=c.category_key
 and s.is_active
left join inventory i
  on i.category_key=c.category_key
 and i.subcategory_key=s.subcategory_key
where c.is_active;

create or replace view public.v_gt_customer_subcategory_inventory as
select
  'place'::text as entry_type,
  'place:'::text || d.id::text as entry_key,
  d.city_key,
  d.category_key,
  d.subcategory_key,
  d.id as venue_id,
  d.name as title,
  null::date as entry_date,
  d.short_desc,
  d.booking_link as action_url,
  false as is_free,
  d.taxonomy_confidence::integer as rank_score,
  null::text as source_url
from public.v_gt_venue_taxonomy_directory d

union all

select
  'experience'::text as entry_type,
  'experience:'::text || x.id::text as entry_key,
  x.city_key,
  x.category_key,
  x.subcategory_key,
  x.venue_id,
  x.title,
  x.active_from as entry_date,
  x.short_desc,
  x.booking_url as action_url,
  x.is_free,
  x.rank_score::integer as rank_score,
  x.evidence_url_1 as source_url
from public.gt_place_experiences x
join public.gt_venues v on v.id=x.venue_id
where x.is_active=true
  and x.verification_status='verified_current'
  and x.expires_at>now()
  and (x.active_from is null or x.active_from<=current_date)
  and (x.active_until is null or x.active_until>=current_date)
  and v.status='active'
  and v.verification_status='verified_current'
  and v.freshness_expires_at>now()

union all

select
  'event'::text as entry_type,
  'event:'::text || e.event_key as entry_key,
  e.city_key,
  e.category_key,
  e.subcategory_key,
  e.source_id::uuid as venue_id,
  e.title,
  e.event_date as entry_date,
  e.description as short_desc,
  e.ticket_url as action_url,
  e.is_free,
  greatest(1,least(100,coalesce(e.good_times_score,50::numeric)::integer)) as rank_score,
  e.source_url
from public.v_gt_atlanta_taxonomy_event_memberships_v2 e
where e.event_date>=current_date
  and e.is_verified=true;
