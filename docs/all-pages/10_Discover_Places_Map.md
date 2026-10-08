# GOOD TIMES — PAGE 10/30
# DISCOVER / PLACES MAP

**Status:** LOCKED PLANNING STANDARD  
**Family:** Places  
**Primary visual identity:** Inherits source-family accent  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Geographic visualization of existing Places discovery state, never a separate discovery database.

## Locked Hierarchy
**Preserved filters/context → map bounds → pins/clusters → selected card → detail/Plan.**

## Required Modules
- Compact context header.
- Map/List toggle.
- Contextual filter chips.
- Search This Area.
- Pin clustering.
- Selected pin/card two-way sync.
- Result carousel.
- Current location optional.
- My Plan mode with numbered stops.
- Add Space/drop-pin utility.

## Backend / Supabase Rules
- Bounds-based geo queries; PostGIS/spatial index where available.
- One canonical Place = one pin.
- Lean pin payload, lazy detail/media.
- Same Open/status services as list.

## Required Actions
- Search This Area
- Filter
- Map/List
- Pin select
- Save
- + Plan
- Directions
- View
- Add Space

## Routing / Return-State Contract
Back returns exact Restaurants/Nightlife/Interactive state and bounds; detail returns same map state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No results → expand/clear/list.
- Map provider failure → List.
- Location denied → city/neighborhood center.

## QA — Automatic Failure Conditions
- Separate map DB.
- Filters lost.
- Duplicate pins.
- No clusters.
- Refresh every pan movement.
- Huge header.
- No List alternative.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
State-preserving Map/List, bounds queries, clustering/card sync, actions/accessibility and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
