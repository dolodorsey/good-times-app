# GOOD TIMES collector occurrence contract — 2026-10-07

Status: local implementation and targeted regression QA only. No production deployment is implied.

The Eventbrite collector and direct JSON-LD collector now share `supabase/functions/_shared/gt-source-occurrence.mjs`. The priority scout reuses its bounded event classifier, while retaining its existing approved-source policy and publication gates.

## Live baseline

Read-only fresh retrieval confirmed `gt-atlanta-eventbrite-refresh` version 5 and `gt-atlanta-source-refresh` version 6. Both live functions obtain the server credential from `SUPABASE_SECRET_KEYS.default`, falling back to `SUPABASE_SERVICE_ROLE_KEY`. That behavior is preserved. Both collectors now pin `npm:@supabase/supabase-js@2.110.2`, matching the live priority scout, and remove the unused JSR declaration import. This preserves the existing internal-key checks, source-selection scope, body/fetch bounds and timeouts.

The live priority scout was absent from the repository. Its three supplied live files were brought into version control's working tree. `html-adapters.mjs` remains byte-identical to its live source snapshot. `index.ts` only adds safe `unknown` error narrowing required by strict Deno type checking; the private authentication, allowlists, robots handling, worker policies, schedules and ingestion RPC stay intact. `scout-core.mjs` reuses the bounded classifier and retains exact structured cancellation, free-status and offer-availability and price evidence for the database observation snapshot.

## Collector → database contract

- `gt_sourced_events.id` remains the source-record identity. Existing matching records are updated by UUID; no source records are deleted or replaced.
- `dedup_hash` is SHA-256 of `raw_data.occurrence_identity.key`.
- `raw_data.occurrence_identity` contains `version: 2`, `key`, `provider`, `provider_event_id`, nullable `provider_occurrence_id`, `date`, nullable `time`, `time_precision`, and `venue_key`.
- A native `provider_occurrence_id` is populated only from explicit occurrence/performance/session ID fields. The provider namespace is included. An ordinary Eventbrite ticket ID, event URL or JSON-LD `@id` is not assumed to identify one performance.
- Without a native performance ID, the versioned key includes city, provider/event URL or ID (or normalized title), local date, known time or the `date_only` marker, and normalized venue name plus full address. Different times, unknown time, midnight and distinct venues remain different occurrences.
- A conflicting batch that assigns one explicit native session ID to different dates/times/venues is held and counted. It is not collapsed to the last row.
- The collectors require no new database column. A database mapping may mirror a genuine native ID from `raw_data.occurrence_identity.provider_occurrence_id` to the new nullable column; it must not put the fallback occurrence key into that native-ID column.
- The source-to-show relation must use the source UUID. Existing canonical show UUIDs and saved-item IDs remain database responsibilities and must be preserved during updates and merges.

Exact hash matches are checked against the observed identity. Legacy candidate reads are city-scoped and bounded, and final selection requires full occurrence evidence. The old date-plus-`ILIKE`-title/`LIMIT 1` update path is removed. Multiple matching UUIDs or a candidate-read overflow cause a held observation and failed-source receipt, not arbitrary selection or a new duplicate.

Legacy matching reads `raw_data.jsonld` when present. This preserves source UUIDs for real old direct-collector records whose stated local time was converted to UTC before storage. The parser retains explicitly stated local clocks, converts explicit UTC instants to Atlanta, validates calendar dates and retains unknown times as null.

## Editorial state and observation clocks

New Eventbrite/direct observations enter with `is_verified=false`, `is_published=false`, and `published_to_gt=false`. An official source label or two source names no longer approve a new record.

Refresh payloads omit existing verification/publication flags, promotion state, quarantine fields, canonical venue IDs and taxonomy keys. Existing raw metadata is retained, including promotion evidence and reviewed taxonomy annotations. Explicit raw `locked_fields`, `manual_fields`, `editorial_fields`, `manual_overrides` and `editorial_overrides` protect corresponding source fields; whole-record `manual_lock`/`editorial_lock` protect source facts while retaining the new observation.

`raw_data.source_observation.observed_at` records when structured evidence was fetched. Its `editorial_verification` value is `not_performed_by_collector`. This clock is not a fact-verification timestamp or publication receipt. The new database trigger should requeue mapped records only when substantive source facts change; heartbeat/raw-observation changes alone should not reset `published_to_gt`.

The latest snapshot includes explicit numeric offer `price_min`, `price_max`, and `currency` when the current Event contains consistent finite nonnegative prices in one currency. Multiple currencies, malformed bounds, missing prices and contradictory offer values stay unknown. Missing facts are explicit nulls for withdrawal handling. `price_basis` remains null, and a zero price never infers free admission. Conflicting availability among offers also remains unknown.

The existing priority-scout approval/publication policy is preserved separately; the pending-intake change above applies to the Eventbrite and direct JSON-LD collectors.

## Classification and operations

Classification uses bounded event-title words and structured event types, not source-directory labels. Transportation does not match `sport`, a tour discovery feed does not make every event a concert, and strong WNBA/playoff/team signals take precedence over a generic concert venue type. Valid business/community inventory remains present as `special_event` when evidence does not support a narrower type.

Zero-result direct-source runs now report `empty`. Identity conflicts are held and counted as failures; source failures return a partial/error result instead of an unconditional success. Found/discovered counts remain distinct from inserted and updated rows.

## Validation and rollout dependencies

Run `node --test scripts/collector-occurrence-contract.test.mjs`. It executes the actual production parser functions and tests category collisions, sports/team prefixes, two performances, duplicate refreshes, unknown times, venue/provider/city conflicts, ambiguous UUIDs, bounded-read failures, manual/editorial preservation, pending intake, native-session conflicts, UTC boundaries and sampled live legacy JSON-LD shapes.

Deploy each changed edge function with its shared-module import included. Apply/review the database mapping and substantive-change trigger before activating the repaired promotion path. Full repository checks, edge-runtime type/bundle validation, exact-candidate review and post-deployment source-to-show/API readback remain separate release gates.

The latest collector observation has `raw_data.source_observation.version=2` and a `facts` object; its explicit null values mean the latest evidence is unknown and must not fall back to stale raw status. The database fact extractor also supports both legacy raw shapes: Eventbrite/direct facts are under `raw_data.jsonld`; priority scout facts such as `eventStatus` are top-level raw fields. Eventbrite cancellation/postponement observations within the current date horizon are retained and matched to existing source UUIDs. New cancelled/postponed observations remain pending/unpublished. The substantive-change trigger and mapped-show promoter must apply owned status changes without resurrecting manual cancellations from absent/unknown status evidence.
