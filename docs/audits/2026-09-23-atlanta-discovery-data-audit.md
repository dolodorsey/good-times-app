# GOOD TIMES Atlanta — discovery data/backend audit

Status: AUDITED; REPAIR CANDIDATE STAGED, NOT APPLIED. No UI redesign or production release is included.

## Authority and evidence
- Production/main SHA: `0edd653cb8546387ac9426a346dfcf8f6a2f8e09`.
- Production deployment: `dpl_5eBS2XiUicwnFWazWJhoTgLSatUC`.
- Canonical content project: MCP Gateway `dzlmtvodpyhetvektfuo`.
- Supabase audit record: `0a9bf12f-e904-485c-936a-b83db0943bc3` in `prompts_and_standards`, brand `good_times`.
- Existing workbook: https://docs.google.com/spreadsheets/d/1pzvjbDbl1UKYFDJ-LSWQuJE9I8XDBNOg-fjLb2amo6Q/edit
- Findings: ATL_Backend_Audit, gid923260012 (19 rows). Blueprint: ATL_Discovery_Map, gid923260013 (35 rows). Acceptance plan: ATL_Repair_Plan, gid923260014 (14 rows).
- SQL observations September23,2026 around09:29–09:42UTC. Counts are point-in-time and record-based; they are not unique-business totals or rendered screenshots.

## P0 incident
Both `/api/data-fast?city=atlanta&event_limit=1&venue_limit=1` and `/api/data?city=atlanta&event_limit=1&venue_limit=1` returned HTTP503. Vercel logged `inventory RPC timed out` and `PGRST002` schema-cache failure. The two routes share the same inventory dependency, not independent fallbacks. A single documented schema-reload notification at09:34:29UTC did not clear the subsequent09:35:41 probe. Minimal direct SQL `gt_public_live_inventory(...,1,1)` completed in14.342ms; this is NOT full-load, public-role, or HTTP-path validation. Do not restart the shared project, change exposed schemas, weaken RLS, or introduce service-role browser access on this evidence. Restore Data API health before applying schema changes.

## Main findings
1. 25 active categories and141 active subcategories, but zero dessert/bakery/ice-cream branches. Dining is oriented around events, not complete place discovery.
2. Atlanta901 venue records:185 active,677 needing reverification. Active includes70 expired and2 missing expiry;113 satisfy fresh verified state.
3. Raw materialization175 distinct venues, live directory105, stricter cache83. These are different populations, not additive figures.
4. 65 count rows disagree with live results. Nightclubs9 vs0, lounges2 vs0, nightlife total35 vs2; date_night absent/zero from count source vs20 current memberships. `v_gt_venue_taxonomy_counts` reads raw materialization; directory adds expiry and curated memberships.
5. Revel, Opium, Seven and EMBR venue records remain `needs_reverification`. Dated event research is not venue reverification. Live rooftop_nights contains one venue.
6. Place type, cuisine, physical feature, service, occasion, music, talent role and event format are mixed. Generic restaurant rules imply brunch/pop-ups/classes. Observed Marcel memberships include all three.9Mile maps to real-estate/NewYear memberships by capability. These are unsupported inferences, not assertions that those offerings never occur.
7. Among185 active rows:176 missing hero_image,181 missing booking_link,177 missing hours,102 missing IG,49 missing coordinates,179 empty best_for,184 empty amenities,185 empty dietary_tags. Other media/action stores were not certified by this column audit.
8. Sourcing queue141 rows last updatedAug18–26;133 unresolved overdue. Recheck register609 rows,278 overdue,110 failed at inspection. Cache refreshed_at does not equal source verification.
9. Duplicate-name groups (Cafe Circa/MJQ/Believe/PCM roof and others) need exact location/room/alias review. Never merge by name alone.
10. `v_gt_customer_subcategory_inventory` event arm uses `e.source_id::uuid AS venue_id`: a source event ID is not a venue ID.
11. `gt_public_live_inventory` venue arm and direct client fallback omit the expiry conditions used by Discover. Fix all eligibility paths together, without mass-reactivating stale rows.
12. Inspected ingestion gate uses official_seen/confidence/HTTPS but does not enforce the current two-source policy itself. Existing-venue opening update does not reconcile status/expiry. Ordinary venue reverification must not be disguised as an opening signal.
13. Explore search omits search_tags/best_for from its filter; `exact || fallback` cannot distinguish authoritative zero from unavailable counts. Taxonomy confidence is not experience quality.
14. Direct GHL connector returned401 IAM, which is not proof stored runtime failed. Exact GOOD TIMES location is `jbm4vUg0J1llNkK8q6Lt`. BOH credential_verified vs pipeline_scope_missing and a separate worldwide alias conflict. Inspected bridge maps10 general fields/13 general tags,10 Atlanta venue contacts and5 historical synced receipts; this is not total GHL inventory. No live CRM write or message occurred.

## Changes in this audit
- Saved audit, source-oriented blueprint and acceptance work in the existing Sheet and Supabase.
- Enriched eight existing OPEN venue enrichment tasks with exact next-source actions, retaining status/holds and saving preimages in the audit metadata. Sweet Tooth priority raised1→9 for stale dessert identity review; already-high club priorities were retained, not falsely counted as upgrades.
- Added a read-only diagnostic and a count-repair proposal with rollback. No production schema change.
- Read-only candidate query at09:42:13UTC: Atlanta count parity differences0; other-city differences0; date_night20; nightlife total2.

## Layered target
Keep Home/Discover/Plan/Saved/Profile and all valid deep categories. Add controlled place offerings/types (dessert, cafes, dining, clubs, lounges), independent cuisines, physical features (real rooftop vs patio), editorial occasions (date night, celebration), factual services (brunch, late kitchen), and dated events/roles. One exact venue identity can have multiple supported memberships. Capability stays internal; it is not evidence an event or service exists. Unknown facts stay unknown.

## Release gates
R01 API recovery first; R02 count parity; R03 shared eligibility; R04 priority venue reverification; R05 layered taxonomy; R06 capability leakage; R07 IDs; R08 ingestion contract; R09 enrichment; R10 source freshness; R11 identity; R12 CRM; R13 search/roles; R14 release QA. Run exact-sha tests/build, required verify/geometry checks, permissions/performance tests, Supabase advisors after any applied DDL, and actual desktop/mobile screenshots. No screenshots or full production verification were obtained during this audit because the browser container could not resolve production DNS.
