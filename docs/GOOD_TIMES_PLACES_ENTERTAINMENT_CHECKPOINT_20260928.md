# GOOD TIMES — Places / Entertainment checkpoint — 2026-09-28

## Owner-approved product contract

This checkpoint preserves the approved compact GOOD TIMES direction and records the exact handoff before continued implementation.

### Permanent primary navigation
- Home
- Places
- + Plan
- Entertainment
- Profile

The former Saved bottom-navigation destination is retired as a primary tab. Its functionality and account persistence move into Profile under **My GOOD TIMES**.

### My GOOD TIMES
Profile owns:
- My Plans
- Saved Places
- Saved Entertainment
- Recently Viewed
- Following
- Preferences
- Tickets / reservation state only when backed by real provider state
- Notifications
- History
- Account / settings

Saved behavior is moved, not deleted. Existing ownership, save/unsave, plan reopen, return-state, and account isolation behavior remain protected.

## Places vs Entertainment

### Places
Persistent entities / destinations:
- Restaurants
- Bars
- Lounges
- Coffee
- Desserts
- Hotels
- Attractions
- Wellness
- Shopping
- Family places

Restaurants require deep faceting for service level, cuisine, occasion, meal, vibe, interests / ownership, features, dietary needs, pricing, neighborhood, and ranking.

### Entertainment
Time-based happenings and activity discovery:
- Tonight
- This Weekend
- Upcoming
- Nightlife
- Bars & Lounges programming
- Concerts
- Live Music
- Festivals / Events
- Sports
- Comedy / Performing Arts
- Interactive
- Family
- Attractions / Experiences

A place is stored once. Entertainment events reference canonical entities / venues. A venue can surface in multiple discovery contexts without duplicated canonical place records.

## UI contract — do not downgrade
- Preserve premium black / gold GOOD TIMES identity.
- Preserve compact two-up mobile card standard where content supports it.
- No pointless giant hero blocks, giant whitespace, or one-card-per-screen regressions.
- Keep rich detail on detail pages instead of bloating feed cards.
- Grid / List / Map remain target browse modes.
- Plan visual quality is protected; improvements should primarily strengthen intelligence underneath it.
- Desktop must become true desktop information architecture, not centered mobile.
- iPad must be intentionally designed, not simply scaled mobile.
- Featured cards are rare and purposeful.
- Empty/error states must stay useful and truthful.
- Real screenshots at phone, tablet, iPad, and desktop widths are required before production acceptance.

## Home contract
Home is a live city dashboard, not another Places or Entertainment index. It combines both systems using time, day, inventory, preferences, trend signals and planning context.

Target modules:
- Tonight
- Happening Now
- This Weekend
- Sports
- Trending
- Restaurants / Places for you
- Near Me when authorized
- Continue Plan

## Search contract
Global search sits above Places / Entertainment and routes intent to:
- Places
- Entertainment
- Both

Search should interpret category, entity, neighborhood, time, date, price, vibe, occasion, audience, activity, event type, open status and relevant inferred/synonym features.

## Data contract
Keep current canonical storage and taxonomy as compatibility layers. Do not destructively delete the 185-subcategory intelligence.

Evolve with additive entity / entertainment facet models:
- entity types
- entity facets
- restaurant profiles / facets
- entertainment facets
- event facet memberships
- entity-event relationships
- nearby / neighborhood relationships
- separate entity and entertainment ranking models

## Current backend checkpoint
- 185 / 185 active subcategories have targeted source coverage.
- Entertainment sourcing has dedicated lanes across all 38 Entertainment subcategories.
- Entertainment Curation V2 uses multi-facet membership rather than destructive primary-category replacement.
- Entertainment venue enrichment and media QA queues exist.
- Rights-cleared / internally approved media remains preferred; unknown-rights official images remain candidates, not silently approved.
- Existing paused recurring automations remain paused until separately approved.

## Immediate implementation order
1. Replace bottom Saved tab with Entertainment.
2. Evolve Discover into Places without discarding current compact explorer work.
3. Move Saved/Plans library UX into Profile → My GOOD TIMES.
4. Add dedicated Entertainment landing and time-first browsing.
5. Preserve + Plan and connect it to both inventories.
6. Upgrade global search routing.
7. Recompose Home from both systems.
8. Finish restaurant intelligence and 185-taxonomy mapping.
9. Build desktop / iPad shells.
10. Run full screenshot and functional certification before production.

This file is the continuity checkpoint. Future changes should build on it rather than restart or simplify the approved product.
