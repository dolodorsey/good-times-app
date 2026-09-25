# GOOD TIMES closeout follow-through

## Protected scope
Atlanta public inventory and release verification only. No approved UI, auth requirement, saved items, plans, other brands, delivery semantics, or release protections are changed.

## Database source regression repaired
A new Eventbrite ATL · Finance & Investing import entered the cache without a category after the earlier 34 repairs. The bounded migration `good_times_finance_source_taxonomy_guard_20260924` adds an exact-source plus finance-content guard only when an Atlanta classification is missing. It preserves existing reviewed categories and freshness timestamps. The affected cache row was backed up in `private.gt_taxonomy_repair_20260924`; the source-guard function backup is in `private.gt_ingest_guard_backup_20260924`. This is a taxonomy correction, not re-verification of ticket dates or investment claims. Roll back only if the live function/category still matches the applied backup; never overwrite subsequent edits.

## Maintenance outcome
A single standard, non-FULL VACUUM used SKIP_LOCKED, TRUNCATE FALSE, PARALLEL 0 and a 256kB buffer ring. It timed out at the existing 120-second limit while scanning block 50,195; job454 was removed. Physical receipt-table compaction remains open. No live receipts or contacts were deleted. Do not repeat FULL vacuum loops, change table ownership, disable the timeout globally or restart paused messaging jobs to claim completion.

## Exact production identity
`/api/release` reports only the deployment commit/environment and is uncached and database-independent. The existing hourly production smoke now waits for its exact checked-out commit to reach production before running its unchanged customer assertions. It must fail rather than silently testing another release. This removes the deploy-start versus deploy-ready race without hiding real degraded data.

## Honest customer proof
The closeout workflow observes eight real inventory and independent health reads across cache expiry, captures actual anonymous mobile/desktop screens, and attempts an existing GT_UI_QA_SESSION only if configured. Customer tokens are verified with the correct auth server before the app's normal session storage is populated. No invented token, account creation, mocked APIs or auth gate removal is allowed. Missing/expired credentials remain BLOCKED, not a passing signed-in journey. Private profile/saved/plan text and credentials are never written to artifacts. Navigation evidence does not certify save writes or plan creation. Physical database maintenance and full authenticated write journeys remain separate closeout requirements.
