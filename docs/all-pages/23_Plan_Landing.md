# GOOD TIMES — PAGE 23/30
# PLAN LANDING

**Status:** LOCKED PLANNING STANDARD  
**Family:** Plan  
**Primary visual identity:** Black + premium gold; Build gold, Shake violet, Ask cyan  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Simple front door to the shared Plan engine, making Build It, Shake It and Ask GOOD TIMES instantly understandable.

## Locked Hierarchy
**Build / Shake / Ask → active/draft/upcoming/recent Plans → anchored context when entered from Place/Event.**

## Required Modules
- Three distinct method cards.
- Active Tonight/Current Plan.
- Continue unfinished draft.
- Upcoming Plans.
- Recent Plans / Reuse.
- Build From Saved secondary.
- Anchored Starting With card when entered from Place/Event.
- Plan validation alerts.

## Backend / Supabase Rules
- All methods use same plans/plan_items with source_method.
- Plan status model and landing service.
- Plans private by default.
- Validation surfaces stale/cancelled issues.

## Required Actions
- Start Build
- Start Shake
- Start Ask
- Continue Plan/Draft
- Reuse
- Share
- Review Plan

## Routing / Return-State Contract
Build→24; Shake→25; Ask→26; Plan→27. Plan tab selected.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No Plans → creation methods.
- Plan needs attention.
- History failure does not block creation.

## QA — Automatic Failure Conditions
- Landing becomes questionnaire.
- Methods indistinguishable.
- History dominates.
- Anchor lost.
- Separate Plan DB per method.
- Draft lost.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Distinct methods, shared Plan architecture, neutral/anchored entry, active/draft/upcoming/reuse and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
