# GOOD TIMES — PAGE 28/30
# CITY RADAR

**Status:** LOCKED PLANNING STANDARD  
**Family:** Personal Intelligence  
**Primary visual identity:** Black/midnight + electric blue/violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Personal city-intelligence layer answering “What changed or became relevant that I should know about?” — not another discovery feed.

## Locked Hierarchy
**Priority signal → deterministic Why reason → contextual action → exact canonical object/Plan repair.**

## Required Modules
- Modes: For You, Changes, Following, Nearby, City.
- Needs Attention only when required.
- Plan-impact alerts.
- Just Announced for You.
- From Your Follows.
- Saved-item changes.
- Ticket/access alerts.
- New Places for You.
- Nearby Now with strict relevance.
- This Week for You.
- Major City Moments.
- Trending/Because You Saved/Because You Planned/Something Different.
- Dismiss/seen state without inbox pressure.

## Backend / Supabase Rules
- Radar item is signal pointer to canonical object, not copied truth.
- Controlled signal_type + reason_code.
- Change logs and Plan validation generate deterministic alerts.
- Seen/resolved/dismissed/expired separate.
- Idempotency + aggregation prevent duplicates.

## Required Actions
- View
- Save
- + Plan
- Tickets
- Review/Fix Plan
- Follow
- Dismiss

## Routing / Return-State Contract
Deep-link exact Event/Place/Plan issue; Back restores Radar mode/scroll.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Caught up.
- No location → omit Nearby.
- Signal updates/expires.
- Partial provider failure.

## QA — Automatic Failure Conditions
- Another Entertainment feed.
- Fake personalized reasons.
- Location spam.
- Duplicate same Event.
- Plan alerts buried.
- Sponsored unlabeled.
- Inbox gamification.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Priority/reason system, Plan/Saved/Follow/change signals, expiry/dedupe/deep actions and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
