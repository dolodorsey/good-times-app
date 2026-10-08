# GOOD TIMES — PAGE 24/30
# BUILD IT

**Status:** LOCKED PLANNING STANDARD  
**Family:** Plan Focused Flow  
**Primary visual identity:** Black + gold/amber  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Structured six-step Plan-generation method for users who want control without manually searching every stop.

## Locked Hierarchy
**When → Who → What Kind of Time → Where → Spend → Anything Else → Build My Plan → Page 27.**

## Required Modules
- Focused compact header/progress; no bottom nav.
- When selector + contextual time.
- Who cards + party size if useful.
- Multi-select desired experience types and optional sequence.
- Where selector / Near Me / neighborhood / Anywhere.
- Optional spend selector/custom budget.
- Anything Else constraint chips + free text.
- Anchor-aware skipping of known info.
- Compact summary + Build My Plan.

## Backend / Supabase Rules
- Canonical retrieval-first pipeline.
- Hard vs soft constraints.
- Candidate scoring and sequence assembly use hours/status/duration/geography/budget.
- Build creates shared Plan/Plan Items with source_method=build.
- Generation request/receipt may store version and selected candidate IDs.

## Required Actions
- Select/Edit step
- Build Plan
- Exit with draft saved
- Adjust constraints

## Routing / Return-State Contract
Success→27 directly. No redundant results page.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Overconstrained request → relaxations.
- Generation failure preserves answers.
- Partial plan can surface missing stop.
- Anchor/date conflict warning.

## QA — Automatic Failure Conditions
- Web form.
- All six steps simultaneously.
- Known facts re-asked.
- Budget mandatory.
- Invented inventory.
- Exit loses draft.
- Separate Build Plan DB.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Progressive flow, persistent draft, anchor skipping, canonical scoring/sequencing/validation and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
