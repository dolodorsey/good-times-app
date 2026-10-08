# GOOD TIMES — PAGE 16/30
# ENTERTAINMENT / THIS WEEKEND

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black + ultraviolet with warm weekend accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Authoritative Friday–Sunday Event universe, distinct from the broader Home weekend planner.

## Locked Hierarchy
**Friday/Saturday/Sunday/All Weekend → Time of Day → Category → Subcategory → Event.**

## Required Modules
- Day tabs and time-of-day modes.
- Featured This Weekend.
- Friday Early/Night/Late; Saturday Brunch/Day/Night/Late; Sunday Brunch/Day/Evening/Night.
- Concerts, Parties, Sports, Festivals, Comedy, Culture, Food Events, Brunch Events, Day Parties, Pop-Ups, Free, Family.
- Big Atlanta Moments, Just Announced, Trending, Popular, Following, Neighborhoods, Near You.
- Active Weekend Plan strip.

## Backend / Supabase Rules
- Canonical weekend window with overnight crossover.
- Multi-day Events handled without fake duplicate days.
- Recurring series use occurrences.
- Dedupe across modules.

## Required Actions
- Tickets/RSVP
- Save
- + Plan
- Venue link
- Add Event
- Continue Weekend Plan

## Routing / Return-State Contract
Concerts→17 weekend; Parties→18; Sports→19; Event→20.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Empty day/category → alternatives.
- Cancelled/postponed current truth.
- Multi-day Event state.

## QA — Automatic Failure Conditions
- Weak day distinction.
- Multi-day duplicate spam.
- Normal brunch service as Event.
- Only nightlife.
- Fake free/ticket state.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Weekend day/time modes, categories, multi-day logic, weekend Plan insertion/conflicts and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
