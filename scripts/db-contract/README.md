# Database contract regression tests

Run `node --test scripts/database-contract.test.mjs`, or use the existing `npm test` command.
The runner applies the actual current Discover, reviewed-ingest, and priority-ingest
migration files from `supabase/migrations`. It uses one fresh in-memory PGlite database
per scenario and runs those scenarios sequentially. No credentials, network access,
production listing rows, or external audit exports are required.

`fixtures/baseline.sql` supplies only the pre-contract public table dependencies,
browser/service roles, legacy city/venue normalizers, and the legacy freshness trigger.
It deliberately retains the old show age default and show status/type constraints so
the migrations must remove the unsafe default and satisfy the existing constraints.
All event/venue/source records are synthetic and created by the scenarios.

These are executable PostgreSQL behavior regressions, not a complete Supabase clone.
The pinned PGlite 0.5.8 engine uses PostgreSQL 18.3; production uses PostgreSQL 17.6.
The runner reports its actual engine version. Passing here does not replace migration
validation on the target PostgreSQL version, Supabase security/performance advisors,
or deployed collector and application checks. No production mutation occurs.
