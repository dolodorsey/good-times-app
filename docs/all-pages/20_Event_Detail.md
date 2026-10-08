# GOOD TIMES — PAGE 20/30
# EVENT DETAIL

**Status:** LOCKED PLANNING STANDARD  
**Family:** Event Detail  
**Primary visual identity:** Black + teal/aqua base with event-type accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical adaptive Event-detail framework for Concerts, Parties, Sports, Comedy, Festivals, Culture, Food Events and Pop-Ups.

## Locked Hierarchy
**Event identity/status → date/time/venue → access/+Plan/save/share → participants/type details → Venue bridge → Build Around → related taxonomy → similar/same-venue Events.**

## Required Modules
- Controlled hero + status.
- Event title/type/date/time/doors/venue.
- Adaptive access CTA: Tickets/RSVP/Guest List/Free/Sold Out/Resale.
- +Plan, Save, Share.
- Quick facts and requirements.
- About.
- Participants: performers/teams/hosts/chefs/lineup.
- Venue bridge + Directions.
- Gallery / Schedule.
- Type-specific extension.
- Build Around + Before/After categories.
- Related subcategories before Similar Events.
- More at Venue, Series/Promoter, Suggest Update.

## Backend / Supabase Rules
- Canonical Event/Occurrence + optional extensions.
- Canonical status/access services.
- Timing semantics fixed_start/arrival_window/open_window/multi_session.
- Change log for material changes.
- Venue remains canonical Place.

## Required Actions
- Tickets/RSVP/Guest List
- Save
- + Plan
- Share
- Directions
- Venue
- Follow relevant object
- Build Around
- Suggest Update

## Routing / Return-State Contract
Venue→Place Detail; taxonomy→Entertainment; Back preserves source feed/filter/scroll.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Cancelled.
- Postponed.
- Venue/time changed.
- TBA venue/time.
- Sold out.
- Partial data.

## QA — Automatic Failure Conditions
- Venue becomes primary object.
- Fake access.
- Cancelled still sellable.
- Separate Event masters/design systems.
- Plan changes Event time.
- Flyer-only detail.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
One adaptive Event detail across types, truthful status/access/time, Plan semantics, Venue bridge/change handling and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
