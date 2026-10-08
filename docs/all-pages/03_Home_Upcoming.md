# GOOD TIMES — PAGE 03/30
# HOME / UPCOMING

**Status:** LOCKED PLANNING STANDARD  
**Family:** Home Intelligence  
**Primary visual identity:** Black + electric/deep blue  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Forward-looking planning screen answering “What’s coming up that I should care about before it gets here?”

## Locked Hierarchy
**Date range → Just Announced → week calendar → major future Events → category lanes → Save/Follow/Plan.**

## Required Modules
- This Week / Next Week / This Month / Next 30 Days / Custom.
- Just Announced with truthful freshness.
- Weekly date strip.
- Big Events.
- Concerts Coming Up, Sports Coming Up, Festivals/City Moments.
- Weekend preview, Next Week/Later This Month.
- Free in Atlanta, Date Night Ahead, Family/Group.
- New Places with Upcoming Events.
- Following and City Radar preview.

## Backend / Supabase Rules
- Canonical future Events bounded by selected range.
- Recurring programming uses Series + Occurrences.
- Store source confidence and last verified.
- Dedupe normalized title+venue+start+promoter/ticket context.
- Canonical Follow model.

## Required Actions
- Save
- Follow
- + Plan
- Tickets
- Reminder where enabled
- Add Event/Add Space
- Open Radar

## Routing / Return-State Contract
Event→20; Concerts→17; Sports→19; Weekend→5; Venue→Place Detail. Preserve date/filter/scroll.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Events on date → nearby dates/Places/Build Plan.
- Cancelled/postponed excluded from discovery but visible to affected saves.
- Cold start → editorial/popular.

## QA — Automatic Failure Conditions
- Calendar dump.
- Duplicate recurring events.
- Fake Selling Fast.
- Expired events.
- Weak date organization.
- Places dominate.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Date-range architecture, announcement freshness, series/dedupe, follow/save/reminder and future Plan behavior pass >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
