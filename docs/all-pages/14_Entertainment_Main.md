# GOOD TIMES — PAGE 14/30
# ENTERTAINMENT MAIN

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black + ultraviolet/electric purple  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical Event-discovery hub answering “What’s happening in Atlanta that I should know about?”

## Locked Hierarchy
**Time → Entertainment Category → Subcategory → Event.**

## Required Modules
- Tonight / This Weekend / Upcoming modes.
- Category rail: Concerts, Nightlife, Sports, Comedy, Festivals, Culture, Food Events, Pop-Ups.
- Just Announced.
- Happening Soon / Tonight preview.
- This Weekend preview.
- Concerts+Live Music, Parties, Sports, Comedy, Festivals/City Moments, Culture, Food Events, Pop-Ups, Free.
- GOOD TIMES Picks, Trending, Popular, Following, Near You, Later This Month.

## Backend / Supabase Rules
- Canonical Event/Occurrence with venue/promoter/participant/team relationships.
- Series/occurrence for recurring Events.
- Source confidence, dedupe, freshness.
- Orchestrated feed service.

## Required Actions
- Tickets/RSVP
- Save
- + Plan
- Follow
- Venue link
- Add Event

## Routing / Return-State Contract
Tonight→15; Weekend→16; Music→17; Parties→18; Sports→19; Event→20; Venue→Place Detail.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Cancelled/ended excluded.
- Cold start editorial/popular.
- Module failure isolation.

## QA — Automatic Failure Conditions
- One giant Event list.
- No subcategories.
- Place/Event blur.
- All nightlife/music.
- Expired/cancelled Events.
- Giant posters.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Time/category/subcategory structure, broad Event modules, Event↔Venue, Save/Follow/+Plan/Add Event and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
