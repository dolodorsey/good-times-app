# GOOD TIMES — PAGE 02/30
# HOME / TONIGHT

**Status:** LOCKED PLANNING STANDARD  
**Family:** Home Intelligence  
**Primary visual identity:** Black + coral/red  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
A time-first live decision screen answering “What can I realistically do tonight, starting now?”

## Locked Hierarchy
**Current time phase → Starting Soon → Dinner/Main Event/Late Night/Open Places → planning shortcuts → active plan.**

## Required Modules
- Dynamic Now / Dinner / Early Night / Main Event / Late Night / After Hours rail.
- Starting Soon Events.
- Dinner Before Places when relevant.
- Main Event.
- Turn Up Tonight with party/music subcategories.
- Live Music, Sports, Comedy/Shows.
- Still Open, Late Night, After Hours only when contextually relevant.
- Build/Shake/Ask and active Tonight Plan continuation.

## Backend / Supabase Rules
- Atlanta-local Tonight window extends past midnight.
- Event eligibility excludes ended/cancelled and uses canonical occurrence status.
- Places use real hours for relevant arrival window.
- Reusable tonight-context service should drive ordering.

## Required Actions
- Tickets/RSVP
- Save
- + Plan
- Reserve
- Directions
- Build
- Shake
- Ask
- Continue Plan
- Add Space

## Routing / Return-State Contract
Events → 20; Places → detail; Music →17; Parties→18; Sports→19; Build/Shake/Ask→24/25/26. Preserve phase/filter/scroll.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Starting Soon → later/open Places/planning.
- Thin late inventory → Open Late/Ask.
- Provider failure isolated.

## QA — Automatic Failure Conditions
- Dinner at 1 AM due hardcoding.
- Expired Events.
- Fake urgency.
- Places and Events look same.
- Time does not affect order.
- After Hours always shown.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Time-phase logic, canonical Tonight filtering, open/event truth, planning shortcuts and active-plan behavior all pass QA >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
