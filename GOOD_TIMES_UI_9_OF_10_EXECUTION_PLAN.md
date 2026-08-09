# GOOD TIMES — 9/10 UI Execution Plan

## Objective
Move the owner-visible GOOD TIMES customer experience from the current ~6–7/10 to a defensible 9/10+ without destabilizing the working backend, auth, data, or release systems.

This is a **rendered product-quality program**, not a backend audit. The browser is the source of truth.

## Operating rules

1. Work only on `claude/ui-stabilization-v2` until acceptance.
2. Do not merge directly to `main`.
3. Do not call the UI done because CI is green, Vercel is READY, or APIs work.
4. Do not add another emergency override sheet unless there is no cleaner option.
5. Consolidate conflicting selectors instead of stacking patches.
6. Every phase requires rendered screenshots before moving on.
7. Test signed-out and signed-in states.
8. Test 1440x900, 1280x800, 1024x768, 430x932, and 390x844.
9. Preserve current GOOD TIMES product boundaries, auth, data, saves, recommendations, plans, tickets, and account deletion behavior.

---

# PHASE 0 — Freeze and reproduce

## Goal
Capture the exact current failures before changing anything.

## Actions
- Run the current production build locally using production env vars.
- Open production and local build with Chromium/Playwright.
- Capture baseline screenshots for all required viewports.
- Capture signed-out welcome/auth flow.
- Capture signed-in Home, Dates, Build, Plans, Explore, Map, Vault, Connect, Tickets, Account.
- Record browser-console errors and warnings.
- Record layout metrics for:
  - `.gt-premium-experience`
  - `.gtlive-app`
  - `.gtlive-scroll`
  - `.gtlive-hero`
  - `.gtlive-rail`
  - `.gt-five-nav`
  - `.gt-connect-fab`
  - Tickets button
  - Account button
  - modal/backdrop surfaces
- For every visible defect, identify the winning computed selector before changing CSS.

## Exit criteria
- Baseline screenshots exist for every required viewport.
- Every major visual glitch has a named responsible selector/component.
- No speculative CSS changes before this evidence exists.

---

# PHASE 1 — Collapse the CSS stack

## Goal
Replace the current patch-on-patch styling model with one coherent shell and one responsive system.

## Actions
- Audit and classify every rule in:
  - `premium-experience.css`
  - `runtime.css`
  - `good-times-live.css`
  - `good-times-scenes.css`
  - `good-times-connect.css`
  - `good-times-profile.css`
  - `good-times-overlay-safety.css`
  - `good-times-desktop.css`
- Remove the dangerous broad shell behavior from `.gt-premium-experience > *` rather than only overriding it later.
- Scope shell geometry only to true application surfaces.
- Move shared tokens into one authoritative set: background, panel, text, muted, gold, accent, borders, radii, shadows, spacing.
- Remove duplicate media-query behavior.
- Remove duplicate width/max-width/height declarations that fight one another.
- Keep mobile-first rules in the core stylesheet; desktop rules should enhance, not replace, the structure.
- Reduce emergency UI stylesheets to the minimum practical number.

## Exit criteria
- No viewport-sized geometry is inherited by floating controls.
- No duplicate competing desktop shell definitions remain.
- No visual feature depends on import-order accidents.
- CSS architecture is understandable from source without tracing multiple emergency overrides.

---

# PHASE 2 — Rebuild the app shell

## Goal
Create a deliberate product shell at desktop, tablet, and mobile sizes.

## Desktop requirements
- Contained premium frame or intentional full-bleed layout; never accidental stretched-mobile geometry.
- Clear topbar with GOOD TIMES identity, city selector, and restrained utility controls.
- Navigation must feel like a desktop navigation system, not a mobile dock enlarged on screen.
- Connect/Tickets/Account must be integrated into the shell or utilities, not float randomly around content.
- Main content width must have consistent gutters.
- Scroll behavior must be predictable with no hidden clipped regions.

## Mobile requirements
- Native-feeling vertical flow.
- Bottom navigation remains thumb-friendly.
- Safe-area handling remains correct.
- No desktop artifacts appear below 900–960px.

## Exit criteria
- No dead side areas that look accidental.
- No floating controls colliding with cards/content.
- No shell resizing when opening Connect, Tickets, Account, Map, or Planner.
- Desktop and mobile both look intentionally designed, not transformed versions of each other.

---

# PHASE 3 — Home screen 9/10 pass

## Goal
Make Home the strongest screen in the product.

## Actions
- Recompose hero with predictable height, crop, readable hierarchy, clear CTA, and no blank bands.
- Ensure hero text never overlaps event artwork or unsafe image regions.
- Rebuild quick actions into one consistent component style.
- Standardize event and venue cards:
  - aspect ratio
  - image crop
  - title length
  - date badge
  - save control
  - metadata
  - card height
  - hover/active state
- On desktop, show curated rows/grids with intentional density; do not scatter cards across open canvas.
- On mobile, keep horizontal rails only where they improve discovery.
- Remove placeholder-looking generic imagery wherever possible.
- Ensure each homepage section has meaningful hierarchy and spacing.

## Exit criteria
- Home has no overlap, clipping, empty slabs, mismatched card heights, or giant gaps.
- At 1440x900 the first viewport feels intentionally composed and premium.
- At 390x844 the same product feels native and usable rather than shrunk desktop.

---

# PHASE 4 — Finish every primary surface

Each surface must have complete **loading, success, empty, and error** states.

