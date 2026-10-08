# GOOD TIMES — PAGE 04/30
# HOME / SPORTS

**Status:** LOCKED PLANNING STANDARD  
**Family:** Home Intelligence  
**Primary visual identity:** Black + orange/red  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Personalized sports dashboard answering “What sports are happening in Atlanta, and what can I do around the game?”

## Locked Hierarchy
**Time → Atlanta teams → Live/Next games → Watch Parties → Places around game → Game-Day Plan.**

## Required Modules
- Today / This Week / Teams / Watch Parties / Sports Bars modes.
- Atlanta team rail with Follow.
- Live + Upcoming.
- Your Teams.
- Watch Parties as Events.
- Sports Bars as Places.
- Pregame/Postgame anchored to game venue.
- Build Game Day.
- College, Big Events, This Week in Sports, Sports Experiences, Game-Day Eats.

## Backend / Supabase Rules
- Games remain canonical Events with team/league/home-away-neutral relationships.
- Live score data separate from static Event metadata.
- Watch-party Event may reference sports Event/team/venue.
- Pregame geography anchored to venue.

## Required Actions
- Follow Team
- Tickets
- Save
- + Plan
- Watch Party
- Directions
- Build Game Day
- Add Sports Event

## Routing / Return-State Contract
Game→20 sports mode; watch party→20; sports bar→Place; deeper sports→19. Preserve team/time state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No home game → watch parties/upcoming/sports bars.
- Score provider failure → render without fake score.
- Final games move out of upcoming.

## QA — Automatic Failure Conditions
- ESPN/betting clone.
- Fake scores.
- Watch Party merged with Sports Bar.
- Huge logos.
- Pregame ignores venue.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Team rail/follows, schedule/live truth, Event-vs-Place separation, game-day planning and QA >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
