# GOOD TIMES — PAGE 09/30
# DISCOVER / INTERACTIVE

**Status:** LOCKED PLANNING STANDARD  
**Family:** Places  
**Primary visual identity:** Black + cyan/electric blue  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Activity/experience discovery answering “What can we actually go do?”

## Locked Hierarchy
**Activity Type → Experience Style → Occasion → Entity.**

## Required Modules
- Activity types: Mini Golf, Darts, Racing, VR, Bowling, Arcades, Game Shows, Escape Rooms, Sports Games, Art, Cooking, Outdoor, etc.
- Experience style: Competitive, Chill, Immersive, Creative, High Energy, Team-Based, Skill-Based, Something Different.
- Occasion: Date Night, Friends, Birthday, Family, Group, Visitors, Team Building, Solo.
- Right Now/Tonight/Weekend/Daytime/Late Night.
- Play Now, Something Different, Date Night, Group Fun, Competitive, Immersive, Creative, Indoor, Outdoor, Late Night, Family, Visitors.

## Backend / Supabase Rules
- One canonical Place with multiple activity relationships.
- Verified duration/group/age/booking/pricing units.
- Open Now distinct from actual slot availability.
- Plan engine consumes duration.

## Required Actions
- Book/Reserve/Get Tickets
- Save
- + Plan
- Map
- Filter
- Add Space
- Suggest Activity

## Routing / Return-State Contract
Entity→13; special Event→20; Map→10. Preserve activity/style/occasion/time.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No availability data → truthful Open/Book states.
- No matches → relax constraints.
- Partial duration/price omitted cleanly.

## QA — Automatic Failure Conditions
- Childish gaming UI.
- Duplicate multi-activity venues.
- Fake duration/availability.
- Event mixed with activity.
- Dead booking CTA.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Multi-activity data, duration/group/booking truth, Plan timing, Map/Add Space and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
