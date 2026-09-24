-- GOOD TIMES cache-only public inventory RPC v1
-- Keeps the customer data plane on an already-built verified Atlanta cache before falling back to heavier inventory work.

create or replace function public.gt_public_live_inventory_cache_only_v1(
  p_city text,
  p_service_date date
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
  select case
    when lower(coalesce(p_city,'')) <> 'atlanta' then
      jsonb_build_object(
        'ok',false,
        'city','atlanta',
        'launch_scope','atlanta_only',
        'requested_city',lower(coalesce(p_city,'')),
        'reason','unsupported_city'
      )
    else coalesce((
      select jsonb_build_object(
        'ok',true,
        'city','atlanta',
        'service_date',c.service_date,
        'cache_refreshed_at',c.refreshed_at,
        'is_service_date_match',c.service_date is not distinct from p_service_date,
        'is_fresh',c.refreshed_at >= now()-interval '20 minutes',
        'payload',c.payload
      )
      from public.gt_atlanta_live_inventory_cache_v1 c
      where c.city_key='atlanta'
      limit 1
    ),jsonb_build_object('ok',false,'city','atlanta','reason','cache_missing'))
  end;
$function$;

revoke all on function public.gt_public_live_inventory_cache_only_v1(text,date) from public;
grant execute on function public.gt_public_live_inventory_cache_only_v1(text,date) to anon, authenticated;
