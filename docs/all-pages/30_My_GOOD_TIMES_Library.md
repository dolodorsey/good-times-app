# GOOD TIMES — PAGE 30/30
# MY GOOD TIMES LIBRARY

**Status:** LOCKED PLANNING STANDARD  
**Family:** Profile / Saved  
**Primary visual identity:** Graphite + warm gold/violet with object accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Single organized home for intentionally kept content: Saved Places, Saved Events and owned Plans.

## Locked Hierarchy
**All / Places / Events / Plans → object-aware search/filters → current status/actions → past/history lower.**

## Required Modules
- Compact Saved/My Library header + personal search/filters.
- Tabs: All, Places, Events, Plans.
- All grouped into Upcoming Saved, Places, Plans, Past.
- Places with category/neighborhood/open filters and closed historical state.
- Events split Upcoming / Needs Attention / Past.
- Plans split Upcoming / Draft / Completed / Archived.
- Build From Saved concept.
- Search Saved only + explicit Search All GOOD TIMES bridge.
- Closed/cancelled/postponed recovery actions.
- Plan Continue/Reuse.

## Backend / Supabase Rules
- Places/Events from canonical Save references; Plans from Plan ownership.
- Current canonical status at render.
- Following/Recently Viewed/Search History/Radar stay separate.
- Object-aware pagination and filters.

## Required Actions
- View
- Unsave
- + Plan
- Tickets/Reserve
- Find Similar
- Review Plan
- Continue Draft
- Reuse Plan
- Search All GOOD TIMES

## Routing / Return-State Contract
Detail back restores Library tab/filter/scroll; Profile selected.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Saved → Discover/Entertainment/Plan CTAs.
- No filter matches.
- Cancelled Event.
- Closed Place.
- Plan Needs Attention.
- Partial failure.

## QA — Automatic Failure Conditions
- Saved back in bottom nav.
- Random bookmark dump.
- Objects indistinguishable.
- Past Events dominate.
- Following/Recently Viewed mixed in.
- Closed/cancelled looks active.
- Search silently goes global.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
All/Places/Events/Plans, personal search/filter, live canonical status, +Plan/reuse/recovery/pagination/state and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
