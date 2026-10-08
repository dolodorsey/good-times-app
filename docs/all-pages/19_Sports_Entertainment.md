# GOOD TIMES — PAGE 19/30
# SPORTS ENTERTAINMENT

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black + red/orange  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Deep Event-side sports engine answering what sports are happening, where to watch, and how to build game day.

## Locked Hierarchy
**Live/Today/This Week/Upcoming → Sport → League/Team → Sports Event.**

## Required Modules
- Sport + league rails.
- Atlanta team rail + Follow.
- Live Now / Next Up / Home Games.
- Away Game Watch Parties.
- Watch Parties as Events; Sports Bars as Places bridge.
- Pregame/Postgame/Build Game Day.
- NBA/NFL/MLB/MLS/WNBA/College-HBCU/Combat/Major Events/Playoffs/This Week.
- GOOD TIMES Picks / Trending.

## Backend / Supabase Rules
- Canonical Team/League + sports Event extension.
- Live score provider data separate from static Event.
- Home/away/neutral modeled.
- Watch-party Event references game/team/venue.

## Required Actions
- Follow Team
- Tickets
- Save
- + Plan
- Watch Party
- Venue link
- Build Game Day
- Add Sports Event

## Routing / Return-State Contract
Sports Event→20; Venue→Place; watch party→20; sports bar→Place.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Live provider failure.
- Postponed/delayed/final.
- No home game alternatives.
- Ticket failure.

## QA — Automatic Failure Conditions
- Betting UI.
- Fake scores.
- Watch party merged with sports bar.
- Arena as Event.
- Finished game in Upcoming.
- Pregame ignores venue.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Sports hierarchy/team follow, truthful live/ticket state, watch parties, game-day Plan and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
