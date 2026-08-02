begin;

create or replace function public.gt_run_atlanta_direct_sources_by_ids(
  p_source_ids uuid[]
)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net'
as $$
declare
  v_key text;
  v_request_id bigint;
  v_source_ids text[];
begin
  if p_source_ids is null
     or cardinality(p_source_ids) = 0
     or cardinality(p_source_ids) > 12 then
    raise exception 'Provide between 1 and 12 source IDs';
  end if;

  select array_agg(distinct source_id::text order by source_id::text)
  into v_source_ids
  from unnest(p_source_ids) source_id
  join public.gt_event_sources source
    on source.id = source_id
  where lower(source.city) = 'atlanta'
    and source.is_active = true
    and source.source_type in ('official','venue','comedy_club','blog','aggregator');

  if v_source_ids is null or cardinality(v_source_ids) = 0 then
    raise exception 'No eligible active Atlanta sources were supplied';
  end if;

  select credential_value->>'api_key'
  into v_key
  from public.credentials
  where credential_key = 'gt_atlanta_source_internal'
    and is_active = true
  limit 1;

  if coalesce(v_key, '') = '' then
    raise exception 'GOOD TIMES internal source credential unavailable';
  end if;

  select net.http_post(
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-source-refresh',
    headers => jsonb_build_object(
      'content-type','application/json',
      'x-khg-internal-key',v_key
    ),
    body => jsonb_build_object(
      'limit',cardinality(v_source_ids),
      'source_ids',to_jsonb(v_source_ids)
    ),
    timeout_milliseconds => 120000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.gt_run_atlanta_direct_sources_by_ids(uuid[])
from public, anon, authenticated;
grant execute on function public.gt_run_atlanta_direct_sources_by_ids(uuid[])
to service_role, postgres;

comment on function public.gt_run_atlanta_direct_sources_by_ids(uuid[]) is
'Runs the protected Atlanta direct-source collector for 1–12 explicitly selected active source IDs. Used for controlled adapter and URL verification.';

commit;
