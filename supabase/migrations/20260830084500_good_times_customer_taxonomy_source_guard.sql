create or replace function public.gt_customer_taxonomy_source_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  t text := lower(coalesce(new.event_name,'') || ' ' || coalesce(new.description,'') || ' ' || coalesce(new.genre,'') || ' ' || coalesce(new.venue_name,''));
begin
  if t ~ '\mwatch party\M'
     and t ~ '\m(basketball|football|baseball|soccer|hockey|wnba|nba|nfl|mlb|mls|dream|lynx|hawks|falcons|braves|atlanta united|mystics|aces|wings|mercury|sparks)\M' then
    new.event_type := 'sports';
    new.category_key_v2 := 'sports_watch';
    new.subcategory_key_v2 := 'watch_parties';
    return new;
  end if;

  if t ~ '\m(book club|author reading|book discussion|literary club)\M' then
    new.event_type := 'special_event';
    new.category_key_v2 := 'community_civic';
    new.subcategory_key_v2 := null;
    return new;
  end if;

  if t ~ '\m(matchmaking|one-on-one date|speed dating|singles mixer)\M' then
    new.event_type := 'special_event';
    new.category_key_v2 := 'dating_social';
    new.subcategory_key_v2 := null;
    return new;
  end if;

  if t ~ '\m(talent slam|talent showcase|talent show)\M'
     and t !~ '\m(sport|basketball|football|baseball|soccer|hockey|boxing|mma|wrestling)\M' then
    new.event_type := 'special_event';
    new.category_key_v2 := 'arts_museums_culture';
    new.subcategory_key_v2 := null;
    return new;
  end if;

  return new;
end;
$function$;

drop trigger if exists gt_customer_taxonomy_source_guard_trg on public.gt_shows;
create trigger gt_customer_taxonomy_source_guard_trg
before insert or update of event_name,description,genre,venue_name,event_type,category_key_v2,subcategory_key_v2
on public.gt_shows
for each row execute function public.gt_customer_taxonomy_source_guard();

update public.gt_shows
set event_type = event_type
where show_date >= current_date
  and lower(coalesce(event_name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(genre,'') || ' ' || coalesce(venue_name,''))
      ~ '(watch party|book club|author reading|book discussion|literary club|matchmaking|one-on-one date|speed dating|singles mixer|talent slam|talent showcase|talent show)';

comment on function public.gt_customer_taxonomy_source_guard() is
'Narrow source-of-truth taxonomy guard for recurring GOOD TIMES misclassification patterns before customer APIs rank records.';
