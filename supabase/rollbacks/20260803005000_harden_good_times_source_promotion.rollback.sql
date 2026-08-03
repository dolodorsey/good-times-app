begin;

create or replace function public.gt_promote_sourced_to_shows(
  p_city_filter text default null,
  p_dry_run boolean default false,
  p_limit integer default 500
)
returns table(
  promoted_count integer,
  matched_venue_count integer,
  unmatched_venue_count integer,
  skipped_noise_count integer,
  skipped_city_count integer,
  cities_touched text[]
)
language plpgsql
set search_path to 'public'
as $$
declare
  v_promoted int := 0;
  v_matched int := 0;
  v_unmatched int := 0;
  v_skipped_noise int := 0;
  v_skipped_city int := 0;
  v_cities text[] := array[]::text[];
  r record;
  v_match_found boolean;
  v_canonical_city text;
  v_event_type text;
  v_raw_type text;
  v_noise_patterns text[] := array[
    'career fair','job fair','networking event','mixer event',
    'webinar','virtual event','online event','zoom event',
    'mlm','pyramid','timeshare','realtor open house',
    'real estate seminar','business opportunity','make money'
  ];
  v_noise_match boolean;
begin
  for r in
    select
      se.id, se.event_name, se.event_date, se.event_time,
      se.venue_name, se.venue_address, se.city,
      se.event_type, se.event_category, se.description,
      se.ticket_url, se.ticket_price, se.image_url,
      se.source_name, se.source_url, se.organizer
    from public.gt_sourced_events se
    where se.event_date >= current_date
      and coalesce(se.published_to_gt, false) = false
      and se.event_name is not null
      and (p_city_filter is null or public.gt_city_normalize(se.city) = p_city_filter)
    order by se.event_date asc
    limit p_limit
  loop
    v_noise_match := false;
    for i in 1..array_length(v_noise_patterns, 1) loop
      if lower(r.event_name) like '%' || v_noise_patterns[i] || '%'
         or lower(coalesce(r.description,'')) like '%' || v_noise_patterns[i] || '%' then
        v_noise_match := true;
        exit;
      end if;
    end loop;

    if v_noise_match then
      v_skipped_noise := v_skipped_noise + 1;
      if not p_dry_run then
        update public.gt_sourced_events
        set published_to_gt = true,
            updated_at = now()
        where id = r.id;
      end if;
      continue;
    end if;

    v_canonical_city := public.gt_city_normalize(r.city);
    if v_canonical_city not in (
      'atlanta','houston','miami','new_york','los_angeles',
      'charlotte','dallas','washington_dc','phoenix',
      'scottsdale','las_vegas'
    ) then
      v_skipped_city := v_skipped_city + 1;
      continue;
    end if;

    v_raw_type := lower(trim(coalesce(nullif(r.event_type,''), nullif(r.event_category,''), 'special_event')));
    v_event_type := case v_raw_type
      when 'concert' then 'concert'
      when 'live_music' then 'concert'
      when 'music' then 'concert'
      when 'comedy' then 'comedy'
      when 'festival' then 'festival'
      when 'food_festival' then 'festival'
      when 'food' then 'festival'
      when 'play' then 'play'
      when 'theater' then 'play'
      when 'theatre' then 'play'
      when 'musical' then 'musical'
      when 'sports' then 'sports'
      when 'sport' then 'sports'
      when 'nightlife' then 'nightlife'
      when 'party' then 'nightlife'
      when 'day_party' then 'nightlife'
      when 'dj_night' then 'nightlife'
      when 'pool_party' then 'nightlife'
      when 'brunch' then 'brunch'
      when 'activation' then 'activation'
      else 'special_event'
    end;

    v_match_found := false;
    if r.venue_name is not null and trim(r.venue_name) <> '' then
      select true into v_match_found
      from public.gt_venues v
      where v.city_key = v_canonical_city
        and v.status = 'active'
        and (
          lower(v.name) = lower(trim(r.venue_name))
          or lower(v.name) ilike '%' || lower(trim(r.venue_name)) || '%'
          or lower(trim(r.venue_name)) ilike '%' || lower(v.name) || '%'
        )
      limit 1;
    end if;

    if coalesce(v_match_found, false) then
      v_matched := v_matched + 1;
    else
      v_unmatched := v_unmatched + 1;
    end if;

    if not p_dry_run then
      insert into public.gt_shows (
        city_key, show_date, show_time, event_name, event_type,
        venue_name, venue_address, ticket_url, image_url, description,
        organizer, source, source_url, status, needs_image_sourcing,
        freshness_tier, is_curated, created_at, updated_at
      )
      select
        v_canonical_city, r.event_date, r.event_time,
        r.event_name, v_event_type, r.venue_name, r.venue_address,
        r.ticket_url, r.image_url, r.description, r.organizer,
        coalesce(r.source_name, 'perplexity_scout'), r.source_url,
        'confirmed', (r.image_url is null or r.image_url = ''),
        'fresh', false, now(), now()
      where not exists (
        select 1
        from public.gt_shows
        where city_key = v_canonical_city
          and show_date = r.event_date
          and lower(event_name) = lower(r.event_name)
      );

      update public.gt_sourced_events
      set published_to_gt = true,
          is_published = true,
          updated_at = now()
      where id = r.id;

      v_promoted := v_promoted + 1;
      if not (v_canonical_city = any(v_cities)) then
        v_cities := array_append(v_cities, v_canonical_city);
      end if;
    end if;
  end loop;

  return query
  select v_promoted, v_matched, v_unmatched, v_skipped_noise, v_skipped_city, v_cities;
end;
$$;

grant execute on function public.gt_promote_sourced_to_shows(text, boolean, integer)
to public, anon, authenticated, service_role, postgres;

commit;
