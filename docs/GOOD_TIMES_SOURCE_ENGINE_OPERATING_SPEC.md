# GOOD TIMES Source Engine Operating Specification

## Objective

GOOD TIMES must discover culture at least as quickly as a strong local Instagram or TikTok creator while preserving source provenance, reviewability, database security, and production stability.

The source engine is an intelligence system, not an uncontrolled publishing bot. Collection, evidence, scoring, editorial review, and publication are separate stages.

## Non-negotiable safety rules

1. Never replace, truncate, or bulk-rewrite the live venue or event catalog during sourcing.
2. Never publish a new venue or event from one unverified social post.
3. Never let anonymous or ordinary authenticated browser roles mutate internal sourcing tables.
4. Never put a Supabase service-role key, database password, social password, or internal ingestion key in browser code, Git history, logs, or reports.
5. Every ingestion path must be bounded, allowlisted, deduplicated, idempotent, and rate-limited by the collector.
6. Every social signal must retain its platform, source handle, source URL, observed time, engagement snapshot, and matching method.
7. Exact identifiers are preferred. Fuzzy venue-name matching may create a review candidate but may not update or publish a live record automatically.
8. Venue-owned posts are first-party promotion, not independent influencer proof. They may be retained separately but do not count toward external social authority.
9. Existing live ranking behavior must not change until the evidence-only social score has been validated against real examples and approved.
10. Every persistent schema or permission change requires a migration, rollback procedure, advisor run, and post-change verification.

## Pipeline stages

### Stage 1 — Collection

Approved collectors may gather public signals from:

- Instagram hashtags, locations, profiles, and public posts
- TikTok creator and place signals through an approved connected provider
- Official venue calendars
- Eventbrite and other ticket platforms
- Local media, blogs, newsletters, tourism sites, and official event calendars
- Direct GOOD TIMES submissions and staff research

Collectors write only through a server-side ingestion endpoint protected by an internal credential. They do not write directly with an anonymous browser key.

### Stage 2 — Evidence ledger

Raw social evidence is stored separately from live catalog records. The evidence layer records:

- Platform and post identifier
- Creator/source handle
- Content URL
- Matched venue, when an exact match exists
- Match method and confidence
- Likes, comments, views, and observed timestamp
- Caption excerpt and source categories

Evidence insertion must be idempotent. The same venue/post pair may exist only once.

### Stage 3 — Conservative matching

Automatic venue matching is allowed only when:

- A post explicitly tags the venue's known Instagram handle; and
- The venue handle resolves to one canonical active Atlanta venue; and
- The posting account is not the venue itself.

Duplicate catalog rows sharing one social handle are canonicalized deterministically using verification, quality, culture score, and record stability. Duplicate catalog cleanup is a separate reviewed task.

Unmatched handles are exposed in a private review view. They are not auto-created as venues.

### Stage 4 — Source discovery

A previously untracked creator may enter the source-review queue when at least one condition is met:

- Two or more independent matched venue posts; or
- One post with at least 50 combined likes/comments; or
- One post with at least 5,000 observed views.

Discovery does not equal approval. Discovered sources remain pending until reviewed.

### Stage 5 — Evidence-only social score

The initial score is private and cannot alter the live feed automatically.

- Source breadth: 0–35 points
- Tracked-source authority: 0–30 points
- Observed engagement: 0–20 points
- Freshness: 0–15 points

The score is bounded from 0 to 100. It is calculated in a view so the formula remains inspectable and reversible.

### Stage 6 — Editorial promotion

A social candidate may become a live GOOD TIMES venue only after:

- Identity and location verification
- Duplicate review
- Category assignment
- Active/open status verification
- Minimum source evidence
- Image and rights review
- Editorial approval

No social processor may set a venue to active, verified, featured, or published on its own.

## Source quality tiers

- Tier S: official venue/provider data plus high-velocity creator validation
- Tier A: multiple reliable local creators or authoritative local media
- Tier B: community discovery with repeat independent evidence
- Tier C: single-source lead requiring verification

Source quality and content popularity are different dimensions. A viral post can be wrong; an official source can be culturally irrelevant. GOOD TIMES uses both.

## Formula safeguards

Any future change that uses social evidence in the live ranking must include:

- Written formula and units
- Before/after examples
- Null, zero, duplicate, stale-data, and outlier tests
- Caps preventing one creator or one viral post from dominating
- Separate treatment of first-party venue posts
- A rollback switch
- Preview and production monitoring

## Operational health standards

The daily source report must show:

- Sources checked, succeeded, failed, and returning zero results
- New evidence records and duplicates rejected
- Exact venue matches
- Unmatched handles requiring review
- New creator candidates
- Data freshness by platform
- Collector errors, rate limits, and credential failures
- Production records published through a reviewed path

A source that repeatedly returns zero structured results must be replaced with a provider-specific adapter or disabled. A successful HTTP response with zero usable entries is not considered a healthy source.

## Rollback standard

Rollback must be possible without deleting collected evidence. Disable schedules and function execution first, then revert grants/views/functions. Evidence rows remain available for audit unless they contain prohibited or sensitive data.