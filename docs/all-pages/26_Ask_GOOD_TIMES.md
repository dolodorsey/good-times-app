# GOOD TIMES — PAGE 26/30
# ASK GOOD TIMES

**Status:** LOCKED PLANNING STANDARD  
**Family:** Plan Focused Flow  
**Primary visual identity:** Black + cyan/blue with violet accents  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Natural-language interface into the shared Plan engine, turning user intent into real interactive Places/Events/Plans instead of essays.

## Locked Hierarchy
**Prompt/session context → parse structured intent → canonical retrieval → interactive recommendation/Plan preview → modify/accept → Page 27.**

## Required Modules
- Focused header/no bottom nav.
- Non-empty initial prompt experience with suggested prompts.
- Neutral, anchored and active-Plan modes.
- Minimal clarification when materially necessary.
- Interactive Place/Event cards and Plan previews.
- Use This Plan / Change Something / Give Me Another.
- Natural modifications: swap dinner, cheaper, closer, earlier, no clubs, add between stops.
- Edit in Build / Shake interoperability.

## Backend / Supabase Rules
- Natural language produces structured date/time/group/location/budget/sequence/exclusion.
- Retrieval-first: never invent candidate inventory.
- Locked anchors preserved unless explicitly replaced.
- Ask sessions store user-visible messages + structured intent, not hidden reasoning.
- source_method=ask.

## Required Actions
- Send
- Clarify
- Open/Save/Book/Tickets
- + Plan
- Use Plan
- Swap
- Regenerate
- Edit in Build
- Exit

## Routing / Return-State Contract
Accepted Plan→27; detail returns to session; Exit saves session/draft→23.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Unknown data handled honestly.
- No inventory → identify conflicting constraints + relaxations.
- Failure preserves message/context.

## QA — Automatic Failure Conditions
- Generic chatbot void.
- Essay responses.
- Hallucinated inventory.
- Too many clarifications.
- Locked item silently replaced.
- Separate Ask DB.
- No interactive CTA.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Natural parsing, minimal clarification, canonical cards/Plan preview, modifications, Build/Shake interop and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
