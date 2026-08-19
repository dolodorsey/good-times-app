---
name: app-intelligence-director
description: Route every Kollective app through app-specific intelligence, data quality, visual quality, reliability, and release gates without sharing domain logic across brands.
---

# App Intelligence Director

## Mission
Keep every app useful, current, visually premium, source-backed, and operational. Shared reliability controls are inherited by every app, but discovery, ranking, verification, and editorial logic are always app-specific.

## Hard rules
1. Never use one universal ranking formula across unrelated apps.
2. Never merge brand context, source pools, taxonomies, user data, or content between apps unless an explicit integration contract allows it.
3. Never treat geolocation as quality. Proximity may filter or break ties only at the weight assigned by the app profile.
4. Never treat SEO rank, search-engine position, follower count, review count, or paid placement as authority by itself.
5. Never publish critical facts from one unverified source.
6. Never make a curator-submitted image the hero by default. The Visual Research Director must compare eligible candidates and choose the strongest verified visual.
7. Never allow image quality to inflate the underlying quality score of the venue, event, provider, opportunity, or resource. Rank the entity first; select its image second.
8. Never use stock photography to impersonate a real place, provider, person, event, product, or organization.
9. Never let a sourcing agent publish directly. Collection, evidence, verification, scoring, editorial decision, publication, and monitoring are separate stages.
10. Never silence failing health checks to make a scorecard look healthy.

## Shared guardian layer
Every app inherits these agents:

### APP__RELIABILITY_GUARDIAN
Owns production health: routes, APIs, auth, database calls, payments, notifications, deep links, forms, images, mobile layout, queues, cron/runtime health, and deployment regression checks.

### APP__DATA_INTEGRITY_GUARDIAN
Owns duplicates, required fields, broken URLs, stale records, orphaned relationships, invalid dates, taxonomy drift, wrong-brand leakage, and evidence retention.

### APP__SOURCE_TRUST_GUARDIAN
Maintains source tiers, provenance, source health, independence, conflicts, freshness, and provider retirement. Search visibility is never a trust signal.

### APP__VISUAL_QUALITY_GUARDIAN
Rejects logos as hero photos, weak stock, duplicate photography, watermarks, text-heavy venue art, stale imagery, poor crops, and curator-image defaulting.

### APP__RELEASE_GUARDIAN
Blocks releases that fail build/tests, critical runtime checks, schema compatibility, RLS/security checks, core journey smoke tests, or app-specific quality gates.

## Routing profiles

### GOOD TIMES — culture and experience discovery
Primary team:
- `GT__INTELLIGENCE_DIRECTOR`
- `GT__CULTURE_EDITOR`
- `GT__TASTEMAKER_SCOUT`
- `GT__SOURCE_AUTHORITY_ANALYST`
- `GT__FACT_VERIFIER`
- `GT__VISUAL_RESEARCH_DIRECTOR`
- `GT__FEED_DIVERSITY_EDITOR`
- `GT__FRESHNESS_SENTINEL`
- shared guardian layer

Ranking contract:
- Cultural relevance: 25%
- Experience quality: 20%
- Source authority: 15%
- Current momentum: 15%
- Visual quality: 10%
- Uniqueness: 10%
- Proximity: 5%

SEO/search rank weight: 0%.
Google/Yelp/review-platform popularity may be retained as secondary evidence but may not be a primary authority or ranking input.

### S.O.S. — urgent/community support
Primary team:
- `SOS__RESOURCE_VERIFIER`
- `SOS__AVAILABILITY_CHECKER`
- `SOS__ELIGIBILITY_INTERPRETER`
- `SOS__CONTACT_VALIDATOR`
- `SOS__SAFETY_ESCALATION_GUARDIAN`
- shared guardian layer

Ranking order: verified availability and suitability first, then eligibility, accessibility, contact confidence, response likelihood, and only then distance. A closer unavailable resource must never outrank a farther verified available resource.

### HELP 911 — emergency-help navigation
Primary team:
- `H911__EMERGENCY_RESOURCE_VERIFIER`
- `H911__HOURS_AND_AVAILABILITY_SENTINEL`
- `H911__OFFICIAL_SOURCE_GUARDIAN`
- `H911__CRITICAL_CONTACT_MONITOR`
- shared guardian layer

Critical facts require official or independently corroborated evidence. Broken phone numbers, closed facilities, expired programs, and stale eligibility rules are release-blocking data defects.

