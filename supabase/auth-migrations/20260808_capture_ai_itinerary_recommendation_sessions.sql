-- GOOD TIMES customer database migration.
-- Records auditable recommendation-session evidence whenever an authenticated
-- AI-generated itinerary is persisted by the live concierge or client fallback.

create or replace function public.gt_capture_ai_itinerary_recommendation_session()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_signal_count integer := 0;
  v_formula_version integer := 2;
  v_thresholds jsonb := '{}'::jsonb;
  v_stage text;
  v_exploration numeric;
  v_candidate_count integer := 0;
  v_result_count integer := 0;
begin
  if coalesce(new.created_by,'user') not in ('ai','good_times_live')
     and coalesce(new.metadata->>'source','') not in ('good-times-live-concierge','good-times-live-client-fallback') then
    return new;
  end if;

  if exists (select 1 from public.gt_recommendation_sessions where itinerary_id = new.id) then
    return new;
  end if;

  select count(*)::integer into v_signal_count
  from public.gt_taste_signals
  where auth_id = new.user_id;

  select version, thresholds
    into v_formula_version, v_thresholds
  from public.gt_formula_versions
  where formula_key='itinerary' and is_active=true
  order by version desc
  limit 1;

  if v_signal_count < 5 then
    v_stage := 'cold';
    v_exploration := 0.20;
  elsif v_signal_count < 20 then
    v_stage := 'warm';
    v_exploration := 0.12;
  else
    v_stage := 'mature';
    v_exploration := 0.08;
  end if;

  v_candidate_count := greatest(
    0,
    coalesce((new.metadata->>'inventory_events')::integer,0)
      + coalesce((new.metadata->>'inventory_venues')::integer,0)
  );
  v_result_count := case
    when jsonb_typeof(coalesce(new.stops,'[]'::jsonb))='array'
      then jsonb_array_length(coalesce(new.stops,'[]'::jsonb))
    else 0
  end;

  insert into public.gt_recommendation_sessions(
    auth_id, city_slug, action, raw_query, parsed_intent,
    formula_key, formula_version, maturity_stage, exploration_rate,
    candidate_count, result_count, itinerary_id, duration_ms
  ) values (
    new.user_id,
    new.city_id,
    'itinerary',
    coalesce(nullif(new.name,''),'GOOD TIMES plan'),
    jsonb_build_object(
      'itinerary_date',new.itinerary_date,
      'group_size',new.group_size,
      'vibe_profile',coalesce(new.vibe_profile,'{}'::jsonb),
      'source',coalesce(new.metadata->>'source',new.created_by),
      'formula_thresholds',coalesce(v_thresholds,'{}'::jsonb)
    ),
    'itinerary',
    coalesce(v_formula_version,2),
    v_stage,
    v_exploration,
    v_candidate_count,
    v_result_count,
    new.id,
    null
  );

  return new;
end;
$$;

revoke all on function public.gt_capture_ai_itinerary_recommendation_session() from public, anon, authenticated;
grant execute on function public.gt_capture_ai_itinerary_recommendation_session() to service_role;

drop trigger if exists gt_capture_ai_itinerary_recommendation_session on public.itineraries;
create trigger gt_capture_ai_itinerary_recommendation_session
after insert on public.itineraries
for each row execute function public.gt_capture_ai_itinerary_recommendation_session();
