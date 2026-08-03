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
set search_path to 'public', 'pg_temp'
as $$
declare
  v_promoted integer := 0;
  v_matched integer := 0;
  v_unmatched integer := 0;
  v_skipped_noise integer := 0;
  v_skipped_city integer := 0;
  v_cities text[] := array[]::text[];
  v_match_found boolean;
  v_show_exists boolean;
  v_inserted integer := 0;
  v_canonical_city text;
  v_event_type text;
  v_raw_type text;
  v_noise_match boolean;
  v_noise_patterns text[] := array[
    'career fair','job fair','networking event','mixer event',
    'webinar','virtual event','online event','zoom event',
    'mlm','pyramid','timeshare','realtor open house',
    'real estate seminar','business opportunity','make money'
  ];
  r record;
begin
  for r in
    select
      se.id,
      se.event_name,
      se.event_date,
      se.event_time,
      se.venue_name,
      se.venue_address,
      se.city,
      se.event_type,
      se.event_category,
      se.description,
      se.ticket_url,
      se.image_url,
      se.source_name,
      se.source_url,
      se.organizer
    from public.gt_sourced_events se
    where se.event_date >= (now() at time zone 'America/New_York')::date
      and coalesce(se.published_to_gt, false) = false
      and coalesce(se.is_verified, false) = true
      and coalesce(se.is_published, false) = true
      and se.legacy_quarantined_at is null
      and se.legacy_quarantine_reason is null
      and nullif(trim(se.event_name), '') is not null
      and (
        p_city_filter is null
        or public.gt_city_normalize(se.city) = public.gt_city_normalize(p_city_filter)
      )
    order by se.event_date asc, se.event_time asc nulls last, se.created_at asc
    limit least(greatest(coalesce(p_limit, 500), 1), 5000)
  loop
    v_noise_match := false;
    for i in 1..array_length(v_noise_patterns, 1) loop
      if lower(r.event_name) like '%' || v_noise_patterns[i] || '%'
         or lower(coalesce(r.description, '')) like '%' || v_noise_patterns[i] || '%' then
        v_noise_match := true;
        exit;
      end if;
    end loop;

    if v_noise_match then
      v_skipped_noise := v_skipped_noise + 1;
      if not p_dry_run then
        update public.gt_sourced_events
        set published_to_gt = true,
            updated_at = now(),
            raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(
              'promotion_exclusion', jsonb_build_object(
                'reason', 'noise_pattern',
                'processed_at', now()
              )
            )
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

    v_raw_type := lower(trim(coalesce(nullif(r.event_type, ''), nullif(r.event_category, ''), 'special_event')));
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

    select exists (
      select 1
      from public.gt_venues v
      where v.city_key = v_canonical_city
        and v.status = 'active'
        and (
          lower(v.name) = lower(trim(r.venue_name))
          or lower(v.name) ilike '%' || lower(trim(r.venue_name)) || '%'
          or lower(trim(r.venue_name)) ilike '%' || lower(v.name) || '%'
        )
    )
    into v_match_found;

    if coalesce(v_match_found, false) then
      v_matched := v_matched + 1;
    else
      v_unmatched := v_unmatched + 1;
    end if;

    select exists (
      select 1
      from public.gt_shows s
      where s.city_key = v_canonical_city
        and s.show_date = r.event_date
        and lower(s.event_name) = lower(r.event_name)
    )
    into v_show_exists;

    if p_dry_run then
      if not v_show_exists then
        v_promoted := v_promoted + 1;
        if not (v_canonical_city = any(v_cities)) then
          v_cities := array_append(v_cities, v_canonical_city);
        end if;
      end if;
      continue;
    end if;

    v_inserted := 0;
    if not v_show_exists then
      insert into public.gt_shows (
        city_key,
        show_date,
        show_time,
        event_name,
        event_type,
        venue_name,
        venue_address,
        ticket_url,
        image_url,
        description,
        organizer,
        source,
        source_url,
        status,
        needs_image_sourcing,
        freshness_tier,
        is_curated,
        created_at,
        updated_at
      )
      values (
        v_canonical_city,
        r.event_date,
        r.event_time,
        r.event_name,
        v_event_type,
        r.venue_name,
        r.venue_address,
        r.ticket_url,
        r.image_url,
        r.description,
        r.organizer,
        coalesce(r.source_name, 'good_times_scout'),
        r.source_url,
        'confirmed',
        (r.image_url is null or r.image_url = ''),
        'fresh',
        false,
        now(),
        now()
      );
      get diagnostics v_inserted = row_count;
    end if;

    update public.gt_sourced_events
    set published_to_gt = true,
        is_published = true,
        updated_at = now(),
        raw_data = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(
          'promotion', jsonb_build_object(
            'processed_at', now(),
            'inserted_show', v_inserted = 1,
            'duplicate_show_already_existed', v_show_exists
          )
        )
    where id = r.id;

    if v_inserted = 1 then
      v_promoted := v_promoted + 1;
      if not (v_canonical_city = any(v_cities)) then
        v_cities := array_append(v_cities, v_canonical_city);
      end if;
    end if;
  end loop;

  return query
  select
    v_promoted,
    v_matched,
    v_unmatched,
    v_skipped_noise,
    v_skipped_city,
    v_cities;
end;
$$;

revoke all on function public.gt_promote_sourced_to_shows(text, boolean, integer)
from public, anon, authenticated;
grant execute on function public.gt_promote_sourced_to_shows(text, boolean, integer)
to service_role, postgres;

comment on function public.gt_promote_sourced_to_shows(text, boolean, integer) is
'Promotes only verified, published, non-quarantined sourced events using the Atlanta-local date boundary. promoted_count reports actual new gt_shows inserts, not duplicate processing.';

commit;
