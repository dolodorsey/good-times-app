# GOOD TIMES — PAGE 15/30
# ENTERTAINMENT / TONIGHT

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black + hot violet/magenta/red-pink  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Authoritative live inventory of scheduled Entertainment happening tonight in Atlanta.

## Locked Hierarchy
**Current time window → Category → Subcategory → Event.**

## Required Modules
- NOW / Starting Soon / evening bands / After 11 / Late Night.
- Category rail.
- Starting Soon and Live Now.
- Tonight’s Big Moves.
- Concerts Tonight, Live Music, Parties, Sports, Comedy, Culture, Food Events, Pop-Ups, Free.
- Neighborhood Tonight, Late Night, Just Added Tonight, Trending Tonight.
- Active Tonight Plan strip.

## Backend / Supabase Rules
- Atlanta-local Tonight window extends past midnight.
- Correct overlap query for Events spanning date boundary.
- Canonical status/access state.
- Series resolves to occurrence.

## Required Actions
- Tickets/RSVP/Guest List
- Save
- + Plan
- Venue link
- Continue Plan
- Add Event

## Routing / Return-State Contract
Deep categories→17/18/19 with tonight context; Event→20; Venue→Place Detail.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Nothing starting soon → later/open Places/planning.
- Cancelled/postponed excluded.
- Provider failure isolated.

## QA — Automatic Failure Conditions
- Naive midnight cutoff.
- Fake live/urgency.
- Expired Events.
- No subcategory layer.
- Late-night missing after midnight.
- Place/Event confusion.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Tonight window/time states, all categories, truthful access/live state, Plan conflict/active context and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