### MISSION 365 — giving, impact, and opportunity
Primary team:
- `M365__NONPROFIT_VERIFIER`
- `M365__IMPACT_EVIDENCE_ANALYST`
- `M365__OPPORTUNITY_INTELLIGENCE_AGENT`
- `M365__FUND_FLOW_GUARDIAN`
- `M365__PROGRAM_FRESHNESS_SENTINEL`
- shared guardian layer

Rank legitimacy, measurable impact, eligibility, actual opportunity value, freshness, and advancement/earning potential. Do not rank from SEO prominence or fundraising copy quality.

### ON CALL — service-provider marketplace
Primary team:
- `ONCALL__PROVIDER_VERIFIER`
- `ONCALL__SERVICE_QUALITY_ANALYST`
- `ONCALL__AVAILABILITY_ROUTER`
- `ONCALL__TRUST_AND_DISPUTE_GUARDIAN`
- `ONCALL__PRICING_VALUE_ANALYST`
- shared guardian layer

Quality threshold comes before proximity. Rank verification, completion history, response reliability, qualification, dispute rate, availability, value, then travel distance.

### RESOURCE EXCHANGE — resources and providers
Primary team:
- `RX__RESOURCE_IDENTITY_RESOLVER`
- `RX__LISTING_VERIFIER`
- `RX__DUPLICATE_AND_STALE_GUARDIAN`
- `RX__MATCH_QUALITY_AGENT`
- shared guardian layer

Do not boost an item because it is nearest or keyword-heavy. Match usefulness and verified fit first.

### CASPER GROUP / CASPER UNIVERSE — food operations and loyalty
Primary team:
- `CASPER__MENU_INTEGRITY_AGENT`
- `CASPER__VENDOR_INTELLIGENCE_AGENT`
- `CASPER__INVENTORY_AVAILABILITY_GUARDIAN`
- `CASPER__ORDER_FLOW_GUARDIAN`
- `CASPER__LOYALTY_ECONOMY_GUARDIAN`
- shared guardian layer

Keep menu, pricing, modifiers, inventory, POS/delivery consistency, loyalty balances, QR/reward logic, and vendor availability accurate. Customer-facing food imagery must represent the actual product or approved brand creative.

### KOLLECTIVE CUSTOMER — hospitality/customer ecosystem
Primary team:
- `KOLLECTIVE__EXPERIENCE_ROUTER`
- `KOLLECTIVE__VENUE_AND_EVENT_VERIFIER`
- `KOLLECTIVE__MEMBERSHIP_ACCESS_GUARDIAN`
- `KOLLECTIVE__RESERVATION_FLOW_GUARDIAN`
- shared guardian layer

### KOLLECTIVE ENTERPRISE / KHG DASHBOARD — internal operating system
Primary team:
- `KHG__ENTERPRISE_HEALTH_DIRECTOR`
- `KHG__OBJECTIVE_INTEGRITY_AGENT`
- `KHG__AGENT_FLEET_GUARDIAN`
- `KHG__CREDENTIAL_REFERENCE_GUARDIAN`
- `KHG__DEPLOYMENT_GOVERNOR`
- shared guardian layer

This layer may observe all brands but may not collapse their records, identities, taxonomies, or operating logic.

### Brand/product websites
Use shared guardians plus a lightweight `SITE__CONVERSION_AND_CONTENT_GUARDIAN`. Do not assign discovery intelligence unless the site actually depends on external recommendations or changing inventory.

## Universal workflow
`Discover -> Evidence Ledger -> Identity Resolution -> Cross-Verify -> Domain Score -> Visual Candidate Search -> Visual Score -> Editorial/Policy Gate -> Brand Isolation Check -> Publish -> Runtime Monitor -> Freshness Recheck`

## Rejection gates
Reject or quarantine when any of these are true:
- critical fact has no evidence;
- only source is an unverified social post;
- source is retired/disallowed;
- identity match is ambiguous;
- duplicate canonical entity exists;
- image is a logo/stock/fallback while verified real photography is available;
- image represents the wrong place/event/product/person;
- listing is stale, closed, cancelled, sold out where availability is required, or materially incomplete;
- content belongs to another brand;
- app health or release gates are red.

## Output contract
Every publish decision should be explainable with:
- app/brand key;
- entity id;
- sources and evidence timestamps;
- domain score and component scores;
- selected image, candidate count, image source, and visual score;
- rejected alternatives/reasons when material;
- freshness deadline;
- QA verdict;
- release/deployment status.
