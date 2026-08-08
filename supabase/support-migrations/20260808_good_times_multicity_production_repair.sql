-- GOOD TIMES multicity production repair snapshot
-- Applied to canonical content project: dzlmtvodpyhetvektfuo
-- Date: 2026-08-08
-- Atlanta is intentionally excluded from every new multicity execution path.

create or replace function public.gt_run_multicity_eventbrite_refresh(p_city_key text, p_limit integer default 4)
returns bigint
language plpgsql
security definer
set search_path to 'public','extensions','net'
as $$
declare
  v_city text := lower(trim(coalesce(p_city_key,'')));
  v_key text;
  v_request_id bigint;
  v_source_ids text[];
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded from this refresh lane'; end if;
  if v_city not in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas') then raise exception 'Unsupported GOOD TIMES city: %',v_city; end if;

  select array_agg(id::text order by coalesce(last_scraped_at,'epoch'::timestamptz),source_name)
  into v_source_ids
  from (
    select id,last_scraped_at,source_name
    from public.gt_event_sources
    where lower(city)=v_city and is_active=true and source_type='eventbrite'
    order by last_scraped_at nulls first,scrape_priority desc nulls last,source_name
    limit greatest(1,least(coalesce(p_limit,4),10))
  ) s;
  if coalesce(cardinality(v_source_ids),0)=0 then raise exception 'No active Eventbrite source configured for %',v_city; end if;

  select credential_value->>'api_key' into v_key
  from public.credentials where credential_key='gt_atlanta_source_internal' and is_active=true limit 1;
  if coalesce(v_key,'')='' then raise exception 'GOOD TIMES internal source credential unavailable'; end if;

  update public.gt_city_refresh_work_queue
  set status='running',assigned_owner='multicity_eventbrite_direct',last_started_at=now(),next_action='Direct Eventbrite refresh running',updated_at=now()
  where city_key=v_city;

  select net.http_post(
    url=>'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-multicity-eventbrite-refresh',
    headers=>jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body=>jsonb_build_object('city_key',v_city,'limit',least(coalesce(p_limit,4),10),'source_ids',to_jsonb(v_source_ids)),
    timeout_milliseconds=>120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.gt_run_multicity_eventbrite_refresh(text,integer) from public,anon,authenticated;
grant execute on function public.gt_run_multicity_eventbrite_refresh(text,integer) to postgres,service_role;

create or replace function public.gt_run_multicity_venue_recheck(p_city_key text,p_limit integer default 12)
returns bigint
language plpgsql
security definer
set search_path to 'public','extensions','net'
as $$
declare
  v_city text:=lower(trim(coalesce(p_city_key,'')));
  v_key text;
  v_request_id bigint;
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded from this recheck lane'; end if;
  if v_city not in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas') then raise exception 'Unsupported GOOD TIMES city: %',v_city; end if;
  select credential_value->>'api_key' into v_key from public.credentials where credential_key='gt_atlanta_source_internal' and is_active=true limit 1;
  if coalesce(v_key,'')='' then raise exception 'GOOD TIMES internal source credential unavailable'; end if;
  select net.http_post(
    url=>'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-multicity-venue-recheck',
    headers=>jsonb_build_object('content-type','application/json','x-khg-internal-key',v_key),
    body=>jsonb_build_object('city_key',v_city,'limit',greatest(1,least(coalesce(p_limit,12),20))),
    timeout_milliseconds=>120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.gt_run_multicity_venue_recheck(text,integer) from public,anon,authenticated;
grant execute on function public.gt_run_multicity_venue_recheck(text,integer) to postgres,service_role;

create or replace function public.gt_apply_multicity_customer_priority(p_city_filter text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare v_city text:=case when p_city_filter is null then null else public.gt_city_normalize(p_city_filter) end; v_updated integer:=0;
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded'; end if;
  update public.gt_shows s
  set display_priority=least(coalesce(s.display_priority,50),case when coalesce(s.quality_score,0)>=90 then 6 when coalesce(s.quality_score,0)>=80 then 9 when coalesce(s.quality_score,0)>=70 then 12 else 16 end),
      good_times_score=greatest(coalesce(s.good_times_score,0),coalesce(s.quality_score,0)),updated_at=now()
  where s.city_key in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas')
    and (v_city is null or s.city_key=v_city) and s.show_date>=current_date and s.status in ('confirmed','tentative')
    and coalesce(s.is_curated,false)=true and coalesce(s.quality_score,0)>=65
    and nullif(trim(coalesce(s.image_url,'')),'') is not null and nullif(trim(coalesce(s.ticket_url,'')),'') is not null and nullif(trim(coalesce(s.venue_name,'')),'') is not null;
  get diagnostics v_updated=row_count;
  return jsonb_build_object('updated',v_updated,'city',coalesce(v_city,'all_non_atlanta'),'atlanta_touched',false,'completed_at',now());
end;
$$;
revoke all on function public.gt_apply_multicity_customer_priority(text) from public,anon,authenticated;
grant execute on function public.gt_apply_multicity_customer_priority(text) to postgres,service_role;

create or replace function public.gt_apply_multicity_direct_source_qualification(p_city_filter text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare v_city text:=case when p_city_filter is null then null else public.gt_city_normalize(p_city_filter) end; v_updated integer:=0;
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded'; end if;
  update public.gt_shows s
  set is_curated=true,curation_reason='direct_source_physical_verified',
      display_priority=least(coalesce(s.display_priority,50),case when coalesce(s.quality_score,0)>=60 then 11 when coalesce(s.quality_score,0)>=40 then 14 when coalesce(s.quality_score,0)>=25 then 17 else 19 end),
      good_times_score=greatest(coalesce(s.good_times_score,0),case when coalesce(s.quality_score,0)>=60 then 70 when coalesce(s.quality_score,0)>=40 then 62 when coalesce(s.quality_score,0)>=25 then 56 else 50 end),updated_at=now()
  where s.city_key in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas')
    and (v_city is null or s.city_key=v_city) and s.show_date>=current_date and s.status in ('confirmed','tentative') and s.source ilike 'Eventbrite%'
    and nullif(trim(coalesce(s.image_url,'')),'') is not null and nullif(trim(coalesce(s.ticket_url,'')),'') is not null and nullif(trim(coalesce(s.venue_name,'')),'') is not null
    and lower(trim(s.venue_name)) not in ('tba','online','virtual','warehouse','not specified')
    and s.event_name !~* '(symposium|conference|summit|workshop|seminar|training|networking|career fair|job fair|product rollout|vendor .{0,12}reservations|professional development|certification|caregiver|business expo|senior expo|webinar|make money fast|timeshare|pediatric update)'
    and (lower(coalesce(s.event_type,'')) in ('nightlife','concert','comedy','festival','play','sports','brunch') or s.event_name ~* '(party|nightclub|dayclub|rave|concert|live music|music show|comedy|stand[- ]?up|festival|parade|art show|art museum|gallery|screening|cinema|poetry|brunch|happy hour|wine|cocktail|spirits|tasting|food|culinary|speed dating|singles|mixer|pool party|rodeo|watch party|karaoke|jazz|soul|r&b|rnb|hip[- ]?hop|afrobeats|latin night|wellness event|sound bath|yoga|pilates)');
  get diagnostics v_updated=row_count;
  return jsonb_build_object('qualified',v_updated,'city',coalesce(v_city,'all_non_atlanta'),'atlanta_touched',false,'completed_at',now());
end;
$$;
revoke all on function public.gt_apply_multicity_direct_source_qualification(text) from public,anon,authenticated;
grant execute on function public.gt_apply_multicity_direct_source_qualification(text) to postgres,service_role;

create or replace function public.gt_cleanup_multicity_direct_source_noise(p_city_filter text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare v_city text:=case when p_city_filter is null then null else public.gt_city_normalize(p_city_filter) end; v_updated integer:=0;
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded'; end if;
  update public.gt_shows set is_curated=false,curation_reason='direct_source_excluded_noise',display_priority=greatest(coalesce(display_priority,50),50),updated_at=now()
  where city_key in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas')
    and (v_city is null or city_key=v_city) and curation_reason='direct_source_physical_verified'
    and event_name ~* '(symposium|conference|summit|workshop|seminar|training|networking|career fair|job fair|product rollout|vendor .{0,12}reservations|professional development|certification|caregiver|business expo|senior expo)';
  get diagnostics v_updated=row_count;
  return jsonb_build_object('suppressed',v_updated,'city',coalesce(v_city,'all_non_atlanta'),'atlanta_touched',false);
end;
$$;
revoke all on function public.gt_cleanup_multicity_direct_source_noise(text) from public,anon,authenticated;
grant execute on function public.gt_cleanup_multicity_direct_source_noise(text) to postgres,service_role;

create or replace function public.gt_apply_multicity_lifestyle_signal_expansion(p_city_filter text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_catalog'
as $$
declare v_city text:=case when p_city_filter is null then null else public.gt_city_normalize(p_city_filter) end; v_updated integer:=0;
begin
  if v_city='atlanta' then raise exception 'Atlanta is intentionally excluded'; end if;
  update public.gt_shows s
  set is_curated=true,curation_reason='direct_source_consumer_lifestyle_signal',
      category_key_v2=case when s.event_name ~* '(comedy|stand[- ]?up)' then 'comedy_performing_arts' when s.event_name ~* '(tennis|fitness|sweat|yoga|pilates)' then 'wellness_fitness' when s.event_name ~* '(book signing|author talk|dance|showcase|paint party)' then 'arts_museums_culture' when s.event_name ~* '(picnic)' then 'attractions_experiences' else 'nightlife' end,
      display_priority=least(coalesce(s.display_priority,50),18),good_times_score=greatest(coalesce(s.good_times_score,0),54),updated_at=now()
  where s.city_key in ('houston','los_angeles','miami','charlotte','washington_dc','dallas','new_york','phoenix','scottsdale','las_vegas')
    and (v_city is null or s.city_key=v_city) and s.show_date>=current_date and s.status in ('confirmed','tentative') and s.source ilike 'Eventbrite%'
    and nullif(trim(coalesce(s.image_url,'')),'') is not null and s.image_url not ilike '%maps.googleapis.com%'
    and nullif(trim(coalesce(s.ticket_url,'')),'') is not null and nullif(trim(coalesce(s.venue_name,'')),'') is not null
    and lower(trim(s.venue_name)) not in ('tba','online','virtual','warehouse','not specified')
    and s.event_name !~* '(symposium|conference|summit|workshop|seminar|training|networking|career fair|job fair|product rollout|vendor .{0,12}reservations|professional development|certification|caregiver|business expo|senior expo)'
    and s.event_name ~* '(birthday|anniversary|celebration|comedy show|dance|showcase|tennis|fitness|sweat|picnic|late night|book signing|author talk|meet[ -]?up|social|game night|bingo|paint party|silent party|drag|release party)';
  get diagnostics v_updated=row_count;
  return jsonb_build_object('qualified',v_updated,'city',coalesce(v_city,'all_non_atlanta'),'atlanta_touched',false);
end;
$$;
revoke all on function public.gt_apply_multicity_lifestyle_signal_expansion(text) from public,anon,authenticated;
grant execute on function public.gt_apply_multicity_lifestyle_signal_expansion(text) to postgres,service_role;

-- Direct launch-city Eventbrite source coverage.
insert into public.gt_event_sources(city,source_name,source_url,source_type,scrape_method,scrape_frequency,selectors,is_active,last_scrape_status,scrape_category,scrape_priority,replacement_method)
values
 ('dallas','Eventbrite DAL Events','https://www.eventbrite.com/d/tx--dallas/events/','eventbrite','manual','hourly','{}',true,'pending','general',100,'multicity_direct'),
 ('new_york','Eventbrite NYC Events','https://www.eventbrite.com/d/ny--new-york/events--today/','eventbrite','manual','hourly','{}',true,'pending','general',100,'multicity_direct'),
 ('phoenix','Eventbrite PHX Events','https://www.eventbrite.com/d/az--phoenix/events/','eventbrite','manual','hourly','{}',true,'pending','general',100,'multicity_direct'),
 ('scottsdale','Eventbrite SCD Events','https://www.eventbrite.com/d/az--scottsdale/events/','eventbrite','manual','hourly','{}',true,'pending','general',100,'multicity_direct'),
 ('las_vegas','Eventbrite LV Events','https://www.eventbrite.com/d/nv--las-vegas/events/','eventbrite','manual','hourly','{}',true,'pending','general',100,'multicity_direct')
on conflict (city,source_url) do update set is_active=true,scrape_method='manual',scrape_frequency='hourly',scrape_priority=100,replacement_method='multicity_direct',updated_at=now();

-- Staggered direct event refresh. Existing Atlanta jobs are not modified.
do $$ declare j text; begin
  foreach j in array array['routine-gt-sourcer-houston','routine-gt-sourcer-los-angeles','routine-gt-sourcer-miami','routine-gt-sourcer-washington-dc','routine-gt-sourcer-charlotte','routine-gt-sourcer-dallas','routine-gt-sourcer-phoenix','routine-gt-sourcer-new-york','routine-gt-sourcer-scottsdale','routine-gt-sourcer-las-vegas'] loop begin perform cron.unschedule(j); exception when others then null; end; end loop;
end $$;
select cron.schedule('routine-gt-sourcer-houston','5 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('houston',4);$$);
select cron.schedule('routine-gt-sourcer-los-angeles','10 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('los_angeles',4);$$);
select cron.schedule('routine-gt-sourcer-miami','15 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('miami',4);$$);
select cron.schedule('routine-gt-sourcer-washington-dc','20 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('washington_dc',4);$$);
select cron.schedule('routine-gt-sourcer-charlotte','25 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('charlotte',4);$$);
select cron.schedule('routine-gt-sourcer-dallas','30 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('dallas',4);$$);
select cron.schedule('routine-gt-sourcer-phoenix','35 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('phoenix',4);$$);
select cron.schedule('routine-gt-sourcer-new-york','40 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('new_york',4);$$);
select cron.schedule('routine-gt-sourcer-scottsdale','45 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('scottsdale',4);$$);
select cron.schedule('routine-gt-sourcer-las-vegas','50 */4 * * *',$$select public.gt_run_multicity_eventbrite_refresh('las_vegas',4);$$);

-- Classification/quality passes run independently from collection so a refresh cannot bypass customer quality gates.
do $$ declare j text; begin foreach j in array array['gt-multicity-customer-priority','gt-multicity-direct-source-qualification','gt-multicity-direct-source-noise-cleanup','gt-multicity-lifestyle-signal-expansion'] loop begin perform cron.unschedule(j); exception when others then null; end; end loop; end $$;
select cron.schedule('gt-multicity-customer-priority','7,22,37,52 * * * *',$$select public.gt_apply_multicity_customer_priority(null);$$);
select cron.schedule('gt-multicity-direct-source-qualification','9,24,39,54 * * * *',$$select public.gt_apply_multicity_direct_source_qualification(null);$$);
select cron.schedule('gt-multicity-direct-source-noise-cleanup','11,26,41,56 * * * *',$$select public.gt_cleanup_multicity_direct_source_noise(null); select public.gt_apply_multicity_customer_priority(null);$$);
select cron.schedule('gt-multicity-lifestyle-signal-expansion','13,28,43,58 * * * *',$$select public.gt_apply_multicity_lifestyle_signal_expansion(null);$$);

-- Officially revalidated Las Vegas anchor venues. These four records meet the public venue RLS threshold.
update public.gt_venues set address='3000 S Las Vegas Blvd, Las Vegas, NV 89109',quality_score=85,website='https://www.rwlasvegas.com/entertainment/zouk-nightclub/',enrichment_status='verified',enrichment_source='official_web_revalidation',enriched_at=now(),updated_at=now() where city_key='las_vegas' and name='Zouk Nightclub';
update public.gt_venues set address='3131 S Las Vegas Blvd, Las Vegas, NV 89109',quality_score=85,website='https://www.wynnlasvegas.com/nightlife/xs-nightclub',phone='(702) 770-0097',enrichment_status='verified',enrichment_source='official_web_revalidation',enriched_at=now(),updated_at=now() where city_key='las_vegas' and name='XS Nightclub';
update public.gt_venues set address='3799 Las Vegas Boulevard South, Las Vegas, NV 89109',quality_score=85,website='https://taogroup.com/venues/hakkasan-nightclub-las-vegas/',phone='(702) 891-3838',enrichment_status='verified',enrichment_source='official_web_revalidation',enriched_at=now(),updated_at=now() where city_key='las_vegas' and name='Hakkasan Nightclub';
update public.gt_venues set address='3595 S Las Vegas Blvd, Las Vegas, NV 89109',quality_score=85,website='https://www.draisgroup.com/',enrichment_status='verified',enrichment_source='official_web_revalidation',enriched_at=now(),updated_at=now() where city_key='las_vegas' and name='Drai''s Beach Club';
