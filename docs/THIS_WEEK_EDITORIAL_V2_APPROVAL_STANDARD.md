# GOOD TIMES — THIS WEEK EDITORIAL V2

## Visual Approval Standard / Production Protection Plan

**Status:** VISUAL CANDIDATE — OWNER APPROVAL REQUIRED BEFORE APP IMPLEMENTATION  
**Prepared:** September 19, 2026  
**Scope:** GOOD TIMES only  
**Production app:** UNCHANGED by this preview work

## Product decision

GOOD TIMES should have a first-class weekly editorial experience inspired by the owner-supplied Atlanta weekly graphics, without becoming a sixth permanent bottom-navigation destination and without forking the existing app logic.

The target architecture is a **secondary editorial destination** called **THIS WEEK**:

- Preserve the protected primary navigation exactly: **HOME / DISCOVER / PLAN / SAVED / PROFILE**.
- Keep the existing Home **This Week** quick action as the primary entry point.
- Open the weekly issue full-screen and return to the prior app state when closed.
- If a persistent secondary tab is approved later, place it inside the Home/Discover editorial area, never in the permanent bottom navigation.
- Hand every event, venue, ticket, Save, Follow, Share, Plan and Concierge action to the existing GOOD TIMES functions.

## Visual standard

The weekly mode may be more editorial than the normal product UI:

- near-black #050505;
- warm ivory #F2EEE6;
- semantic gold #D8AA4A;
- large newspaper/editorial serif for weekly headlines only;
- modern sans-serif for metadata, controls, dates, tags and app actions;
- cinematic Atlanta atmosphere at section level;
- strong columns, borders, hierarchy and concise useful copy.

Editorial serif styling is contained to This Week. It does not change the normal GOOD TIMES product typography.

### Desktop hierarchy

1. GOOD TIMES / ATLANTA masthead + live-data indicator.
2. ATLANTA THIS WEEK hero with current week range.
3. Secondary editorial filter strip.
4. Top Picks — five current verified events.
5. Worth Knowing — verified places.
6. Week Ahead.
7. Tonight editorial feature.
8. Food + Drinks.
9. Nightlife Now.
10. Plan Smarter handoff.
11. Existing primary navigation preserved.

### Mobile hierarchy

Mobile is a dedicated vertical issue, not a shrunken desktop grid: hero, compact filters, top picks, verified places, week ahead, Tonight feature, category editorial blocks, Plan Smarter, then return to the unchanged app.

## Data contract

The supplied 2024/2025 graphics are **creative references only**. Historical dates, venue facts, artists, rankings, restaurant statuses, QR codes and CTAs must never become production facts.

This Week consumes the existing live GOOD TIMES customer inventory.

A named event must remain source-backed/current and preserve its actual date/time semantics, ticket/source handoff and selected-city timezone behavior.

## Image trust contract

- Named event cards may use only current exact event imagery from the record after media QC.
- Named venue cards may use only verified exact venue photography.
- Category fallback art cannot impersonate a named venue.
- Owner-supplied reference art may supply **generic editorial atmosphere only** after stale names, dates, rankings, QR codes and old CTAs are cropped away.
- Editorial atmosphere must be explicitly separated from named factual content.
- Unknown-rights candidates never auto-publish.

## Product behavior

This Week is presentation, not a parallel product:

- event → existing event detail;
- place → existing venue detail;
- ticket → existing verified ticket handoff;
- Save → existing save function;
- Follow → existing Radar/follow function;
- Share → existing native share function;
- Plan → existing Plan/Concierge path;
- See Everything → existing Discover state.

## Safe implementation sequence — only after owner approval

1. Build an isolated `GoodTimesThisWeekV2.jsx` and dedicated stylesheet. Do not refactor Home/Discover/Plan/Saved/Profile.
2. Expose V2 only behind an internal preview switch or preview-only route/state; current customer-facing behavior stays unchanged during QA.
3. Reuse the already-loaded `week`, current venues, city and existing callbacks. No new production database/API is required for the first implementation.
4. Capture and inspect 320×568, 390×844, 430×932, 834×1194 and 1440+ screenshots.
5. Stress-test loading, no exact venue photo, doors-only time, long titles, empty lanes, narrow phone, signed-in account and reduced-motion states.
6. Fail release if primary navigation changes, historical reference data is hard-coded, category art impersonates a venue, existing action handlers are bypassed, required screenshot evidence is absent, or production smoke/live-runtime checks fail.
7. Require explicit owner approval of desktop and mobile screenshots before wiring V2 to the customer-facing This Week entry.
8. After approval, deploy an isolated Vercel Preview from a feature branch, capture that exact deployment, compare against the approved screenshots, then consider merge.

## Current candidate review

Passed in the preview:
- materially closer to the supplied premium editorial references;
- strong desktop magazine hierarchy;
- dedicated mobile composition;
- current Sep 19–25, 2026 facts;
- stale names/dates removed from final atmosphere crops;
- named facts separated from generic editorial atmosphere;
- primary app navigation unchanged;
- no production app source altered by preview creation.

Still owner-controlled:
- visual-direction approval;
- overlay vs secondary Home/Discover tab vs both;
- final photo/text density;
- final official wordmark treatment.

## No-downgrade rule

Once approved, the desktop/mobile screenshots become the **minimum visual target**. A technically functional implementation is rejected if it is visibly less editorial, less readable, less useful, less trustworthy or less polished.

**Owner approval:** PENDING  
**V2 app implementation:** NOT STARTED  
**Production change from this approval-standard work:** NONE
