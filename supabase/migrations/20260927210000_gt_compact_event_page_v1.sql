-- Additive, read-only page over the SAME editorial/freshness gates as public inventory.
-- No source jobs, taxonomy mutations, or authorization expansion of underlying tables.
create or replace function public.gt_compact_event_page_v1(
 p_start date,p_end date,p_category text default null,p_subcategory text default null,
 p_query text default null,p_after_date date default null,p_after_id uuid default null,p_limit integer default 64,p_after_time text default null,p_ids uuid[] default null
) returns setof jsonb
language sql stable security invoker set search_path = public set statement_timeout = '5000ms'
as $fn$
 select jsonb_build_object('id',s.id,'venue_id',s.venue_id,'event_name',s.event_name,'event_type',s.event_type,'genre',s.genre,'city_key',s.city_key,'show_date',s.show_date,'show_time',s.show_time,'doors_time',s.doors_time,'venue_name',s.venue_name,'venue_address',s.venue_address,'ticket_url',s.ticket_url,'image_url',s.image_url,'description',s.description,'organizer',s.organizer,'source',s.source,'source_url',s.source_url,'status',s.status,'quality_score',s.quality_score,'freshness_tier',s.freshness_tier,'display_priority',s.display_priority,'good_times_score',s.good_times_score,'category_key_v2',s.category_key_v2,'subcategory_key_v2',s.subcategory_key_v2,'is_featured',s.is_featured,'is_curated',s.is_curated,'updated_at',s.updated_at,'is_sold_out',s.is_sold_out,'is_free',s.is_free,'age_requirement',s.age_requirement,'ticket_price_min',s.ticket_price_min,'ticket_price_max',s.ticket_price_max) from public.gt_shows s
 where s.city_key='atlanta'
 and s.show_date >= greatest(p_start,(now() at time zone 'America/New_York')::date - 1)
 and s.show_date <= least(p_end,p_start+366)
 and s.status in ('confirmed','tentative') and not coalesce(s.is_sold_out,false)
 and coalesce(s.freshness_tier,'unknown') not in ('expired','unknown')
 and s.updated_at > now()-interval '72 hours'
 and nullif(btrim(s.image_url),'') is not null and nullif(btrim(s.ticket_url),'') is not null
 and exists(select 1 from public.gt_atlanta_editorial_selection_v1 e where e.show_id=s.id and e.selected_at>now()-interval '2 hours')
 -- Category/subcategory are resolved by the existing canonical JS taxonomy adapter,
 -- including reviewed corrections; raw labels must not exclude corrected records.
 and (p_ids is null or s.id=any(p_ids))
 and (nullif(btrim(p_query),'') is null or strpos(lower(concat_ws(' ',s.event_name,s.venue_name,s.genre,s.description,s.category_key_v2,s.subcategory_key_v2)),lower(left(p_query,120)))>0)
 and (p_after_date is null or (s.show_date,case when s.show_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]' then left(s.show_time,5) else '99:99' end,s.id)>(p_after_date,coalesce(p_after_time,'99:99'),p_after_id))
 and lower(coalesce(s.event_name,'')||' '||coalesce(s.description,'')) !~ '\m(back-to-campus transportation|college shuttle|shuttle event|scheduled motorcoach transportation)\M'
 order by s.show_date,case when s.show_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]' then left(s.show_time,5) else '99:99' end,s.id
 limit least(greatest(coalesce(p_limit,64),1),96)
$fn$;
revoke all on function public.gt_compact_event_page_v1(date,date,text,text,text,date,uuid,integer,text,uuid[]) from public;
grant execute on function public.gt_compact_event_page_v1(date,date,text,text,text,date,uuid,integer,text,uuid[]) to anon,authenticated,service_role;
comment on function public.gt_compact_event_page_v1(date,date,text,text,text,date,uuid,integer,text,uuid[]) is 'GOOD TIMES Atlanta editorial-eligible bounded event pages. Invoker policies retained; no schedules.';
