# GOOD TIMES — PAGE 08/30
# DISCOVER / NIGHTLIFE

**Status:** LOCKED PLANNING STANDARD  
**Family:** Places  
**Primary visual identity:** Black + magenta/plum/violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Permanent nightlife venue discovery answering “What nightlife place fits the kind of night I want?”

## Locked Hierarchy
**Nightlife Type → Vibe → Music → Occasion → Venue.**

## Required Modules
- Types: Lounges, Nightclubs, Rooftops, Cocktail Bars, Hookah, Hotel Bars, Sports Bars, Day Clubs, Late Night, Live Music Venues.
- Vibe rail.
- Music rail.
- Occasion rail.
- Open Tonight, Near You, Rooftops, Lounges, Late Night, Popular, Trending, GOOD TIMES Picks, New & Noteworthy.
- Upcoming Event indicator and bridge to Parties.

## Backend / Supabase Rules
- Canonical Place + nightlife profile/attributes/music relationships.
- Specific programming stays Event.
- Hours across midnight handled correctly.
- Higher-change nightlife facts verified frequently.

## Required Actions
- Save
- + Plan
- Table/Reserve/Call when real
- Map
- Filter
- Event bridge
- Add Space
- Suggest Update

## Routing / Return-State Contract
Venue→12; Event→20; Map→10; Parties→18. Preserve type/vibe/music/area.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Event tonight still valid Place.
- Rebrand/closure states.
- Location denied fallback.

## QA — Automatic Failure Conditions
- Party merged into venue.
- Fake table/guest list.
- Venue duplicated per Event.
- No music/vibe refinement.
- Flyer-like UI.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Nightlife taxonomy/music/vibe, Event bridge, truthful table/open state, Plan/Map and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
