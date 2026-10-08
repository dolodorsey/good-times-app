# GOOD TIMES — PAGE 27/30
# FINISHED ITINERARY / LIVE PLAN

**Status:** LOCKED PLANNING STANDARD  
**Family:** Plan  
**Primary visual identity:** Black + premium gold with stop-type accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Single shared execution/editing surface for every Plan created by Build, Shake, Ask or manual +Plan.

## Locked Hierarchy
**Plan status/action checklist → timeline → edit/validation/travel → active NOW/NEXT → map/share/reuse.**

## Required Modules
- Compact title/date/status header.
- Numbered vertical timeline of canonical Place/Event/Custom stops.
- Per-stop status/actions.
- Booking/ticket action checklist.
- Validation warnings Blocking/Important/FYI.
- Travel connector with real route time only when available.
- Timeline/Map toggle.
- Edit mode: Swap, Remove, Change Time, Reorder, Add Stop.
- Fixed Event time protection and flexible-arrival/open-window behavior.
- Fill Gap.
- Active NOW/NEXT, Directions, Skip, Running Late.
- Auto-save, Share, Reuse; weekend day groups.

## Backend / Supabase Rules
- Plan item state distinct from Event state.
- Validation service rechecks canonical objects/hours/conflicts/changes.
- Canonical current truth wins during execution.
- Shared add/remove/replace/reorder/time operations.

## Required Actions
- Reserve/Tickets
- Directions
- Swap
- Remove
- Add Stop
- Reorder
- Change Time
- Map
- Running Late
- Skip
- Share
- Reuse

## Routing / Return-State Contract
Stop detail returns to same timeline; Plan selected in nav; map shares same Plan state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Cancelled/time/venue-changed Event.
- Closed Place.
- Status refreshing.
- Empty Plan → Build/Shake/Ask.
- Completed → reuse.

## QA — Automatic Failure Conditions
- Read-only itinerary.
- Event time corrupted.
- Click marked as booked.
- Fake travel time.
- Cancelled/closed stays normal.
- Edits not revalidated.
- Different itinerary formats per method.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Editable validated timeline, truthful action state, live execution, map/share/reuse and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
