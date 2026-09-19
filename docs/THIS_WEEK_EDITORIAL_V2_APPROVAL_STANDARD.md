# GOOD TIMES — THIS WEEK APP EXPERIENCE V4

## App-Only Visual Approval Standard

**Status:** VISUAL CANDIDATE — OWNER APPROVAL REQUIRED BEFORE RUNTIME IMPLEMENTATION  
**Prepared:** September 19, 2026  
**Scope:** GOOD TIMES native/mobile app experience only  
**Public website:** NOT A PRODUCT REQUIREMENT  
**Production app runtime:** UNCHANGED by this approval-standard work

## Product decision

GOOD TIMES should treat **THIS WEEK** as a first-class **in-app editorial mode** — not a public web destination and not a sixth permanent bottom-navigation destination.

The protected primary navigation remains exactly:

**HOME / DISCOVER / PLAN / SAVED / PROFILE**

The weekly experience lives inside the signed-in app and is entered from:
- the existing Home **This Week** quick action;
- optionally, a secondary app-level segmented control such as **FOR YOU / THIS WEEK / TONIGHT**;
- deep links/notifications that open the same in-app state.

Vercel is the build/preview/runtime layer. It is not the customer-facing product definition. Supabase remains the live data source. Existing GOOD TIMES handlers remain the action layer.

## App screen architecture

### Persistent shell — unchanged
- native safe-area / status bar treatment;
- GOOD TIMES brand header;
- city context;
- search / notification controls;
- five-item bottom navigation;
- existing authentication and session behavior.

### Secondary app navigation
A compact in-app segment may expose:
- **FOR YOU**
- **THIS WEEK**
- **TONIGHT**

This is not a second bottom navigation and does not remove any existing destination.

### THIS WEEK scroll sequence
1. **Atlanta This Week** cinematic in-app hero.
2. Six compact jump controls: Top Picks / Live / Food / Nightlife / Sports / Culture.
3. **Top Picks** horizontal swipe cards.
4. **Atlanta After Dark / Tonight** current actionable options.
5. **Week Ahead** chronological Sep 19–25 style list based on current city data.
6. **Food + Drink** verified place module.
7. **Culture + City** verified culture/experience module.
8. **Plan Smarter** handoff to existing Save / Follow / Share / Plan actions.
9. Existing bottom navigation remains available at all times.

## Action contract — no duplicate product logic

THIS WEEK is presentation over the app that already exists.

- Event tap → existing event detail.
- Venue/place tap → existing venue detail.
- Ticket CTA → existing verified ticket handoff.
- Save → existing Save function.
- Follow → existing Radar/follow function.
- Share → existing native Share.
- Build My Night → existing Plan/Concierge.
- See All → existing Discover state.

No parallel user profile. No second saved system. No duplicate booking layer. No separate event database.

## Data contract

The owner-supplied 2024/2025 weekly graphics are **creative direction only**.

Historical dates, venues, artists, rankings, restaurant statuses, QR codes and CTAs from reference art can never become app facts.

Current app facts must come from the existing live GOOD TIMES/Supabase inventory and preserve:
- selected city;
- selected-city timezone;
- current/future event eligibility;
- source and verification state;
- published performance time vs doors-only/TBA semantics;
- ticket/source URL;
- existing content-quality gates.

## Image trust contract

- Named event card: exact current event art only after existing media QA.
- Named venue card: exact verified venue photography only.
- Category fallback: may support category atmosphere but may not impersonate a named venue.
- Owner-supplied weekly graphics: may provide cropped **editorial atmosphere only** after stale names/dates/QR/CTA text is removed.
- Unknown-rights candidates never auto-publish.
- If no trustworthy exact image exists, the app uses a premium no-photo editorial card instead of a false photo.

## Visual target

### Core aesthetic
- black / warm ivory / semantic gold;
- cinematic Atlanta atmosphere;
- weekly headline serif only inside editorial mode;
- normal app UI/metadata remains modern sans-serif;
- high-density information with strong hierarchy;
- touch targets >=44px where interactive;
- horizontal swipe surfaces where appropriate;
- no desktop-first composition shrunk onto mobile.

### Reference phone
Primary approval width: **390×844**.

Also review:
- 320×568
- 390×844
- 430×932
- 834×1194 tablet

## Screenshot QA loop

No customer-facing implementation may ship from a successful build alone.

Every app-only implementation pass must:
1. build an isolated preview branch;
2. load authenticated fixture state;
3. capture the exact THIS WEEK app state at target phone/tablet widths;
4. inspect visual hierarchy, overflow, touch controls, image truth, date/time formatting and bottom navigation;
5. correct defects;
6. recapture;
7. repeat until screenshots match or exceed the approved visual standard.

Release fails when:
- Home / Discover / Plan / Saved / Profile changes unintentionally;
- public-web layout is used as the design target;
- reference-year facts are hard-coded;
- generic imagery impersonates a named place/event;
- event detail / Save / Follow / Share / Plan handlers are duplicated or bypassed;
- horizontal overflow occurs outside intentional card carousels;
- 320px layout breaks;
- safe-area/bottom-navigation collision appears;
- production smoke/live-runtime/auth gates fail;
- screenshot evidence is missing.

## Safe implementation sequence — only after owner visual approval

1. Create isolated `GoodTimesThisWeekAppV4.jsx` + dedicated CSS.
2. Do not refactor the five existing app destinations.
3. Reuse already-loaded current city events/venues and existing callbacks.
4. Gate V4 behind a preview-only feature flag/state.
5. Build the Capacitor/web bundle exactly as the app uses it.
6. Capture phone/tablet evidence from that isolated branch.
7. Owner reviews screenshots.
8. Only after explicit approval, connect V4 to the signed-in app This Week entry.
9. Merge only after existing production/app-store/runtime gates remain green.

## Vercel / Supabase / GitHub roles

### Supabase
- canonical current data;
- auth/session source;
- saves/follows/preferences/radar;
- content freshness and media-trust state.

### GitHub
- isolated feature branch;
- visual-contract tests;
- screenshot evidence;
- no-downgrade checks;
- PR approval gate.

### Vercel
- preview/build/runtime verification only;
- API/runtime health;
- screenshotable preview of the same React/Capacitor bundle used by the app;
- never the design priority over the native app experience.

## Owner approval gate

The new phone-first visual preview is the candidate minimum standard.

**Owner approval:** PENDING  
**Runtime component implementation:** NOT STARTED  
**Production app changes from this correction:** NONE
