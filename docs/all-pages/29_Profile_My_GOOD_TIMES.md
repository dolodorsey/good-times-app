# GOOD TIMES — PAGE 29/30
# PROFILE / MY GOOD TIMES

**Status:** LOCKED PLANNING STANDARD  
**Family:** Profile  
**Primary visual identity:** Graphite + warm gold + soft violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Customer personal hub answering what they saved, planned, followed, and explicitly/inferredly taught GOOD TIMES.

## Locked Hierarchy
**Current Plan → Saved/Plans/Following/Radar shortcuts → Your Vibe → personal previews/history → preferences/settings.**

## Required Modules
- Compact identity/header.
- Active/Upcoming Plan priority and attention state.
- 2x2 Saved / Plans / Following / Radar shortcuts.
- Your Vibe with explicit-vs-inferred distinction.
- Saved For Later preview.
- Upcoming Plans, Draft recovery, Recent GOOD TIMES.
- Following preview.
- Recently Viewed and meaningful Recent Activity.
- Radar/notification summary.
- Personalization controls.
- Account/Privacy/Location/Help lower.

## Backend / Supabase Rules
- Canonical profile/preferences/follows/saves/plans/interactions/Radar.
- Save and Follow stay distinct.
- Session constraints never become permanent preferences automatically.
- Saved/Plans/Follows private by default.

## Required Actions
- Open Saved/Plans/Following/Radar
- Continue Plan/Draft
- Reuse
- Edit Preferences
- Recent items
- Manage Settings

## Routing / Return-State Contract
Saved→30; Plan→23/27; Radar→28; Profile selected.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- New user → Make GOOD TIMES Yours.
- No Plan → Build/Shake/Ask.
- Module failures isolated.

## QA — Automatic Failure Conditions
- Settings-first page.
- Huge avatar.
- Saved buried.
- Inferred preference as fact.
- Vanity-stat dashboard.
- Private activity exposed.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Personal hub, Saved under Profile, Plan priority, controlled personalization/follows/activity/settings and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
