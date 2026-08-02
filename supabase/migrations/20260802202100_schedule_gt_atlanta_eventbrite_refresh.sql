create or replace function public.gt_run_atlanta_eventbrite_refresh(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net'
as $$
declare
  v_key text;
  v_request_id bigint;
begin
  select credential_value->>'api_key'
  into v_key
  from public.credentials
  where credential_key='gt_atlanta_source_internal'
    and is_active=true
  limit 1;

  if v_key is null or v_key = '' then
    raise exception 'GOOD TIMES internal source credential unavailable';
  end if;

  select net.http_post(
    url => 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/gt-atlanta-eventbrite-refresh',
    headers => jsonb_build_object(
      'content-type','application/json',
      'x-khg-internal-key',v_key
    ),
    body => jsonb_build_object('limit',least(greatest(p_limit,1),10)),
    timeout_milliseconds => 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.gt_run_atlanta_eventbrite_refresh(integer)
from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='gt-atlanta-eventbrite-refresh'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end $$;

select cron.schedule(
  'gt-atlanta-eventbrite-refresh',
  '25 */4 * * *',
  'select public.gt_run_atlanta_eventbrite_refresh(10);'
);
