# GOOD TIMES production stabilization — 2026-09-24

## Scope
Atlanta-only public inventory. Preserve the approved member gate, customer UI, auth/profile project, CRM outboxes, provider receipts, other brands, and protected-main release workflow. This patch does not activate the separate Entertainment branch.

## Database actions and evidence
- Removed repeating maintenance jobs 436 and 437. Job 437 had repeatedly succeeded; job 436 repeatedly timed out.
- blackbook_master_contacts now reports 59 MB total, 33 MB heap and 105,781 estimated live rows. Do not treat the older zero-row statistic as proof that this contact table is empty.
- net._http_response remains approximately 2,330 MB. No response or contact rows were deleted or truncated.
- A concurrent response-ID index cannot be built by the current maintenance role: PostgreSQL returned `must be owner of table _http_response`. Failed date-specific job 446 was removed. Do not change ownership or evade that permission boundary.
- One isolated compaction attempt (job 447) timed out after 120 seconds and was removed. No replacement per-minute maintenance loop remains.
- Existing throttles in private.cron_throttle_20260924 are preserved; do not restore minute-level load blindly.

## CDN repair
vercel.json routes /api/data and /api/data-fast into /api/data-live. The wrapper's headers alone are not proof of effective production cache behavior. Targeted Vercel-CDN-Cache-Control is now limited to those three public inventory URLs: 30-second freshness, 120-second stale-while-revalidate. This header has precedence over ordinary Cache-Control. No auth, health, saved items, plans, profile, CRM, or other private endpoint receives this policy. URL query strings and existing Vary: Origin remain intact. Fallback/degraded metadata is not changed to make health appear green.

## Release verification required
Run the full existing test/build suite. After deploying, read the public domain repeatedly with identical request headers and URL; record x-vercel-cache and Age, source/degraded metadata, inventory counts and the deployed commit. Confirm cache bypass is not caused by request Authorization, Range, or Pragma/no-cache. Recheck /api/health independently. Desktop/mobile member-journey screenshots require an authorized real session; never manufacture a passing session or remove the gate to claim success.

## Rollback
Revert the CDN policy commit through a PR. Do not reinstate jobs 436/437/446/447. Revert throttles only after shared database capacity and failure rates support it. The response-table compaction/index remains an infrastructure-owner maintenance item unless a safe existing maintenance mechanism completes it.
