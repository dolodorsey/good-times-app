create or replace function public.gt_consumer_request_details_valid(p_type text, p_details jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_start_text text;
  v_end_text text;
  v_start_date date;
  v_end_date date;
  v_group_text text;
  v_group_size integer;
  v_interests text;
  v_notes text;
  v_occasion text;
begin
  if p_details is null or jsonb_typeof(p_details) <> 'object' then return false; end if;
  if pg_column_size(p_details) > 16384 then return false; end if;

  v_interests := btrim(coalesce(p_details->>'interests', ''));
  v_notes := btrim(coalesce(p_details->>'notes', ''));
  v_occasion := btrim(coalesce(p_details->>'occasion', ''));
  v_group_text := nullif(btrim(coalesce(p_details->>'group_size', '')), '');

  if p_type = 'join' then return char_length(v_interests) >= 2; end if;

  v_start_text := nullif(btrim(coalesce(p_details->>'preferred_date', '')), '');
  if v_start_text is null or v_start_text !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  v_start_date := v_start_text::date;

  if v_group_text is not null then
    if v_group_text !~ '^\d+$' then return false; end if;
    v_group_size := v_group_text::integer;
    if v_group_size < 1 or v_group_size > 1000 then return false; end if;
  end if;

  if p_type = 'concierge-request' then return char_length(v_notes) >= 10; end if;
  if p_type = 'group' then return v_group_size is not null and char_length(v_occasion) >= 2; end if;

  if p_type = 'trip' then
    if v_group_size is null then return false; end if;
    v_end_text := nullif(btrim(coalesce(p_details->>'end_date', '')), '');
    if v_end_text is null or v_end_text !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    v_end_date := v_end_text::date;
    return v_end_date >= v_start_date;
  end if;

  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.gt_consumer_request_details_valid(text, jsonb) from public, anon, authenticated;

alter table public.good_times_consumer_requests
  drop constraint if exists good_times_consumer_requests_city_check,
  add constraint good_times_consumer_requests_city_check
    check (city is not null and char_length(btrim(city)) between 2 and 120),
  drop constraint if exists good_times_consumer_requests_details_check,
  add constraint good_times_consumer_requests_details_check
    check (public.gt_consumer_request_details_valid(request_type, details));
