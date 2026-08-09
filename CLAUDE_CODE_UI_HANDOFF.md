# GOOD TIMES — Claude Code UI Stabilization Handoff

## Mission
Finish the **rendered customer UI** of GOOD TIMES on the real production app. Do not spend time re-auditing backend architecture unless a frontend issue directly requires it.

Production: `https://thegoodtimesworldwide.com`
Repository: `dolodorsey/good-times-app`
Current main baseline: `6bf234eb239b076b381ae3ca06c7587fc8da0160`

## Why this handoff exists
The backend/data/auth/release layers are substantially healthier than the rendered web UI, but prior fixes were made without a reliable authenticated browser-automation surface. That caused repeated CSS overrides to accumulate and fight one another.

The owner has now visually confirmed two production failures:

1. **Phone-shell failure** — desktop rendered as a narrow ~430px/540px mobile app with huge dead space.
2. **Overcorrection failure** — after removing the phone-width caps, desktop stretched into a large full-screen shell where the hero/content/cards/navigation floated and overlapped/glitched.

Do not treat green CI or Vercel `READY` as proof of UI quality. The rendered browser is the source of truth.

## Scope
You own **only the UI stabilization pass**:

- authenticated production homepage
- desktop composition
- mobile composition
- navigation
- hero
- event/venue rails and grids
- Dates
- Build / Planner
- Plans
- Explore
- Map
- Vault
- Connect
- Tickets
- Account
- dialogs/modals/overlays
- responsive behavior

Do **not** redesign Supabase tables, sourcing jobs, recommendation architecture, App Store release workflows, or Android release credentials.

## Critical files
Primary runtime:
- `src/main.jsx`
- `src/features/experience/GoodTimesLiveApp.jsx`

Current CSS stack:
- `src/premium-experience.css`
- `src/runtime.css`
- `src/features/experience/good-times-command.css`
- `src/features/experience/good-times-command-v2.css`
- `src/features/experience/good-times-live.css`
- `src/features/experience/good-times-scenes.css`
- `src/features/experience/good-times-connect.css`
- `src/features/experience/good-times-profile.css`
- `src/features/experience/good-times-overlay-safety.css`
- `src/features/experience/good-times-desktop.css`

Bridges/overlays:
- `src/features/experience/GoodTimesNavigationBridge.jsx`
- `src/features/experience/GoodTimesCompletionBridge.jsx`
- `src/features/experience/GoodTimesConnectHub.jsx`
- `src/features/experience/GoodTimesAccountCenter.jsx`
- `src/features/experience/GoodTimesPaymentsBridge.jsx`
- `src/features/experience/GoodTimesPaymentsLauncher.jsx`

Root shell:
- `index.html`

Tests:
- `scripts/authenticated-product-contract.test.mjs`
- `scripts/desktop-ui-contract.test.mjs`

## Known root causes already found

### 1. Mobile-only root sizing
`index.html` previously hard-capped `#root` at 430px on desktop.

### 2. App shell applied to every direct child
`premium-experience.css` contains/contained an overbroad selector equivalent to:

```css
.gt-premium-experience > * { ... full app shell sizing ... }
```

This affected floating bridge controls, not only the app. Nav, Account, Connect, Tickets, planner controls, maps and dialogs could inherit viewport/app-shell geometry.

### 3. Base Live app was mobile-first
`good-times-live.css` historically uses a ~540px app maximum and horizontal rails. Simply removing the max-width creates a stretched mobile UI, not a desktop experience.

### 4. Too many emergency override layers
Recent fixes added `good-times-overlay-safety.css` and `good-times-desktop.css`. These improved specific failures but the current goal is to **consolidate**, not add a third/fourth emergency override sheet.

## Required approach

### A. Reproduce visually first
Use a real browser (Playwright/Chromium is preferred) against the production app and/or a local production build.

Required viewport checks:
- 1440x900
- 1280x800
- 1024x768
- 430x932
- 390x844

Test both signed-out and signed-in states. Use an existing QA account or create an isolated QA identity; do not use real customer data for destructive tests.

### B. Inspect computed layout, not just source CSS
For every glitch, record the responsible computed selector/rule before changing it.

