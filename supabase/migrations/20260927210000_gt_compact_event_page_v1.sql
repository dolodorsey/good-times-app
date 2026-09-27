-- Additive, read-only page over the SAME editorial/freshness gates as public inventory.
-- No source jobs, taxonomy mutations, or authorization expansion of underlying tables.
create or replace function public.gt_compact_event_page_v1(
 p_start date,p_end date,p_category text default null,p_subcategory text default null,
 p_query text default null,p_after_date date default null,p_after_id uuid default null,p_limit integer default 64,p_after_time text default null,p_ids uuid[] default null
) returns setof public.gt_shows
language sql stable security invoker set search_path = public set statement_timeout = '5000ms'
as $fn$
 select s.* from public.gt_shows s
 where s.city_key='atlanta'
 and s.show_date >= greatest(p_start,(now() at time zone 'America/New_York')::date - 1)
 and s.show_date <= least(p_end,p_start+366)
 and s.status in ('confirmed','tentative') and not coalesce(s.is_sold_out,false)
 and coalesce(s.freshness_tier,'unknown') not in ('expired','unknown')
 and s.updated_at > now()-interval '72 hours'
 and s.image_url is not null and s.ticket_url is not null
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
