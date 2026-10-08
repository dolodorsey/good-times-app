# GOOD TIMES — PAGE 21/30
# UNIVERSAL SEARCH

**Status:** LOCKED PLANNING STANDARD  
**Family:** Search  
**Primary visual identity:** Graphite + cool blue/silver  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Single cross-app search-intelligence entry point answering “I roughly know what I want—help me find it.”

## Locked Hierarchy
**Universal query → parsed intent → typed suggestions/top match → direct canonical route or Page 22.**

## Required Modules
- Universal input: “What are you trying to get into?”
- Zero-query Recent, Trending Searches, Browse, Tonight shortcuts, Ask GOOD TIMES.
- Prompt chips: Date Night, Something Different, Open Now, Tonight, Weekend, Near Me, Under $50.
- Typeahead Top Match + grouped Place/Event/Artist/Team/Category/Area suggestions.
- Natural-language parsing for date/time/location/price/open-now/category/plan intent.
- Minimal ambiguity clarification.
- Complex planning query bridge to Ask GOOD TIMES.

## Backend / Supabase Rules
- Search index points to canonical objects; never source of truth.
- Exact/full-text/fuzzy/aliases before semantic where possible.
- Canonical status filters closed/expired objects.
- Controlled synonyms and neighborhood aliases.

## Required Actions
- Open suggestion
- Run full results
- Edit/remove intent
- Ask GOOD TIMES
- Add Space/Event only after duplicate search

## Routing / Return-State Contract
Strong exact match may route directly; broad query→22. Source context preserved.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Misspelling correction.
- Ambiguous query choices.
- No exact result with recovery.
- Near-me location request.

## QA — Automatic Failure Conditions
- Empty generic search page.
- Literal-only matching.
- Object types unclear.
- Exact match distorted by personalization.
- Search index overrides truth.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Typeahead/exact/fuzzy/natural parsing, typed objects, Ask bridge and state persistence all pass >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
