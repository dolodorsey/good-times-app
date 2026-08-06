-- GOOD TIMES external queue worker contract.
-- The existing agent schedules remain responsible for orchestration. This worker
-- leases durable gt_agent_work_items and acknowledges each external execution.

create extension if not exists pgcrypto;
create extension if not exists supabase_vault;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.gt_external_worker_config (
  config_key text primary key,
  token_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gt_external_worker_config enable row level security;
revoke all on public.gt_external_worker_config from public, anon, authenticated;

do $block$
declare v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if not exists (
    select 1 from public.gt_external_worker_config
    where config_key = 'good_times_agent_worker'
  ) then
    insert into public.gt_external_worker_config(config_key, token_hash)
    values ('good_times_agent_worker', encode(extensions.digest(v_token, 'sha256'), 'hex'));
    perform vault.create_secret(
      v_token,
      'good_times_agent_worker_token',
      'Internal GOOD TIMES external queue worker token'
    );
  end if;
end
$block$;

create or replace function public.gt_authorize_external_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'public', 'extensions'
as $$
  select exists (
    select 1
    from public.gt_external_worker_config
    where config_key = 'good_times_agent_worker'
      and is_active
      and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
  );
$$;

create or replace function public.gt_claim_external_work_item(
  p_worker_id text default 'good-times-agent-worker'
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare v_item public.gt_agent_work_items%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into v_item
  from public.gt_agent_work_items w
  where w.status in ('queued', 'waiting')
    and w.not_before <= now()
    and w.attempts < w.max_attempts
    and not exists (
      select 1 from public.gt_agent_work_items active
      where active.agent_key = w.agent_key
        and active.status = 'in_progress'
        and active.lease_expires_at > now()
    )
  order by w.priority, w.not_before, w.created_at
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.gt_agent_work_items
  set status = 'in_progress',
      leased_by = left(coalesce(nullif(trim(p_worker_id), ''), 'good-times-agent-worker'), 120),
      leased_at = now(),
      lease_expires_at = now() + interval '4 minutes',
      attempts = attempts + 1,
      error_message = null,
      updated_at = now()
  where id = v_item.id
  returning * into v_item;

  return jsonb_build_object(
    'id', v_item.id,
    'work_key', v_item.work_key,
    'agent_key', v_item.agent_key,
    'work_type', v_item.work_type,
    'target_type', v_item.target_type,
    'target_key', v_item.target_key,
    'city_key', v_item.city_key,
    'payload', v_item.payload,
    'attempt', v_item.attempts,
    'max_attempts', v_item.max_attempts
  );
end;
$$;

create or replace function public.gt_complete_external_work_item(
  p_item_id uuid,
  p_worker_id text,
  p_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare v_updated integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  update public.gt_agent_work_items
  set status = 'completed',
      result = coalesce(p_result, '{}'::jsonb),
      evidence = coalesce(evidence, '{}'::jsonb) || jsonb_build_object(
        'external_worker', left(coalesce(p_worker_id, ''), 120),
        'executed_at', now()
      ),
      completed_at = now(),
      leased_by = null,
      leased_at = null,
      lease_expires_at = null,
      error_message = null,
      updated_at = now()
  where id = p_item_id
    and status = 'in_progress'
    and leased_by = left(coalesce(p_worker_id, ''), 120);
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.gt_fail_external_work_item(
  p_item_id uuid,
  p_worker_id text,
  p_error text
)
returns text
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare v_status text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  update public.gt_agent_work_items
  set status = case when attempts < max_attempts then 'waiting' else 'failed' end,
      not_before = case when attempts < max_attempts
        then now() + make_interval(mins => least(60, greatest(5, attempts * 5)))
        else not_before end,
      error_message = left(coalesce(nullif(p_error, ''), 'Unknown external worker error'), 1000),
      leased_by = null,
      leased_at = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_item_id
    and status = 'in_progress'
    and leased_by = left(coalesce(p_worker_id, ''), 120)
  returning status into v_status;
  return v_status;
end;
$$;

create or replace function public.gt_dispatch_external_agent_worker(p_limit integer default 4)
returns bigint
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'net', 'vault'
as $$
declare v_token text; v_request_id bigint;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'good_times_agent_worker_token'
  order by created_at desc
  limit 1;
  if nullif(v_token, '') is null then raise exception 'GOOD TIMES worker token missing'; end if;

  select net.http_post(
    url := 'https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/good-times-agent-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-token', v_token),
    body := jsonb_build_object('limit', least(10, greatest(1, coalesce(p_limit, 4)))),
    timeout_milliseconds := 50000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.gt_authorize_external_worker_token(text) from public, anon, authenticated;
revoke all on function public.gt_claim_external_work_item(text) from public, anon, authenticated;
revoke all on function public.gt_complete_external_work_item(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.gt_fail_external_work_item(uuid, text, text) from public, anon, authenticated;
revoke all on function public.gt_dispatch_external_agent_worker(integer) from public, anon, authenticated;
grant execute on function public.gt_authorize_external_worker_token(text) to service_role;
grant execute on function public.gt_claim_external_work_item(text) to service_role;
grant execute on function public.gt_complete_external_work_item(uuid, text, jsonb) to service_role;
grant execute on function public.gt_fail_external_work_item(uuid, text, text) to service_role;
grant execute on function public.gt_dispatch_external_agent_worker(integer) to service_role;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'good-times-external-agent-worker';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
  perform cron.schedule(
    'good-times-external-agent-worker',
    '*/5 * * * *',
    $cmd$select public.gt_dispatch_external_agent_worker(1);$cmd$
  );
end
$block$;

comment on table public.gt_external_worker_config is
  'Private GOOD TIMES external worker authentication. Service role only; intentionally no client RLS policies.';
