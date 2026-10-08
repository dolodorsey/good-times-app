# GOOD TIMES — PAGE 13/30
# INTERACTIVE DETAIL

**Status:** LOCKED PLANNING STANDARD  
**Family:** Place Detail  
**Primary visual identity:** Black/dark navy + cyan/bright blue  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Canonical activity/experience Place-detail answering what happens here, duration, price, group fit, booking, and Plan compatibility.

## Locked Hierarchy
**Hero/identity → Book/+Plan/Directions/Save → activity types → how it works → duration/group/price → booking/hours/rules → Events → Build Around → related activity types → similar experiences.**

## Required Modules
- Controlled activity hero.
- Name/activity/neighborhood/open + verified duration/group/price.
- Book/Reserve/Get Tickets/Walk In resolver, +Plan, Directions, Save.
- Quick facts + category context.
- What You Can Do for multi-activity venues.
- How It Works.
- Duration / Group Size / Pricing.
- Food + Drink, Age, Before You Go rules.
- Gallery / real video where available.
- Happening Here Event bridge.
- Build Around, Before/After.
- More Ways to Play before Similar Experiences.
- Suggest Update / Suggest Another Activity.

## Backend / Supabase Rules
- Canonical Place + activity_type and optional offering relationships.
- Verified duration/group/booking/pricing units.
- Open Now distinct from slot availability.
- Plan consumes duration for sequencing/conflicts.

## Required Actions
- Book/Reserve/Get Tickets
- Save
- + Plan
- Directions
- Open Event
- Build Around
- Suggest Update/Activity

## Routing / Return-State Contract
Back to 09 exact state; Event→20; activity taxonomy→09 filtered.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No slot availability data.
- Activity removed.
- Partial price/duration.
- Booking failure.

## QA — Automatic Failure Conditions
- Fake duration/availability.
- Multi-activity venue duplicated.
- Normal activity confused with Event.
- Childish UI.
- Dead booking action.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Multi-activity support, duration/group/pricing/booking truth, Plan timing, Event bridge and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
