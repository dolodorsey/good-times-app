-- GOOD TIMES Entertainment: Nightclubs, Hookah Lounges, Bars
-- Applied to production Supabase on 2026-09-24.

insert into public.gt_taxonomy_subcategories(
  subcategory_key,category_key,subcategory_name,description,sort_order,minimum_upcoming_inventory,is_active,created_at,updated_at
)
values
('ent_nightclubs','entertainment','Nightclubs','Verified Atlanta nightclub destinations. Dated parties, hosts, performances and special editions remain separate event records.',14,5,true,now(),now()),
('ent_hookah_lounges','entertainment','Hookah Lounges','Verified hookah lounges and nightlife venues with a current, explicit hookah offering. A current hookah night still requires dated event evidence.',15,1,true,now(),now()),
('ent_bars','entertainment','Bars','Verified bar-first destinations including cocktail, wine, sports and rooftop bars. Restaurant cocktail service alone does not automatically qualify.',16,6,true,now(),now())
on conflict(subcategory_key) do update set
  category_key=excluded.category_key,
  subcategory_name=excluded.subcategory_name,
  description=excluded.description,
  sort_order=excluded.sort_order,
  minimum_upcoming_inventory=excluded.minimum_upcoming_inventory,
  is_active=true,
  updated_at=now();

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select 'nightclub',null,'entertainment','ent_nightclubs',98,'Primary verified nightclub place type.',true,now(),now()
where not exists(select 1 from public.gt_venue_taxonomy_eligibility where venue_category_key='nightclub' and category_key='entertainment' and subcategory_key='ent_nightclubs');

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select 'lounge','nightclub','entertainment','ent_nightclubs',94,'Verified lounge explicitly classified as a nightclub/lounge hybrid.',true,now(),now()
where not exists(select 1 from public.gt_venue_taxonomy_eligibility where venue_category_key='lounge' and venue_subcategory_pattern='nightclub' and category_key='entertainment' and subcategory_key='ent_nightclubs');

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select 'hookah',null,'entertainment','ent_hookah_lounges',98,'Primary verified hookah place type.',true,now(),now()
where not exists(select 1 from public.gt_venue_taxonomy_eligibility where venue_category_key='hookah' and category_key='entertainment' and subcategory_key='ent_hookah_lounges');

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select 'lounge','hookah','entertainment','ent_hookah_lounges',96,'Verified lounge explicitly classified with hookah service.',true,now(),now()
where not exists(select 1 from public.gt_venue_taxonomy_eligibility where venue_category_key='lounge' and venue_subcategory_pattern='hookah' and category_key='entertainment' and subcategory_key='ent_hookah_lounges');

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select x.category_key,null,'entertainment','ent_bars',98,'Primary verified bar place type.',true,now(),now()
from (values('bar'),('cocktail_bar'),('sports_bar'),('wine_bar'),('speakeasy')) x(category_key)
where not exists(select 1 from public.gt_venue_taxonomy_eligibility e where e.venue_category_key=x.category_key and e.category_key='entertainment' and e.subcategory_key='ent_bars');

insert into public.gt_venue_taxonomy_eligibility(
  venue_category_key,venue_subcategory_pattern,category_key,subcategory_key,confidence,rationale,is_active,created_at,updated_at
)
select x.category_key,'bar|cocktail','entertainment','ent_bars',94,'Verified rooftop/lounge explicitly classified as a bar or cocktail destination.',true,now(),now()
from (values('rooftop'),('lounge')) x(category_key)
where not exists(select 1 from public.gt_venue_taxonomy_eligibility e where e.venue_category_key=x.category_key and e.venue_subcategory_pattern='bar|cocktail' and e.category_key='entertainment' and e.subcategory_key='ent_bars');

insert into public.gt_category_aliases(alias_key,category_key,subcategory_key,alias_type,priority,is_active,created_at)
values
('nightclub','entertainment','ent_nightclubs','title_keyword',100,true,now()),
('nightclubs','entertainment','ent_nightclubs','title_keyword',100,true,now()),
('clubs','entertainment','ent_nightclubs','title_keyword',98,true,now()),
('hookah lounge','entertainment','ent_hookah_lounges','title_keyword',100,true,now()),
('hookah lounges','entertainment','ent_hookah_lounges','title_keyword',100,true,now()),
('hookah','entertainment','ent_hookah_lounges','title_keyword',98,true,now()),
('bar','entertainment','ent_bars','title_keyword',100,true,now()),
('bars','entertainment','ent_bars','title_keyword',100,true,now()),
('cocktail bar','entertainment','ent_bars','title_keyword',96,true,now())
on conflict(alias_key) do update set
  category_key=excluded.category_key,subcategory_key=excluded.subcategory_key,
  alias_type=excluded.alias_type,priority=excluded.priority,is_active=true;

refresh materialized view public.mv_gt_venue_taxonomy_directory;
select public.gt_refresh_venue_taxonomy_directory_cache();
