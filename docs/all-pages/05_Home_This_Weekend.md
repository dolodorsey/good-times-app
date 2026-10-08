# GOOD TIMES — PAGE 05/30
# HOME / THIS WEEKEND

**Status:** LOCKED PLANNING STANDARD  
**Family:** Home Intelligence  
**Primary visual identity:** Black + amber/orange with day accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Near-term weekend decision screen answering “What should I do this weekend in Atlanta?” across Places, Events and planning.

## Locked Hierarchy
**Friday/Saturday/Sunday → time of day → featured/category modules → whole-weekend planning.**

## Required Modules
- Friday / Saturday / Sunday / All Weekend.
- Daytime / Dinner / Night / Late Night, Brunch where relevant.
- Featured This Weekend.
- Friday Night, Saturday Day/Night, Sunday flows.
- Brunch, Day Parties, Concerts, Sports, Festivals.
- Something Different, Date Night, Group Plans.
- Neighborhood Weekend, Hotspots, Last-Minute, Free, Family, Visitors.
- Build Friday/Saturday/Sunday/Whole Weekend.

## Backend / Supabase Rules
- Canonical weekend window supports overnight crossover.
- Dedupe/diversity guard across modules.
- Whole-weekend Plan is one Plan with day-grouped items.

## Required Actions
- Save
- + Plan
- Tickets
- Reserve
- Build Day/Weekend
- Add Space/Event

## Routing / Return-State Contract
Event→20; Place→detail; Concerts→17; Sports→19; Plan→shared Plan system. Preserve day/time/filter.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Weak day inventory → alternatives/Places/Plan.
- Current day drives default.
- No fake weather/availability.

## QA — Automatic Failure Conditions
- No day distinction.
- Saturday-only feed.
- Brunch/culture/sports ignored.
- Repeated same Event.
- Places/Events blurred.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Weekend modes, diverse modules, whole-weekend planning, dedupe and QA >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
