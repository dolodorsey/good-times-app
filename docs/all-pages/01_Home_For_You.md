# GOOD TIMES — PAGE 01/30
# HOME / FOR YOU

**Status:** LOCKED PLANNING STANDARD  
**Family:** Home Intelligence  
**Primary visual identity:** Black + warm gold  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
The personalized Atlanta command center. It answers “What should I do?” and establishes the production component system used across the app.

## Locked Hierarchy
**City/time context → intent shortcuts → live/useful modules → Plan shortcuts → personalization.**

## Required Modules
- Compact GOOD TIMES header with Atlanta, Search, notifications/Radar and Add Space.
- For You / Tonight / This Week / Weekend / Upcoming feed tabs.
- Intent rail: Food, Drinks, Date Night, Turn Up, Live Music, Sports, Interactive, Chill, Something Different.
- Right Now in ATL Place cards.
- Tonight in Atlanta Event cards, visually distinct from Places.
- Build Tonight row: Build It / Shake It / Ask GOOD TIMES.
- Near You or Popular Around Atlanta if location unavailable.
- This Week, Sports, Do Something Different, Trending, personalized modules.

## Backend / Supabase Rules
- Assemble from canonical Places, Events, Hours, Media, Saves/Follows/Preferences, Plans, Interactions and Editorial Collections.
- Prefer one orchestrated Home feed service over many uncontrolled client queries.
- Use diversity guard across category/neighborhood/object type.
- Open/Event status must use canonical shared services.

## Required Actions
- Search
- Save/Unsave
- + Plan
- Reserve/Tickets when real
- Directions
- See All
- Build
- Shake
- Ask
- Add Space

## Routing / Return-State Contract
Place → correct Place Detail; Event → Event Detail; tabs use Home/Discover/Entertainment/Plan/Profile. Back from detail restores Home module and scroll.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Skeleton cards, not full-screen spinner.
- Module-level failure isolation.
- Cold start → Popular/GOOD TIMES Picks.
- Location denied → Atlanta context.

## QA — Automatic Failure Conditions
- Oversized header/website layout.
- Giant ordinary cards or dead space.
- Place/Event confusion.
- Fake live/trending data.
- Saved in nav / Entertainment missing.
- Back resets state.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
All major modules use canonical data/actions, personalization hooks exist, routing/state works, mobile density matches approved Page 1 visual, QA >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
