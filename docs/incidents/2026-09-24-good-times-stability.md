# GOOD TIMES production stabilization — 2026-09-24

## Scope
Atlanta-only public inventory. Preserve the approved member gate, customer UI, auth/profile project, CRM outboxes, provider receipts and independent brands. Merge current main's Entertainment/nightlife work rather than replacing it with an older customer build.

## Database actions and evidence
- Removed repeating maintenance jobs 436 and 437. Job 437 had repeatedly succeeded; job 436 repeatedly timed out. Removed unsuccessful date-specific maintenance jobs 446/447. Confirmed all four absent on continuation.
- blackbook_master_contacts reports 59 MB total, 33 MB heap and 105,781 estimated live rows. The earlier zero-row estimate was not a verified empty table.
- net._http_response remains approximately 2,331 MB. No response or contact rows were deleted or truncated.
- Concurrent response-ID index build was rejected because the maintenance role does not own net._http_response. Do not change ownership or evade that permission boundary. One isolated compaction attempt timed out after 120 seconds and was removed. No replacement maintenance loop was created.
- Preserve existing throttles and schedules. In continuation, contact reconciliation runs every 15 minutes and social transport reconciliation is staggered every 5 minutes.
- Applied 31 bounded Atlanta taxonomy corrections using active category/subcategory pairs. Original values are retained in private.gt_taxonomy_repair_20260924. Verified all 31 applied and no updated_at timestamp changed. Cache subsequently contained 87 events, 153 venues and 3 unresolved categories; these are not claimed fully categorized or independently reverified event facts.
- Added semantically redundant created >= '-infinity' timestamp predicates to two receipt reconcilers so the existing created index is available. The column is NOT NULL. Social reconciliation subsequently completed in about 0.03 seconds.
- Contact queue still used an expensive merge-scan plan. Revised it to materialize the receipt candidates once and restrict request_id with an indexed ANY(array(...)) lookup. Exact join, ordering, limit, FOR UPDATE SKIP LOCKED and provider outcome handling are preserved. EXPLAIN ANALYZE test: 505 ms, 1701 receipt candidates and 2 disk blocks read. That test had no matching contact rows; it is not proof that pending CRM work has been delivered.
- Original function definitions remain in private.receipt_lookup_function_backup_20260924; restore only when the current definition equals the saved applied_definition.

## CDN repair
vercel.json routes /api/data and /api/data-fast into /api/data-live. Targeted Vercel-CDN-Cache-Control is limited to those three public inventory URLs: 30-second freshness, 120-second stale-while-revalidate. No auth, health, saved items, plans, profile, CRM or other private endpoint receives this policy. Query strings and existing Vary: Origin remain intact. Fallback/degraded metadata is not changed to make health appear green.

## Release verification
Required GitHub checks are verify and geometry from GitHub Actions. Do not disable protections, fabricate statuses, force-push main or promote an unapproved preview as a workaround. Keep the repair branch up to date when other work lands in main and run the actual workflows. After deployment, read the public domain repeatedly with identical URL/headers; record x-vercel-cache, Age, source/degraded metadata, counts and deployed commit. Recheck /api/health independently. Real signed-in screenshots require an authorized real session; never manufacture one or remove the gate to claim success.

## Rollback
Revert this CDN commit through a checked PR. Do not reinstate removed maintenance loops. Restore throttles only after database capacity and error rates justify it. Remaining extension-table physical compaction is not marked complete.
