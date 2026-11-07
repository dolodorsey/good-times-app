-- GOOD TIMES Atlanta: automatic taxonomy + priority fill for canonical content tables.
-- Applied to the MCP Gateway production database as migration:
-- gt_atlanta_taxonomy_priority_autofill_v2
--
-- Rules:
-- 1) preserve manual category/subcategory values;
-- 2) fill blanks using the existing v2 taxonomy functions;
-- 3) preserve manually curated display_priority values;
-- 4) only convert the default priority 50 into score-based ordering;
-- 5) keep needs_review from crowding the live feed.

create or replace function public.gt_assign_show_taxonomy_priority_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  inferred_category text;
  inferred_subcategory text;
  inferred_priority integer;
begin
  inferred_category := public.gt_category_key_v2(new.event_type, new.genre, new.event_name);
  inferred_subcategory := public.gt_subcategory_key_v2(new.event_type, new.genre, new.event_name);

  if nullif(btrim(coalesce(new.category_key_v2,'')),'') is null then
    new.category_key_v2 := inferred_category;
  end if;

  if nullif(btrim(coalesce(new.subcategory_key_v2,'')),'') is null
     and new.category_key_v2 = inferred_category then
    new.subcategory_key_v2 := inferred_subcategory;
  end if;

  if coalesce(new.is_featured,false) then
    new.display_priority := least(coalesce(new.display_priority,50),5);
  elsif coalesce(new.display_priority,50)=50 and new.good_times_score is not null then
    inferred_priority := case
      when new.good_times_score >= 80 then 10
      when new.good_times_score >= 75 then 14
      when new.good_times_score >= 70 then 18
      when new.good_times_score >= 65 then 24
      when new.good_times_score >= 60 then 30
      when new.good_times_score >= 55 then 36
      when new.good_times_score >= 50 then 42
      else 50
    end;
    if new.category_key_v2='needs_review' then
      inferred_priority := greatest(inferred_priority,45);
    end if;
    new.display_priority := inferred_priority;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_gt_assign_show_taxonomy_priority_v2 on public.gt_shows;
create trigger zz_gt_assign_show_taxonomy_priority_v2
before insert or update of event_name,event_type,genre,category_key_v2,subcategory_key_v2,display_priority
on public.gt_shows
for each row execute function public.gt_assign_show_taxonomy_priority_v2();

create or replace function public.gt_assign_sourced_taxonomy_score_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  inferred_category text;
  inferred_subcategory text;
  score_result jsonb;
begin
  inferred_category := public.gt_category_key_v2(new.event_type, new.event_category, new.event_name);
  inferred_subcategory := public.gt_subcategory_key_v2(new.event_type, new.event_category, new.event_name);

  if nullif(btrim(coalesce(new.category_key_v2,'')),'') is null then
    new.category_key_v2 := inferred_category;
  end if;

  if nullif(btrim(coalesce(new.subcategory_key_v2,'')),'') is null
     and new.category_key_v2 = inferred_category then
    new.subcategory_key_v2 := inferred_subcategory;
  end if;

  if new.good_times_score is null then
    score_result := public.gt_compute_weighted_quality(
      new.event_name,
      new.venue_name,
      public.gt_city_normalize(new.city),
      new.image_url,
      new.source_url,
      false,
      new.event_date
    );
    new.good_times_score := (score_result->>'score_precise')::numeric;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_gt_assign_sourced_taxonomy_score_v2 on public.gt_sourced_events;
create trigger zz_gt_assign_sourced_taxonomy_score_v2
before insert or update of event_name,event_type,event_category,category_key_v2,subcategory_key_v2,image_url,source_url,event_date,venue_name,city
on public.gt_sourced_events
for each row execute function public.gt_assign_sourced_taxonomy_score_v2();

create or replace function public.gt_assign_city_event_taxonomy_priority_v2()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  inferred_category text;
  inferred_subcategory text;
  inferred_priority integer;
  score_result jsonb;
begin
  inferred_category := public.gt_category_key_v2(new.event_type, new.subcategory, new.event_name);
  inferred_subcategory := public.gt_subcategory_key_v2(new.event_type, new.subcategory, new.event_name);

  if nullif(btrim(coalesce(new.category_key_v2,'')),'') is null then
    new.category_key_v2 := inferred_category;
  end if;

  if nullif(btrim(coalesce(new.subcategory_key_v2,'')),'') is null
     and new.category_key_v2 = inferred_category then
    new.subcategory_key_v2 := inferred_subcategory;
  end if;

  if new.good_times_score is null then
    score_result := public.gt_compute_weighted_quality(
      new.event_name,
      new.venue_name,
      new.city_key,
      new.image_url,
      new.source_url,
      false,
      new.start_date
    );
    new.good_times_score := (score_result->>'score_precise')::numeric;
  end if;

  if coalesce(new.display_priority,50)=50 and new.good_times_score is not null then
    inferred_priority := case
      when new.good_times_score >= 80 then 10
      when new.good_times_score >= 75 then 14
      when new.good_times_score >= 70 then 18
      when new.good_times_score >= 65 then 24
      when new.good_times_score >= 60 then 30
      when new.good_times_score >= 55 then 36
      when new.good_times_score >= 50 then 42
      else 50
    end;
    if new.category_key_v2='needs_review' then
      inferred_priority := greatest(inferred_priority,45);
    end if;
    new.display_priority := inferred_priority;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_gt_assign_city_event_taxonomy_priority_v2 on public.gt_city_events;
create trigger zz_gt_assign_city_event_taxonomy_priority_v2
before insert or update of event_name,event_type,subcategory,category_key_v2,subcategory_key_v2,display_priority,image_url,source_url,start_date,venue_name,city_key
on public.gt_city_events
for each row execute function public.gt_assign_city_event_taxonomy_priority_v2();
