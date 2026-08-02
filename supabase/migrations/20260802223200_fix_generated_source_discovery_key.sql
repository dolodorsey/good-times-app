begin;

-- gt_source_discoveries.dedup_key is a stored generated column. The processor
-- must let PostgreSQL derive it from platform + normalized handle_or_url.
do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.gt_refresh_instagram_social_signals(text,integer,boolean)'::regprocedure
  ) into v_definition;

  v_updated := replace(
    v_definition,
    E'      integrated_to_sources,\n      dedup_key,\n      updated_at',
    E'      integrated_to_sources,\n      updated_at'
  );

  v_updated := replace(
    v_updated,
    E'      false,\n      ''instagram:'' || v_city_key || '':'' || c.source_handle,\n      now()',
    E'      false,\n      now()'
  );

  if v_updated = v_definition then
    raise exception 'Expected generated dedup_key assignment was not found in gt_refresh_instagram_social_signals';
  end if;

  execute v_updated;
end $$;

revoke all on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
from public, anon, authenticated;
grant execute on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
to service_role, postgres;

commit;
