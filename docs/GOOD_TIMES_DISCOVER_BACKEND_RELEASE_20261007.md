# GOOD TIMES Discover backend repair — October 7, 2026

## Outcome and scope

The Discover workbench separates persistent venues/entities from dated event occurrences. This release connects reviewed spreadsheet corrections to canonical content, repairs occurrence identity and repeat-source updates, and preserves explicit admission, price, end-time and verification facts in the existing API payloads.

The content authority is Supabase project `dzlmtvodpyhetvektfuo`. Account and save ownership remains in `czocqfaovfpjweayniuw`. Canonical show/venue UUIDs and `show:<UUID>` saved-item keys stay stable. The public market remains Atlanta. The app's current Home / Places / Plan / Entertainment / Profile composition is protected; this release changes backend functions and API data, with no component or stylesheet edits.

## Database changes

Apply these migrations in order:

1. `20261007034323_good_times_discover_data_contract_v1.sql`: additive fields; private source-to-show identity and before/after receipt ledgers; conservative venue resolution; source fact mapping; protected repeat updates; public inventory projection. The final editorial guard is installed before the publisher changes, so scheduled calls are safe between migrations.
2. `20261007034441_good_times_reviewed_sheet_ingest_v1.sql`: the service-only reviewed-change RPC with exact field/timestamp baselines, bounded batches, evidence checks, dry run, idempotent receipts and a scoped final editorial guard.
3. `20261007034451_good_times_priority_occurrence_updates_v1.sql`: approved official-source intake with unambiguous identity, preserved source review controls, owned-field updates, explicit evidence and actual canonical receipts.

Existing non-Atlanta promotion behavior is retained behind an explicit-city-only private function. The NULL dispatcher keeps the bounded cohort and uses the appropriate city path. New Eventbrite/direct-source intake stays pending; this release does not broadly approve or publish the imported backlog.

Automatic venue linkage requires a reviewed alias or one unique complete normalized address across all venue UUIDs, including inactive duplicates. The target must be active, verified, current and unexpired. Unit/floor, approved municipality and ZIP remain in the match key. Name-only guesses and incomplete competing addresses remain held.

Free admission requires explicit evidence. A default `false`, missing price or zero offer does not establish admission policy. The inherited `18+` default is no longer applied to new rows and is suppressed in public payloads without its own evidence timestamp. The latest structured source observation can withdraw optional source-owned facts; it cannot erase a manually corrected fact. Unknown status cannot reopen an existing cancelled listing.

## Workbook operations

Use [101 — GOOD TIMES — Discover Backend Workbench](https://docs.google.com/spreadsheets/d/1i86ZfMKWftc4nr8NG9bFJLGhfSkKSTe3qhcZzLIM97U/edit) and the [reviewed ingestion contract](GOOD_TIMES_REVIEWED_SHEET_INGEST_CONTRACT_20261007.md).

Approval requires a concrete patch, evidence, an exact original timestamp and original values for every patched field. Run the identical packet as a dry run before applying it. A successful write returns a real receipt; only matching canonical readback permits `APPLIED_READBACK`. Changes that do not reverify the whole event retain its original `updated_at`. A canonical venue link alone is not evidence that the event's time, tickets or current operation have been rechecked.

The production dry run accepted 31 conservative venue links and seven classification corrections. Six address candidates missing the required suite remain held; two older reviewed aliases at confidence 95/96 also remain held because the deployed resolver requires 100. All 38 applied repairs have private receipts and exact full-row canonical readback. Receipt-dependent workbook reconciliation must preserve unresolved timing, venue and description issues. Audit-snapshot counts and current backend counts are distinct.

## Collector release

Deploy the Eventbrite refresh, direct-source refresh and priority scout with every relative module included. The Eventbrite/direct functions share `_shared/gt-source-occurrence.mjs`; priority scout uses the same bounded classifier and structured observation facts. Preserve the existing internal authentication and `verify_jwt=false` configuration, which is protected by each function's custom authentication. No new credentials or scheduler are introduced.

See [collector occurrence contract](GOOD_TIMES_COLLECTOR_OCCURRENCE_CONTRACT_20261007.md) for exact identity and evidence rules. Source attempt, fetched response, parsed candidates, accepted observation, canonical mutation and public readback are separate outcomes. A configured source or empty successful request does not demonstrate new inventory.

## Verification and release receipts

`npm test` includes portable isolated database behavior checks through the pinned PGlite development dependency. The isolated engine is PostgreSQL 18.3; the observed production database is PostgreSQL 17.6. These tests do not substitute for production migration compilation and guarded readback. Required `verify` and `geometry` CI checks, an exact-SHA READY Vercel preview, runtime checks and production smoke remain release gates.

The initial dependency audit found existing vulnerable lockfile versions. Capacitor Android/iOS were patched to 8.5.2 and `source-map-js` to 1.2.2. The repository dependency audit now reports zero vulnerabilities. This does not itself prove that a new native app binary has been distributed. References: [Capacitor advisory](https://github.com/advisories/GHSA-rvm3-566m-v7fv), [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

Production deployment IDs, exact commit, migration receipts, executed packet outcomes, source-run results and canonical/API readback belong in the accompanying execution report. No production verification is implied by this implementation document alone.

## Rollback

Each migration has a corresponding file under `supabase/rollbacks`. Roll back entrypoints in reverse order and restore the prior Edge Function source versions and app deployment when required. Retain additive columns, source identity history and before/after receipts. Do not delete evidence to reverse a release.

Undo a reviewed data change only against its actual after-state and a new explicit guarded correction. If the record has since changed, hold it for review. The reviewed-sheet rollback leaves the shared editorial guard in place because the source publisher depends on it; remove it only as part of a coordinated publisher rollback.

## Separate access containment discovered during release

The advisor review detected two concurrently created internal GOOD TIMES email-audience views with browser SELECT grants. Migration `20261007035118_good_times_private_audience_view_access.sql` revokes PUBLIC/anon/authenticated grants and retains service-role SELECT. Catalog readback confirms browser table and column SELECT are false for both views; definitions, suppression behavior and audience rows were not changed. This is separate from the listing changes. Do not restore public contact access as a rollback action.
