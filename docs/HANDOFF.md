# Good Times Release Handoff

## Canonical identity

- Repository: `dolodorsey/good-times-app`
- Production: `https://thegoodtimesworldwide.com`
- Publishing authority: MCP Gateway `public.gt_*`
- Dedicated database: GOOD TIMES `czocqfaovfpjweayniuw`
- Intake/staging: Google Drive source directory

## Release rule

`public.gt_venues` and `public.gt_city_events` are publishing authorities. Sheets and source tables create candidates only; they may not publish directly or overwrite verified records.

## Required checks

1. Run `npm ci`.
2. Run `node --test tests/*.test.mjs`.
3. Run `npm run build`.
4. Confirm `/health.json` returns the expected authority and staging system.
5. Validate header mapping, normalization, stable IDs, deduplication, freshness, verification, editorial approval, publish, expiration, and reverification.
6. Validate city, neighborhood, category, price, age, dress code, hours, coordinates, booking link, and attribution.
7. Validate curator, editorial, admin, and customer role isolation.
8. Launch and approve each city independently.
9. Record evidence in Enterprise System Control.

## Data rules

- Drive is staging, not publishing authority.
- Stale, closed, duplicate, or conflicting records must be blocked before publish.
- The dedicated GOOD TIMES project cannot replace MCP authority without a signed migration, reconciliation, and rollback contract.

## Rollback

Stop the import worker, preserve the last verified MCP records, revert Vercel if needed, block the release gate, and reconcile candidate IDs before resuming.
