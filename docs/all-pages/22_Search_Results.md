# GOOD TIMES — PAGE 22/30
# SEARCH RESULTS

**Status:** LOCKED PLANNING STANDARD  
**Family:** Search  
**Primary visual identity:** Graphite + cool blue/silver with subtle object-family accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Dense mixed-object decision screen turning parsed search into actionable results while preserving Place/Event identity.

## Locked Hierarchy
**Editable query + parsed chips → All/Places/Entertainment → intent-aware grouped results → direct action/detail.**

## Required Modules
- Persistent search field.
- All / Places / Entertainment tabs.
- Editable parsed-intent chips.
- Top Match when confidence high.
- All grouped by meaningful result type, not random interleaving.
- Places tab with object-aware filters and Map/List.
- Entertainment tab with date/time/category/ticket filters.
- Category/Area/Artist/Team/Venue routing results.
- Plan-intent blocks for sequence queries.
- No-result recovery / Ask bridge.

## Backend / Supabase Rules
- Intent-specific ranking across text/structured/personal/time/location/popularity/actionability.
- Canonical status rechecked after index match.
- Search session preserves query/filter/scroll.
- Cursor pagination.

## Required Actions
- Save
- + Plan
- Reserve/Book
- Tickets/RSVP
- Map
- Filter
- Edit Query
- Ask
- Add Space/Event after duplicate check

## Routing / Return-State Contract
Place→11/12/13; Event→20; Map→10; Artist/Team→filtered views. Back restores exact results.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Typos.
- Weak intent.
- No results.
- Partial provider failure.
- Offline freshness caution.

## QA — Automatic Failure Conditions
- All-tab chaos.
- Place/Event unclear.
- Irrelevant universal filters.
- Map loses query.
- Search bar disappears.
- Expired/closed results.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Editable query, grouped mixed results, object-aware filters/map, Plan blocks, recovery/direct actions and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
