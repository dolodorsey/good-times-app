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

  if t ~ '\m(meet up|meetup|community gathering)\M'
     and t !~ '\m(party|nightclub|club night|after party|after-party|dj|dance|dancing|lounge|rooftop party|day party|rave)\M' then
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

update public.gt_shows
set event_type = event_type
where show_date >= current_date
  and lower(coalesce(event_name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(genre,'') || ' ' || coalesce(venue_name,''))
      ~ '(meet up|meetup|community gathering)';

comment on function public.gt_customer_taxonomy_source_guard() is
'Source-of-truth guard for recurring GOOD TIMES taxonomy errors: sports watch parties, community/book/meetup records, dating experiences and talent showcases.';
