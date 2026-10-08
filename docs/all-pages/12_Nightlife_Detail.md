# GOOD TIMES — PAGE 12/30
# NIGHTLIFE DETAIL

**Status:** LOCKED PLANNING STANDARD  
**Family:** Place Detail  
**Primary visual identity:** Black/charcoal + magenta/violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical nightlife Place-detail answering “Is this the right nightlife spot, and what is happening there tonight?”

## Locked Hierarchy
**Venue identity/status → table/+Plan/directions/save → type/vibe/music → Tonight at Venue → hours/entry/gallery → upcoming Events → Build Around → related subcategories → similar venues.**

## Required Modules
- Controlled venue hero.
- Name/type/neighborhood, price, open-late, age when verified.
- Table/Reserve, +Plan, Directions, Save.
- Quick facts + category context.
- Vibe rail and typical Music profile.
- Tonight at Venue + Coming Up Event modules.
- Table/guest-list/entry policy resolver.
- Age/dress/hours/address/parking/contact.
- Gallery / What to Expect.
- Build Around, Before/After.
- Related subcategories before Similar Venues.
- Suggest Update.

## Backend / Supabase Rules
- Canonical Place + nightlife extension.
- Typical venue music/vibe separate from Event programming.
- Series/occurrences link Events to venue.
- Overnight hours handled correctly.

## Required Actions
- Reserve/Request Table/Call
- Guest List when real
- Save
- + Plan
- Directions
- Open Event
- Follow if enabled
- Suggest Update

## Routing / Return-State Contract
Event→20; taxonomy→8; Back preserves Page 08 state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Event tonight.
- Event cancelled while venue open.
- Venue closed/rebranded.
- Missing table link.

## QA — Automatic Failure Conditions
- Venue/Event merged.
- Specific Event overwrites venue profile.
- Fake tables/guest list.
- Ended Event still shown Tonight.
- Flyer-like detail.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Nightlife profile, truthful access/event modules, Venue/Event separation, Plan before/after and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
