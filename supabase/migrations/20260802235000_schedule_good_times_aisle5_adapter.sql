begin;

-- The shared venue adapter remains responsible for Variety Playhouse only.
-- Aisle 5 has its own parser because its SeeTickets-rendered page requires a
-- different extraction strategy.
create or replace function public.gt_run_atlanta_official_venue_adapters(
  p_dry_run boolean default false
)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net', 'pg_temp'
as $$
declare
  v_key text;
  v_request_id bigint;
begin
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
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-venue-adapters',
    headers => jsonb_build_object(
      'content-type', 'application/json',
      'x-khg-internal-key', v_key
    ),
    body => jsonb_build_object(
      'dry_run', coalesce(p_dry_run, false),
      'source_ids', jsonb_build_array('289bdf4f-4be2-489c-8551-e15b6cfc3cec')
    ),
    timeout_milliseconds => 120000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.gt_run_atlanta_official_venue_adapters(boolean)
from public, anon, authenticated;
grant execute on function public.gt_run_atlanta_official_venue_adapters(boolean)
to service_role, postgres;

create or replace function public.gt_run_atlanta_aisle5_adapter(
  p_dry_run boolean default false
)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net', 'pg_temp'
as $$
declare
  v_key text;
  v_request_id bigint;
begin
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
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-aisle5-adapter',
    headers => jsonb_build_object(
      'content-type', 'application/json',
      'x-khg-internal-key', v_key
    ),
    body => jsonb_build_object('dry_run', coalesce(p_dry_run, false)),
    timeout_milliseconds => 120000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.gt_run_atlanta_aisle5_adapter(boolean)
from public, anon, authenticated;
grant execute on function public.gt_run_atlanta_aisle5_adapter(boolean)
to service_role, postgres;

comment on function public.gt_run_atlanta_aisle5_adapter(boolean) is
'Invokes the protected dedicated Aisle 5 SeeTickets calendar adapter.';

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'gt-atlanta-aisle5-adapter'
    limit 1;
    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'gt-atlanta-aisle5-adapter',
      '35 */4 * * *',
      $cron$select public.gt_run_atlanta_aisle5_adapter(false);$cron$
    );
  end if;
end;
$$;

commit;
