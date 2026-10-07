# GOOD TIMES — 30-PAGE MASTER IMPLEMENTATION CONTEXT
Version: 2026-10-07
Status: LOCKED PLANNING STANDARD
Market: Atlanta launch

## Core Product
GOOD TIMES is a city decision + planning operating system. It is not a restaurant list, nightclub directory, ticketing clone, social network, or generic chatbot.

## Locked Primary Navigation
Home / Discover / Entertainment / Plan / Profile

- Saved lives under Profile.
- Map is contextual, not a bottom-nav tab.
- City Radar is contextual, not a bottom-nav tab.
- Add Space is utility, not a bottom-nav tab.

## Canonical Object Rules
- Place = permanent entity/location.
- Event = scheduled occurrence.
- Plan = user itinerary referencing canonical Places/Events/Experience Offerings/Custom Stops.
- Save = remember a specific object.
- Follow = receive future updates about an Artist/Team/Venue/Promoter/Series.
- Event may reference a Place through venue_id, but they never become the same object.

## Discovery Hierarchy
CATEGORY → SUBCATEGORY → ENTITY/EVENT

Do not skip meaningful subcategory layers. Tags such as Date Night, High Energy, Rooftop, Family Friendly, Dressy, Good for Groups, etc. are descriptive attributes unless deliberately modeled as structural taxonomy.

## Global UI Standard
- Native-app-first, not a website squeezed into a phone.
- Header/chrome should generally stay within ~10–12% of usable first viewport.
- No giant titles or giant decorative heroes on discovery screens.
- Detail heroes are controlled and should not hide primary actions.
- Dense, useful first viewport.
- Primary categories generally 3–4 across or 4–5 visible horizontally.
- Subcategories/chips generally 4–7 visible.
- Normal rails generally 2.5–4 cards visible.
- Use 2-column grids where appropriate.
- No dead space.
- No one-card-per-screen syndrome.
- Real entity/event imagery where possible.
- No fake ratings, live states, scarcity, booking availability, attendee counts, travel time, or pricing.
- Every meaningful object must have a real next action.

## Screen-Family Accent Direction
Home/For You gold; Home/Tonight coral-red; Upcoming blue; Sports orange-red; Weekend amber; Places emerald/teal; Restaurants emerald/cream; Nightlife Places magenta/plum; Interactive cyan; Entertainment ultraviolet; Music blue-violet; Parties magenta; Sports Entertainment orange-red; Search graphite/cool-blue; Plan black/gold; Build gold; Shake violet; Ask cyan-blue; Radar midnight blue-violet; Profile/Library graphite-gold-violet.

## Canonical Backend Rules
Reuse canonical masters and normalized relationships. Do not create page-specific masters.
Core domains should resolve to existing equivalents of:
places, event/events+occurrences+series, performers, teams, leagues, promoters, categories, subcategories, normalized attributes, hours, media, user_profiles, user_preferences, user_saves, user_follows, plans, plan_items, interactions, search index, Radar/change signals.

Derivative layers (search docs, Radar items, snapshots, analytics, plan-generation requests) always point back to canonical object IDs.

## Truth/Freshness
- Open Now from one canonical hours service.
- Event state from one canonical event-status service.
- Tickets/RSVP/Guest List from verified access state.
- Current canonical truth overrides cached/saved/search-index snapshots.
- Official/primary sources outrank weaker aggregators.
- Closed/rebranded/moved Places and cancelled/postponed/changed Events must propagate into Saved, Plan, Radar and Search.

## Return-State Rule
Back navigation must preserve relevant query, taxonomy, filters, neighborhood, date/time mode, map/list state, map bounds, scroll, selected item, and Plan/anchor context.

## Add Space / Add Event / Corrections
Submissions are moderated. Existing entities should use Suggest Update rather than duplicate creation. Duplicate checks should use normalized identity/address/coordinates/web/social/phone and event venue/date/time/ticket/promoter context.

## One Plan Engine
Build, Shake, Ask, manual +Plan, anchored planning and Reuse all use the SAME plans/plan_items model.
Timing semantics:
- fixed_start
- arrival_window
- open_window
- multi_session

Never alter canonical Event time just to make an itinerary work.

## Plan Validation
Validate active status, Place hours, Event status, timing conflicts, geography, booking/ticket action, and known restrictions.
Severity: Blocking / Important / FYI.

## Search
Universal Search preserves typed objects (Place/Event/Artist/Team/Category/Area), uses exact/fuzzy/alias + structured date/time/location/price/category parsing, and consults canonical status before display. Search index is retrieval aid, never truth.

## City Radar
Radar = personalized change/relevance intelligence, not another Event feed. Every personalized alert needs a deterministic reason. Plan-impact changes outrank discovery.

## QA Gate
Each page must score >=95/100 before proceeding.
Automatic failures include oversized headers, dead space, giant ordinary cards, no actionability, Place/Event confusion, fake/stale data, Saved in global nav, lost return state, duplicate page-specific databases, or a visually polished but read-only implementation.

## Execution — One Page at a Time
1. Audit current implementation.
2. Map modules/actions to current Supabase canonical data.
3. Create only real missing schema/data structures.
4. Reuse shared components.
5. Wire routing + return-state.
6. Wire real actions.
7. Implement loading/empty/error/partial states.
8. Mobile QA.
9. Capture first-viewport + full-page screenshots.
10. Score >=95.
11. Fix failures.
12. Approve.
13. Only then start the next page.

## Locked Page Order
01 Home / For You
02 Home / Tonight
03 Home / Upcoming
04 Home / Sports
05 Home / This Weekend
06 Discover / Places Main
07 Discover / Restaurants
08 Discover / Nightlife
09 Discover / Interactive
10 Discover / Places Map
11 Restaurant Detail
12 Nightlife Detail
13 Interactive Detail
14 Entertainment Main
15 Entertainment / Tonight
16 Entertainment / This Weekend
17 Concerts / Live Music
18 Nightlife / Parties
19 Sports Entertainment
20 Event Detail
21 Universal Search
22 Search Results
23 Plan Landing
24 Build It
25 Shake It
26 Ask GOOD TIMES
27 Finished Itinerary / Live Plan
28 City Radar
29 Profile / My GOOD TIMES
30 My GOOD TIMES Library
