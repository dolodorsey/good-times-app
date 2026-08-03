-- SUPPORT-ONLY MIGRATION — DO NOT APPLY THROUGH NORMAL SUPABASE MIGRATIONS.
--
-- Why: PostGIS currently owns public.spatial_ref_sys as supabase_admin. Normal
-- project migrations run as postgres and cannot safely enable RLS or relocate
-- the extension. Supabase Support must execute this script with the extension
-- owner privileges after a backup and maintenance window are confirmed.
--
-- The transaction is intentionally guarded. Running it as any role other than
-- supabase_admin aborts before changing the extension.

begin;

create schema if not exists extensions;

do $$
declare
  v_version text;
begin
  if current_user <> 'supabase_admin' then
    raise exception 'Support-only migration: current_user must be supabase_admin, got %', current_user;
  end if;

  select extversion into strict v_version
  from pg_extension
  where extname = 'postgis';

  if (select extnamespace::regnamespace::text from pg_extension where extname='postgis') = 'extensions' then
    raise notice 'PostGIS is already installed in extensions; no relocation required.';
    return;
  end if;

  -- Supabase/PostGIS relocation bridge. If the bridge version is unavailable,
  -- this statement fails and the entire transaction rolls back.
  update pg_extension
  set extrelocatable = true
  where extname = 'postgis';

  alter extension postgis set schema extensions;

  execute format('alter extension postgis update to %I', v_version || 'next');
  alter extension postgis update;

  update pg_extension
  set extrelocatable = false
  where extname = 'postgis';
end
$$;

-- Keep PostGIS discoverable to database functions while removing the public
-- schema installation that triggered the security advisory.
grant usage on schema extensions to anon, authenticated, service_role;

-- Validation: extension placement and core coordinate transforms.
do $$
begin
  if (select extnamespace::regnamespace::text from pg_extension where extname='postgis') <> 'extensions' then
    raise exception 'PostGIS relocation validation failed';
  end if;

  perform extensions.st_transform(
    extensions.st_setsrid(extensions.st_makepoint(-84.388, 33.749), 4326),
    3857
  );
end
$$;

-- GOOD TIMES location smoke test. Existing geography columns retain their type
-- dependency when the extension moves; this confirms nearby venue queries work.
select count(*)
from public.gt_venues
where location is not null
  and extensions.st_dwithin(
    location,
    extensions.st_setsrid(
      extensions.st_makepoint(-84.388, 33.749),
      4326
    )::extensions.geography,
    50000
  );

commit;
