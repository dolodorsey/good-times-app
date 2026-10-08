# GOOD TIMES — PAGE 11/30
# RESTAURANT DETAIL

**Status:** LOCKED PLANNING STANDARD  
**Family:** Place Detail  
**Primary visual identity:** Black/charcoal + emerald + warm gold/cream  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical restaurant Place-detail and shared Place-detail foundation. It answers “Is this the place, and what do I do next?”

## Locked Hierarchy
**Hero/identity → primary actions → quick facts/taxonomy → menu/booking/hours/gallery → linked Events → Build Around → related subcategories → similar restaurants.**

## Required Modules
- Controlled real restaurant hero.
- Name, cuisine/subcategory, price, verified Open state.
- Above-fold Reserve/Book/Call, + Plan, Directions, Save.
- Quick facts and category hierarchy.
- Great For/occasion rail.
- Short About.
- Menu + booking resolver.
- Address/hours/special hours/kitchen close.
- Gallery / What to Expect.
- Happening Here linked Events only.
- Build Around This.
- Before/After category-first suggestions.
- Related subcategories before Similar Restaurants.
- Suggest Update / Report Closed.

## Backend / Supabase Rules
- Canonical Place + restaurant extension, cuisine relationships, attributes, hours/media, linked Events.
- One canonical open-state service across all surfaces.
- Current canonical truth overrides stale detail/saved snapshots.

## Required Actions
- Reserve/Book/Call
- Menu
- Directions
- Save
- + Plan
- Share
- Open linked Event
- Build Around
- Suggest Update

## Routing / Return-State Contract
Back returns exact Restaurant discovery state; Event→20; taxonomy→7 filtered.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Closed/temporarily closed.
- Missing booking/menu.
- Linked Event service failure.
- Image fallback.

## QA — Automatic Failure Conditions
- Hero hides actions.
- Related entities before taxonomy.
- Fake ratings/reservations.
- Open state inconsistent.
- Article-like detail.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Reusable Place-detail shell, truthful restaurant actions/status, Event bridge, Plan integration, corrections and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
