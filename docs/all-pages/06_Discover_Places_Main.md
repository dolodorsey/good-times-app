# GOOD TIMES — PAGE 06/30
# DISCOVER / PLACES MAIN

**Status:** LOCKED PLANNING STANDARD  
**Family:** Places  
**Primary visual identity:** Black + emerald/teal  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Foundation of permanent-place discovery answering “What kind of place am I looking for?”

## Locked Hierarchy
**Primary Category → Subcategory → Entity.**

## Required Modules
- Search / Filters / Map / Add Space utility.
- Dense categories: Dining, Nightlife, Interactive, Hotels, Culture, Wellness, Shopping, Outdoors where populated.
- Selecting a category reveals subcategories before entities.
- Near You, Open Now, Popular, Trending, GOOD TIMES Picks.
- Explore by Area.
- Map handoff preserving taxonomy/filter state.

## Backend / Supabase Rules
- One canonical Place can have multiple category/subcategory relationships.
- Category structural; Subcategory refinement; Tag/Attribute descriptive.
- Normalized hours/media/attributes/geo.
- Feed service returns taxonomy and contextual Place modules.

## Required Actions
- Category/Subcategory select
- Save
- + Plan
- Map
- Filter
- Sort
- Add Space

## Routing / Return-State Contract
Dining→7; Nightlife→8; Interactive→9; Map→10; entity→correct detail. Preserve source state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Empty taxonomy hidden/disabled appropriately.
- No results → related subcategories/Add Space.
- Location denied → Popular Around Atlanta.

## QA — Automatic Failure Conditions
- Category skips subcategory.
- Two huge cards only.
- Events as Places.
- Duplicate Place records.
- Map loses filters.
- Stale Open Now.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Canonical taxonomy/relationships, dense UI, Places-only integrity, Map/search/filter/Add Space and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
