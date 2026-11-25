# GOOD TIMES reviewed sheet ingest contract

The Discover workbench separates persistent venues/entities from dated event occurrences. Reviewed changes can update an existing Atlanta record through a bounded service-only RPC. Raw source rows, candidate matches, spreadsheet approval states and successful fetches are not backend or publication receipts.

**Workbench:** [101 — GOOD TIMES — Discover Backend Workbench](https://docs.google.com/spreadsheets/d/1i86ZfMKWftc4nr8NG9bFJLGhfSkKSTe3qhcZzLIM97U/edit). **Gateway project:** `dzlmtvodpyhetvektfuo`. The original listing data is the October 6, 2026 audit snapshot; the approval controls were added October 7. Protected baselines retain the original export values, including timestamp microseconds. Adding those controls did not refresh any listing or source verification.

## Input and ownership

| Input table | Canonical identity | Permitted v1 destination |
| --- | --- | --- |
| `Venues_Entities` | `venue_id` → existing `gt_venues.id` | Existing Atlanta venue/entity facts |
| `Event_Occurrences` | `show_id` → existing `gt_shows.id` | Existing Atlanta occurrence facts |
| Every other workbench table | Candidate, source, evidence, taxonomy or recurring-program identity | Reference/review only; no creation, deletion, merge or automatic upsert |

Select a row only when its `review_state` is exactly `APPROVED`, its owner is `DOT`, `LINDA (MUSE)` or `MARIA`, and its explicit patch and evidence are complete. `Ready for engineering`, `Matched`, a high-confidence proposed venue ID and `Published confirmed` are not substitutes for this approval gate.

The existing automation uses the connected spreadsheet and service-role database capability. This contract supplies no background Google credentials, public mutation endpoint, outreach permission, or second runner. Owners review evidence within their assigned work; connector execution and backend validation still establish the actual outcome.

## Current native controls

| Field | Venues column | Events column | Rule |
| --- | --- | --- | --- |
| `baseline_updated_at_raw` | BC | BJ | Protected original timestamp text; never use the rounded date cell for optimistic concurrency |
| `baseline_values_json` | BD | BK | Protected original field values; column hidden to reduce clutter, still available to the connector |
| `baseline_snapshot` | BE | BL | Protected original-export label; not a new verification time |
| `approved_patch_json` | BF | BM | Explicit object containing only the selected database fields to change |
| `review_evidence_url` | BG | BN | Exact detail page supporting the changed facts |
| `review_verified_at_raw` | BH | BO | Actual ISO timestamp with timezone, preserved as text |
| `sync_state` | BI | BP | Connector-owned attempt/readback state |
| `sync_receipt_id` | BJ | BQ | Actual private database receipt UUID, never invented |
| `sync_batch_id` | BK | BR | Stable batch identifier for replay |
| `sync_detail` | BL | BS | Exact result, hold reason or readback explanation |
| `timezone` | BB | BT | Reviewed IANA zone; event `timezone_context` is explanatory text and is never ingested |
| `age_requirement_verified_at_utc` | — | BU | Separate evidence marker for an age claim |

Existing row notes and listing values remain intact. New controls initially contain `NOT_SUBMITTED`; no existing row was approved by adding these columns. The native tables cover `Venues_Entities!A5:BL966` and `Event_Occurrences!A5:BU3022`. `Field_Map` contains 46 rules through row 51.

## RPC request

Call `public.gt_apply_reviewed_listing_changes_v1(p_batch_id text, p_actor text, p_changes jsonb, p_dry_run boolean DEFAULT true)`. Execute privilege is limited to `service_role` and `postgres`; the private receipt table has no anonymous or authenticated access. The security-definer function fixes its search path to `pg_catalog,public,gt_private`.

A request contains 1–100 changes, at most 1 MiB of JSON, and a batch ID of 1–160 characters. A batch cannot contain duplicate row keys or the same canonical record twice. The following is a shape example; placeholders must be replaced with actual reviewed values:

```json
{
  "p_batch_id": "reviewed-packet-unique-id",
  "p_actor": "DOT",
  "p_dry_run": true,
  "p_changes": [{
    "row_key": "Event_Occurrences:actual-show-uuid",
    "record_type": "event",
    "record_id": "actual-show-uuid",
    "expected_updated_at": "exact-original-database-timestamp",
    "expected_values": { "venue_id": null },
    "review_state": "APPROVED",
    "patch": { "venue_id": "reviewed-existing-venue-uuid" },
    "evidence": {
      "source_url": "https://official.example/event/detail",
      "verified_at": "actual-source-review-time-with-timezone",
      "reason": "Specific identity evidence and reason for this correction."
    }
  }]
}
```

Construct `expected_values` from the protected original baseline for **every** patch key, including explicit nulls. An absent baseline key means unknown, not null; stop and obtain a dedicated baseline read and renewed review for that field. Existing fields omitted by the original export, such as `gt_shows.genre`, must not be guessed. New nullable schema fields have explicit null baselines. Timestamp values are compared through their database types so equivalent timestamp notation does not create a false conflict; microseconds remain significant.

The RPC locks the canonical row and checks both its exact timestamp and each original field value. Either mismatch rejects the entire batch with a stale-baseline error. This field comparison also detects link-only changes that intentionally preserve `updated_at`. Never silently rebase a previously approved packet against a fresh row. An unchanged approved patch creates an `unchanged` receipt without refreshing the record.

Dry-run validates and returns proposed before/after values with `prediction_only=true`. It creates no permanent row or receipt and does not execute update triggers. Review that result, then call the identical packet with `p_dry_run=false`. The actual response and receipt contain the final values after database triggers. The same batch ID and row key with identical input return the existing receipt; altered input under that key is rejected. Use a newly reviewed packet for a different change.

## Field conversion

The migration's venue/event whitelists are authoritative. Do not send an entire worksheet row or derive a patch from every difference between an old sheet and a newer database. Only explicitly approved fields belong in `approved_patch_json`. A blank cell does not erase a stored value; approved clearing must use explicit JSON `null`, and required fields cannot be cleared.

| Workbench field | Database field / conversion |
| --- | --- |
| `show_id`, `venue_id` in owning main tables | RPC `record_id`; immutable primary identity |
| Event `venue_id` | Approved foreign-key patch only; `proposed_venue_id` is never copied automatically |
| `source_name` | Event `source` |
| `verified_at_utc`, `freshness_expires_at_utc` | Venue `verified_at`, `freshness_expires_at` |
| `fact_verified_at_utc`, `valid_until_utc` | Event `fact_verified_at`, `valid_until` |
| `age_requirement_verified_at_utc` | Event `age_requirement_verified_at` |
| `hours_json`, `photos_json`, other `*_tags_json`, `best_for_json` | Parse to the corresponding object/array; reject invalid JSON rather than saving text |
| Exact typed `show_date` / `end_date` | `YYYY-MM-DD`, without UTC date shifting |
| Exact typed `show_time` / `doors_time` / `end_time` | Local `HH:MM` where exact; preserve unresolved source text and unknowns |
| `show_time_raw`, `doors_time_raw` | Original observation history; do not substitute a doors time for performance time |
| `timezone_context`, `latest_evidence_at_utc`, `stored_freshness_tier`, match analysis | Reference fields, not fresh canonical facts |
| `publication_state` | Review/reporting control only; does not map to event `status` or publish a row |

Dropdown labels convert as follows; do not send display labels directly to the database:

| Dropdown | Label → stored value |
| --- | --- |
| Free status | `Unknown` → `unknown`; `Verified free` → `verified_free`; `Conditionally free` → `conditional_free`; `Paid` → `verified_paid` |
| Admission | `Ticketed` → `ticketed`; `Free admission` → `free_admission`; `Registration required` → `registration_required`; `Reservation required` → `reservation_required`; `Walk-in` → `walk_in`; `Mixed / conditional` → `mixed_conditional` |
| Price basis | `Per person` → `per_person`; `Per ticket` → `per_ticket`; `Per group` → `per_group`; `Per table` → `per_table`; `From price` → `from_price`; `Donation` → `donation`; `Minimum spend` → `minimum_spend`; `Varies` → `varies` |
| Entity kind | `Venue` → `venue`; `Organization` → `organization`; `Organizer` → `organizer`; `Performer` → `performer`; `Brand` → `brand`; `Room / stage` → `room_stage`; `Mobile / pop-up` → `mobile_pop_up`; `Unclassified` → `unclassified` |

Do not infer free admission from a title, a missing price, a zero starting price or the legacy `is_free=false` default. Public `is_free` is true only for `verified_free`, false only for `verified_paid`, and null otherwise. `is_free_raw` remains an explicitly raw source flag. Do not infer USD from Atlanta, or an age restriction from the inherited `18+` default. A reviewed age change requires its own evidence marker.

## Identity, freshness and protected curation

A new venue link requires an existing, active, currently verified and fresh Atlanta venue plus an unambiguous full-address or reviewed-alias identity match. V1 rejects replacing or clearing an existing nonnull venue link with `canonical_link_replacement_requires_review`. Name-only candidates, ambiguous addresses and stale venues remain held. Parent entities must exist in Atlanta; self-links and cycles are rejected. Atlanta market membership does not imply Atlanta municipality.

Each dated session retains its own canonical show UUID and `show:<uuid>` bookmark key. Provider occurrence IDs require a real provider namespace and stable session key. Preserve separate performance, doors and end times, real overnight/multi-day end dates, cancellations, postponements and sold-out status. Recurring programs remain separate from dated occurrences; no perpetual future rows are generated by this RPC.

Ordinary event corrections, including venue links, preserve `updated_at`; they cannot revive a stale event by changing metadata. Advancing event freshness requires an explicit full packet containing `fact_verified_at`, `valid_until`, `show_date`, `show_time` (including explicit unknown), `venue_name`, `venue_address` and `status`. The fact marker must equal the actual evidence review time. Evidence cannot be future-dated and must be within 72 hours for events or 30 days for venues. Current venue verification requires its evidence URL, actual verification time and finite future expiry. Fact expiry is separate from the event's end date.

No patch can change editorial ranking, `is_featured`, `is_curated`, KHG ownership or culture-pick fields. The scoped final trigger `zzzz_gt_preserve_reviewed_editorial_v1` restores existing ranking/curation values after scoring triggers during reviewed writes. Explicit current taxonomy is preserved unless that exact taxonomy field was approved. The shared promoter uses the same row-scoped protection. Do not disable triggers or change `session_replication_role`.

## Receipts and workbench reconciliation

The append-only `gt_private.gt_backend_change_receipts_v1` stores the canonical record UUID, batch/row key, actor, input hash, changed fields, actual before/after values, evidence, outcome and recorded time. The reviewed RPC creates no records and deletes none. It returns `publication_verified=false` even when an update succeeds.

| `sync_state` | Required evidence |
| --- | --- |
| `NOT_SUBMITTED` | No attempt; the initial state |
| `DRY_RUN_OK` | Successful dry-run response only; receipt remains blank |
| `HELD` | Explicit unresolved source, identity, approval or stale-baseline reason |
| `FAILED` | Actual failed attempt with error code/reason; no invented success receipt |
| `APPLIED_READBACK` | Real receipt plus matching canonical database readback |
| `PUBLIC_VERIFIED` | Applied readback plus current Home/browse/public route showing the same canonical ID and corrected facts |

After a successful application, update only that row's actual canonical fields, receipt columns and new baseline from the receipt/readback. Retain the prior packet and evidence in the private ledger. A failed or held row keeps its previous baseline and review information. Never overwrite unrelated notes, imported lineage, source histories or approval decisions during a refresh.

The source directory's `A:K` social-source block and `L:R` minimal-listing block have different grains and cannot be joined by sheet row. The 1,000 geography-unknown imported rows remain outside Atlanta inventory. Runtime source health, a scheduler success and a new cache timestamp do not establish field verification or public visibility. Preserve existing source IDs and source-family contracts; this v1 RPC does not consolidate `gt_sourced_events`, `gt_city_events`, sports, feeds or recurring programs.

## Implementation and validation

- `api/event-facts.js` is the shared 44-column show projection and unknown-fact mapping used by Home, browse, saved hydration and the legacy gateway. Nullable schema columns and the live-inventory RPC projection must be deployed before these adapter projections.
- `supabase/migrations/20261007034441_good_times_reviewed_sheet_ingest_v1.sql` contains the reviewed RPC and scoped editorial guard. Its rollback removes the reviewed entry point while preserving applied data, receipt history and the shared guard still used by the source promoter. Remove that guard only after a coordinated rollback of the promoter.
- Six targeted payload tests cover canonical identity, source facts, time separation, prices, explicit unknown admission and inherited age defaults. Existing event-time, Atlanta entrypoint and complete-upgrade tests remain relevant.
- The isolated PostgreSQL/PGlite reviewed-ingest harness verifies dry-run behavior, exact freshness preservation, receipt replay, changed-input rejection, stale field baselines, canonical-link protection, validation gates, atomic rollback, trigger preservation and denied unprivileged execution.
- Native approval/baseline/receipt controls were read back across all 39,780 written cells with zero mismatches. Native table bounds, dropdown options, protections and actual styles were checked. No new Google-rendered visual pass is claimed for the control-column edit.

Repository validation is separate from production verification. Applying a migration, refreshing the existing cache and reading the deployed Home/browse/saved payloads remain release responsibilities; record their actual outcomes before claiming this contract is live.
