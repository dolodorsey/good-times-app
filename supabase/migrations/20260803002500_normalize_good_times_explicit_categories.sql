begin;

create or replace function public.gt_normalize_sourced_event_type()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_category text := lower(trim(coalesce(new.event_category, '')));
begin
  -- Explicit provider categories are stronger evidence than words such as
  -- "showcase" or "party" appearing in an event title or supporting copy.
  if v_category ~ '(stand[- ]?up|comedy|comedian)' then
    new.event_type := 'comedy';
  elsif v_category ~ '(dj|dance|electronic|house|dubstep|hyperpop|techno|edm)' then
    new.event_type := 'nightlife';
  elsif v_category ~ '(r&b|rnb|hip hop|hip-hop|rap|alternative|jazz|world|punk|rock|live music|concert|music)' then
    new.event_type := 'concert';
  elsif v_category ~ '(festival|parade|expo|convention)' then
    new.event_type := 'festival';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gt_normalize_sourced_event_type
on public.gt_sourced_events;

create trigger trg_gt_normalize_sourced_event_type
before insert or update of event_category, event_type
on public.gt_sourced_events
for each row
execute function public.gt_normalize_sourced_event_type();

-- Re-evaluate current Aisle 5 and Variety Playhouse records through the same
-- trigger. No record identity, date, venue, source, or publication state changes.
update public.gt_sourced_events
set event_type = event_type,
    updated_at = now()
where source_name in ('Aisle 5 Calendar', 'Variety Playhouse Calendar')
  and nullif(trim(coalesce(event_category, '')), '') is not null;

comment on function public.gt_normalize_sourced_event_type() is
'Normalizes GOOD TIMES event type from explicit source categories before weaker title/context heuristics. Prevents music showcases from being mislabeled as festivals.';

commit;
