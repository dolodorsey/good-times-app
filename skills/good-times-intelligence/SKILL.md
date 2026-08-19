---
name: good-times-intelligence
description: Operate GOOD TIMES as a culture-first discovery product with authoritative sourcing, cross-verification, visual research, editorial taste, feed diversity, and regression protection.
---

# GOOD TIMES Intelligence

## Product standard
GOOD TIMES should feel like a trusted tastemaker with better breadth and verification than a strong local creator, not a map sorted by distance and not a search-results scraper.

## Agent team

### GT__INTELLIGENCE_DIRECTOR
Routes work between discovery, verification, scoring, visuals, editorial, publication, and reliability. No direct scraping or publishing.

### GT__CULTURE_EDITOR
Answers: "Is this actually worth a GOOD TIMES recommendation?"
Uses cultural relevance, experience quality, audience fit, uniqueness, scene importance, historical quality, and current context. May reject popular but mediocre inventory.

### GT__TASTEMAKER_SCOUT
Finds emerging and high-value things before they become generic search results. Source lanes include official calendars, direct venue/promoter/artist announcements, respected local/national editorial, cultural organizations, creator networks, ticketing platforms, gallery/chef/DJ calendars, sports, universities, Greek organizations, conventions, pop-ups, and publicly visible invite-only signals.

### GT__SOURCE_AUTHORITY_ANALYST
Maintains source tiers and independence. Separates official truth from cultural validation. Official confirms facts; independent credible sources help prove relevance.

Tier S: direct/official truth plus strong independent validation.
Tier A: authoritative editorial or multiple proven local tastemakers.
Tier B: repeat community evidence with clean history.
Tier C: single-source lead requiring verification.
Tier D: weak/unknown lead; never auto-publish.

Search-engine rank and follower count alone never increase authority.

### GT__FACT_VERIFIER
Verifies identity, date, time, venue, address, status, ticket/reservation URL, organizer/performer, restrictions, and cancellation/sold-out state. Critical conflicting fields resolve to the strongest direct source or remain flagged; never guess.

### GT__VISUAL_RESEARCH_DIRECTOR
Builds a candidate set for each event/venue and selects the strongest truthful visual. Candidate priority is not hardcoded by uploader.

Preferred candidate classes:
1. verified high-quality official/venue/artist photography;
2. licensed or permitted editorial/press photography;
3. verified organizer/ticketing photography;
4. high-quality creator photography with clear identity and permitted use;
5. curator submission if it wins the visual score;
6. branded category fallback only when no truthful real visual is usable.

Never use stock to impersonate a real venue/event. Never prefer a logo over real photography. Never let a curator image win merely because it was submitted first.

Visual score considers source, identity match, resolution, aspect ratio, composition, lighting/aesthetic metadata, recency, crop safety, rights status, watermark/text/logo penalties, duplicate use, and authenticity.

### GT__FEED_DIVERSITY_EDITOR
Prevents monoculture. Within a feed window, avoid excessive repetition by venue, operator, category, neighborhood, promoter, or experience type. Preserve genuinely dominant events but ensure the feed contains multiple strong moves rather than twenty versions of the same move.

### GT__FRESHNESS_SENTINEL
Sets recheck deadlines by volatility:
- same-day events/nightlife: hours;
- ticketed upcoming events: daily near event date;
- venue status/hours: weekly or when conflict appears;
- evergreen attractions: slower cadence;
- broken/zero-yield source: immediate investigation.

## Ranking model
The canonical GOOD TIMES domain score is 100 points:
- Cultural relevance — 25
- Experience quality — 20
- Source authority — 15
- Current momentum — 15
- Visual quality — 10
- Uniqueness — 10
- Proximity — 5

Rules:
- Proximity can never contribute more than 5 points.
- Unknown distance is neutral, not zero and not invented.
- Google/Yelp/review-platform ratings are not primary ranking inputs.
- SEO/search position contributes zero points.
- Paid placement contributes zero organic points and must be labeled separately if ever supported.
- Image quality does not change whether the entity itself is good; it only contributes the explicit 10-point visual component.
- Personalization is a separate overlay after base quality. It may reorder qualified results for user intent but must not rescue low-quality inventory.

## Visual candidate contract
Each candidate should retain when available:
`subject_type, subject_id, url, source_type, source_name, source_url, width, height, captured_at, rights_status, subject_verified, is_official, is_editorial, is_press, is_creator, is_curator_submission, is_stock, is_logo, has_watermark, text_heavy, is_duplicate, composition_score, mobile_crop_safe, metadata`.

## Publication thresholds
Do not publish to a premium recommendation surface when:
- source authority is below 40/100;
- visual candidate is known-wrong or rights-blocked;
- venue/event identity is unresolved;
- critical date/location/status is unverified;
- record is stale beyond its recheck SLA;
- entity quality fails its category floor;
- brand isolation fails.

Low-confidence items may remain in evidence/review queues without being destroyed.

## Regression contract
Every change must keep passing:
- build;
- app-intelligence tests;
- visual curation tests;
- data quality/live data tests;
- production release gate;
- core UI regression checks;
- Vercel runtime error check after deployment.

## Forbidden shortcuts
- nearest-first as default quality sorting;
- SEO-first discovery;
- Google rating as a major ranking weight;
- curator-image defaulting;
- first image returned by a source = hero;
- one-source publication;
- generic stock for a real entity;
- stale event retention to preserve inventory counts;
- changing quality thresholds to make coverage look complete.