## Dates
- Search/filter hierarchy is clear.
- Filters do not overflow or jump.
- Event grid spacing is consistent.
- Date segmentation is visually obvious.

## Build / Planner
- Form hierarchy is simplified.
- Inputs align consistently.
- Vibe chips are readable.
- Loading state cannot hang.
- Result itinerary has a strong visual timeline and actions.

## Plans
- Empty state is useful.
- Plan cards have consistent hierarchy.
- Share/directions actions do not crowd content.

## Explore
- 25-category browse feels deliberate, not like a utility table.
- Categories and subcategories have clear distinction.
- Directory results use the same visual system as Home.

## Map
- Map and place list must coexist without modal collisions.
- Mobile map uses appropriate vertical height.
- Desktop map gets a split-panel or intentional stacked composition.

## Vault
- Saved events, venues, and tickets are clearly separated.
- Empty states explain what to do next.

## Connect
- Convert from floating utility feel into a polished member hub.
- Current / Network / Links tabs need consistent layout and responsive behavior.

## Tickets
- Launcher and modal must match core visual system.
- Ticket-shop and wallet states should feel native to GOOD TIMES.

## Account
- Account access should not compete visually with core navigation.
- Delete-account flow stays clear and safe.

## Exit criteria
- Every surface can be shown in screenshots without explanation or apology.
- No surface visually looks like it came from a different app.

---

# PHASE 5 — Interaction and glitch pass

## Goal
Eliminate visual/runtime behavior that makes the product feel unstable.

## Test matrix
For every required viewport:
- switch city repeatedly
- navigate every primary tab
- open/close Connect 5x
- open/close Tickets 5x
- open/close Account 5x
- open/close event and venue details repeatedly
- open Map and return
- open Planner and switch Build / My Plans
- save/unsave events and venues
- resize desktop browser across breakpoints
- rotate mobile emulator orientation where practical
- test slow network and failed API responses

## Fix classes
- z-index fights
- scroll locking
- duplicated overlays
- body overflow leaks
- resize jumps
- hydration/render flicker
- stale loading states
- focus traps
- mobile viewport jumps
- clipped modals
- horizontal overflow

## Exit criteria
- No reproducible layout glitch after repeated interaction.
- No uncaught browser-console errors.
- No repeated warnings caused by GOOD TIMES UI code.

---

# PHASE 6 — Visual polish pass

## Goal
Move from technically clean to premium.

## Actions
- Unify typography scale and line heights.
- Unify 4/8px spacing rhythm.
- Normalize corner radii.
- Normalize border opacity.
- Normalize shadows.
- Replace random emoji/icon treatments with one icon language where practical.
- Tune hover/pressed/focus states.
- Reduce visual noise from too many gold outlines and floating pills.
- Improve content density: premium does not mean empty.
- Ensure artwork and imagery carry the GOOD TIMES identity.
- Verify AA-readable contrast for important text/actions.

## Exit criteria
- Screenshot review shows one coherent design language across all screens.
- No component looks like a temporary developer control.

---

# PHASE 7 — Automated visual regression

## Goal
Prevent another 6/10 regression after the cleanup.

## Actions
- Add Playwright screenshot tests for required viewports.
- Cover signed-out and signed-in shells.
- Add tests for Home, Dates, Build, Explore, Map, Vault, Account.
- Add DOM assertions for:
  - no horizontal body overflow
  - floating launchers within viewport
  - hero has positive visible area
  - nav does not cover actionable content
  - dialogs fit viewport
  - desktop rails have consistent card bounds
- Preserve screenshots as CI artifacts.

## Exit criteria
- CI fails on meaningful shell/geometry regressions.
- Visual artifacts are available for human review on every UI PR.

---

# PHASE 8 — Acceptance review

## Required evidence
Claude/UI agent must provide:
- final commit SHA
- before/after screenshots at all 5 viewport sizes
- signed-out and signed-in examples
- Home / Dates / Build / Plans / Explore / Map / Vault / Connect / Tickets / Account screenshots
- browser console summary
- list of deleted/consolidated CSS rules/files
- list of remaining known UI defects, if any

## Scoring gate
The UI is not accepted until all are true:
- Layout stability: 9/10+
- Visual hierarchy: 9/10+
- Desktop design: 9/10+
- Mobile design: 9/10+
- Navigation/usability: 9/10+
- Component consistency: 9/10+
- Glitch-free interaction: 9/10+
- Brand polish: 9/10+

The owner's visual judgment is the final acceptance gate.

---

# Merge / production sequence

1. Complete work on `claude/ui-stabilization-v2`.
2. Open PR into `main`.
3. Attach screenshots and Playwright evidence.
4. Review diff for CSS-layer growth; reject if the solution is mostly another override stack.
5. Run all existing backend/product tests.
6. Run visual regression suite.
7. Deploy preview.
8. Perform owner visual review.
9. Merge only after 9/10 acceptance.
10. Deploy production.
11. Re-run Vercel runtime checks and GOOD TIMES API checks.
12. Update `GOOD_TIMES_RELEASE_EVIDENCE.md` only after the rendered product is actually accepted.

---

# Non-goals

Do not spend this pass on:
- event sourcing architecture
- Supabase schema redesign
- personalization model redesign
- App Store metadata
- iOS signing
- Android credentials
- SEO/AEO/GEO
- new feature invention

The job is to make the existing GOOD TIMES product look and behave like a finished 9/10+ app.