Specifically inspect:
- `.gt-premium-experience`
- `.gtlive-app`
- `.gtlive-scroll`
- `.gtlive-hero`
- `.gtlive-rail`
- `.gt-five-nav`
- `.gt-connect-fab`
- account launcher button
- tickets launcher button
- modal/backdrop layers

### C. Consolidate the CSS architecture
Preferred outcome:

1. **Mobile base** lives in `good-times-live.css`.
2. **Desktop responsive rules** live in one deliberate desktop section/file.
3. **Floating bridge controls** are never subject to app-shell sizing.
4. Remove redundant emergency overrides once their behavior is absorbed into the correct base layer.
5. Avoid selectors that target generic `> *`, arbitrary inline-style fragments, or nth-child rules for structural layout when a semantic class can be added instead.

Do not fix this with more broad `!important` rules unless there is no cleaner alternative.

### D. Desktop product target
Desktop should look intentionally designed—not like an iPhone app enlarged.

Desired composition:
- centered premium app canvas with sane max width, or a true desktop shell
- top bar spans the content frame cleanly
- hero has a controlled aspect ratio and meaningful copy placement
- no giant empty regions
- no card clipping or overlap
- no cards detached at far left/right edges
- four-card or three-card rows at desktop widths
- section headings align to the same content grid
- bottom mobile nav becomes a stable desktop dock/sidebar/header treatment
- Connect / Tickets / Account do not overlap navigation
- scroll container is singular and predictable

### E. Mobile must not regress
At <= 899px preserve the strong mobile experience:
- full-width phone layout
- horizontal rails where appropriate
- bottom navigation
- overlays fit viewport
- no desktop padding/max-width leaks

## Must-pass functional checks

### Home
- hero image visible
- hero title/copy/buttons visible
- Tonight/Next Up cards render in one coherent row
- Hot Places renders coherently
- category mosaic does not overlap adjacent sections
- Connect/Tickets/Account visible but not covering content

### Navigation
- Home
- Map
- Planner
- Calendar/Dates
- Vault
- switching tabs does not leave stale fixed layers over the next screen

### Planner
- Build and My Plans switcher does not become full-screen
- form controls fit desktop and mobile
- generated plan scrolls normally

### Explore
- search/filter/category grids align
- map modal/surface fills intended area without inheriting app-shell max-width

### Connect / Tickets / Account
- launchers remain button-sized
- opened surfaces are usable
- closed surfaces leave no invisible backdrop intercepting clicks

## Regression rules to add
Automated source/contract tests are useful but **not sufficient**. Add a Playwright visual/layout suite if possible.

Minimum assertions per viewport:
- main app bounding box width is within expected range
- hero bounding box does not overlap first content section
- no fixed launcher has width > 300px unless its dialog is open
- nav bounding box is within viewport
- first 4 event cards have non-overlapping rectangles
- document has only one primary vertical scrolling region
- no horizontal page overflow

Prefer screenshot snapshots for:
- signed-in Home desktop
- signed-in Home mobile
- Dates desktop
- Planner desktop
- Explore desktop
- Account open

## Existing data/backend truth
Do not assume an empty UI means empty data.

The production Atlanta API has returned current events/venues with `connected:true` and `degraded:false`. Supabase authentication has also been confirmed working for the owner account. The known failure is the presentation/composition layer unless browser evidence proves otherwise.

## Deployment discipline
Do not push a sequence of speculative production CSS commits.

1. reproduce locally/preview
2. fix in a branch
3. run unit/contract tests
4. run browser layout checks
5. inspect screenshots
6. only then merge to `main`
7. verify canonical production domain after alias updates

## Definition of done
This handoff is complete only when:

- desktop at 1440/1280/1024 looks intentionally designed
- mobile at 430/390 remains intact
- no overlapping/glitching fixed layers
- Home, Dates, Planner, Plans, Explore, Map, Vault, Connect, Tickets and Account are visually usable
- Playwright/browser checks pass
- final screenshots are captured for desktop and mobile
- exact files removed/consolidated are documented
- no claim of completion is made from CI alone

## Final return package
Return:

1. exact root causes found in computed styles/DOM
2. files changed
3. files removed or consolidated
4. before/after screenshots
5. viewport test results
6. any remaining visual defect
7. commit SHA ready for merge/deploy
