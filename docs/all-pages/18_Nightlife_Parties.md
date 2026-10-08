# GOOD TIMES — PAGE 18/30
# NIGHTLIFE / PARTIES

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black + hot magenta/fuchsia/violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical scheduled nightlife Event engine answering what party is happening, when, with what music/vibe/access.

## Locked Hierarchy
**Time → Party Type → Music/Vibe → Event.**

## Required Modules
- Tonight / Friday / Saturday / Sunday / Upcoming.
- Party types: Club Night, Day Party, Rooftop, Brunch Party, DJ Set, After Hours, Special Event, Pool Party, College.
- Music rail and Vibe filters.
- Tonight’s Moves / Starting Soon.
- Day Parties, Club Nights, Rooftop, Brunch Parties, Afrobeats, R&B, Hip-Hop, After Hours, DJ Events, Special, College/Homecoming.
- Guest List Open, Just Announced, Trending, GOOD TIMES Picks, Following, Near You, Neighborhoods.

## Backend / Supabase Rules
- Party Event separate from nightlife Place.
- Promoter/Series/Occurrence relationships.
- Verified guest-list/ticket/RSVP/cover/age/dress states.
- arrival_window timing semantics distinct from fixed_start.

## Required Actions
- Tickets/RSVP/Guest List
- Save
- + Plan
- Venue link
- Follow promoter/venue/series
- Add Party

## Routing / Return-State Contract
Event→20; Venue→12; preserve time/party/music/vibe state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Guest list closed.
- Sold out.
- Venue changed.
- Cancelled/postponed.
- No inventory → related/upcoming/Places.

## QA — Automatic Failure Conditions
- Instagram flyer grid.
- Club Place listed as Event.
- Fake guest-list terms.
- Recurring duplicates.
- After Hours irrelevant.
- No Party Type/Music hierarchy.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Party taxonomy, promoter/series, truthful access, nightlife-aware Plan timing, dedupe/freshness and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
