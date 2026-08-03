# PostGIS Relocation Runbook

## Status

Support intervention required. Do not run the support migration from the Supabase SQL editor, CLI migration runner, CI, or an application connection.

## Problem

PostGIS is installed in `public`, so `public.spatial_ref_sys` is owned by `supabase_admin` with row-level security disabled. The project migration role is `postgres`, which cannot safely alter that extension-owned table. Enabling RLS alone is not an acceptable workaround because extension ownership and future PostGIS upgrades would remain misaligned.

## Controlled resolution

Ask Supabase Support to execute:

`supabase/support-migrations/20260803_relocate_postgis_from_public.sql`

The script:

1. Requires `current_user = supabase_admin`.
2. Runs inside one transaction.
3. Makes PostGIS temporarily relocatable using the supported upgrade bridge.
4. Moves the extension from `public` to `extensions`.
5. Restores the extension to non-relocatable state.
6. Grants schema usage to application roles.
7. Runs coordinate-transform and GOOD TIMES nearby-venue smoke tests.
8. Rolls back automatically if any statement or validation fails.

## Preflight checklist

- Create a database backup or point-in-time recovery checkpoint.
- Record `select extversion, extnamespace::regnamespace from pg_extension where extname='postgis';`.
- Record all geometry/geography columns:

```sql
select table_schema, table_name, column_name, udt_schema, udt_name
from information_schema.columns
where udt_name in ('geometry', 'geography')
order by table_schema, table_name, ordinal_position;
```

- Confirm GOOD TIMES production and its latest rollback candidate are healthy.
- Schedule a low-traffic maintenance window.
- Confirm the `${CURRENT_POSTGIS_VERSION}next` bridge is available in the project before execution.

## Post-migration validation

```sql
select extversion, extnamespace::regnamespace::text
from pg_extension
where extname='postgis';
```

Expected schema: `extensions`.

```sql
select extensions.st_astext(
  extensions.st_transform(
    extensions.st_setsrid(extensions.st_makepoint(-84.388, 33.749), 4326),
    3857
  )
);
```

```sql
select count(*)
from public.gt_venues
where location is not null
  and extensions.st_dwithin(
    location,
    extensions.st_setsrid(
      extensions.st_makepoint(-84.388, 33.749), 4326
    )::extensions.geography,
    50000
  );
```

Then test the production map, location permissions, venue discovery, and Atlanta nearby-results flow.

## Rollback

The migration is transactional. A failure before `commit` restores the original extension placement. After a successful commit, relocation back to `public` also requires the extension owner and Supabase Support; do not attempt a drop/recreate rollback against production.
