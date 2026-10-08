# GOOD TIMES — PAGE 25/30
# SHAKE IT

**Status:** LOCKED PLANNING STANDARD  
**Family:** Plan Focused Flow  
**Primary visual identity:** Black + ultraviolet/violet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Minimal-input high-quality surprise engine that reduces decision fatigue without becoming random.

## Locked Hierarchy
**Minimal context → Shake → one strong result → Keep It / Shake Again / Build the Night.**

## Required Modules
- Focused header/no bottom nav.
- Context chips for time, party size, area, category/Anything.
- Large tactile SHAKE control; tap always works, motion optional.
- Optional Set a Few Rules.
- Neutral, anchored and active-Plan modes.
- One-result-first YOUR MOVE card + grounded Why This.
- Keep It / Shake Again / Build the Night.
- Explicit Full Night mode only when selected.

## Backend / Supabase Rules
- Canonical eligible inventory only.
- Quality floor then controlled randomization within high-quality band.
- Session exclusion prevents repeats.
- Time/location/status/duration/Plan validation.
- source_method=shake.

## Required Actions
- Shake
- Edit context
- Set rules
- Keep It
- Shake Again
- Build Night
- Open/Save/Book/Tickets

## Routing / Return-State Contract
Build Night→27; detail returns same result; Exit→23 with context retained.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- No good candidate → relax rules.
- Provider failure degrades to valid inventory.
- Reduced-motion/web fallback.

## QA — Automatic Failure Conditions
- Build-like questionnaire.
- True random garbage.
- List instead of one result.
- Repeats.
- Casino look.
- Fake match score.
- Physical shake mandatory.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Fast Shake, quality-floor randomization, repeat prevention, context modes, shared Plan and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
