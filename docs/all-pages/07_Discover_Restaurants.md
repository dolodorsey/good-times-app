# GOOD TIMES — PAGE 07/30
# DISCOVER / RESTAURANTS

**Status:** LOCKED PLANNING STANDARD  
**Family:** Places  
**Primary visual identity:** Black + emerald + warm cream/gold  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Restaurant discovery engine answering “Where should I eat?” through layered intent rather than a flat list.

## Locked Hierarchy
**Restaurant Type → Cuisine → Occasion → Restaurant.**

## Required Modules
- Search / Filters / Map / Add Space.
- Types: Fine Dining, Casual, Brunch, Steakhouse, Seafood, Late Night, Rooftop, Quick Bite, Food Hall, Café.
- Cuisine rail.
- Occasion rail: Date Night, Birthday, Client Dinner, Group, Family, Dress Up, Low-Key, etc.
- Near You, Open Now, Date Night, Brunch, Steakhouses, Seafood, Late Night Food, New & Noteworthy, Popular, GOOD TIMES Picks, Neighborhoods.

## Backend / Supabase Rules
- Restaurant remains canonical Place.
- Normalized cuisine and attribute relationships.
- Structured hours/kitchen close where known.
- Reservation resolver and verified menu URL.

## Required Actions
- Save
- + Plan
- Reserve/Book/Call
- Menu
- Map
- Filter
- Sort
- Add Space

## Routing / Return-State Contract
Restaurant→11; Map→10 Restaurant mode; preserve subcategory/cuisine/occasion/filter state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No filter matches → smart relaxations.
- Unknown availability → no fake times.
- Closed Place handled canonically.

## QA — Automatic Failure Conditions
- Flat restaurant dump.
- Cuisine free-text chaos.
- Brunch party as restaurant.
- Fake reservation times.
- Generic imagery.
- Stale Open Now.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Layered restaurant refinement, normalized cuisine/occasion, booking/menu truth, Map/Plan and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
