# GOOD TIMES — UI Stabilization: Phase 0 evidence + Phase 1/2 progress

Branch: `claude/ui-stabilization-v2`
Plan: `GOOD_TIMES_UI_9_OF_10_EXECUTION_PLAN.md`
Date: 2026-08-09

## How this was measured

- Production build (`npm run build`) served locally from `dist/` with `/api/*`
  proxied to `https://thegoodtimesworldwide.com` (local has no serverless
  runtime). `vercel dev` is unusable here: the `"/(.*)" -> /index.html` rewrite
  in `vercel.json` catches `/src/*`, `/gt-stabilizer.js` and
  `/gt-timezone-guard.js`, so every asset returns HTML and the app never boots.
- Chromium via Playwright, real rendered DOM, `getBoundingClientRect` values.
- Viewports: 1440x900, 1280x800, 1024x768, 430x932, 390x844.
- Signed-out and signed-in. Signed-in uses an isolated QA identity
  (`gt.ui.qa+20260809@thegoodtimesworldwide.com`, auth id
  `94db7d26-70ff-489a-ab6c-3988fbf0d0c0`) created for this pass — no customer
  data was used. **Delete this account when the pass is accepted.**
- Evidence: `audit-evidence/phase0-baseline/` and `audit-evidence/phase2-after/`
  (60 screenshots + `report.json` per run).

## Phase 0 — defects with their responsible selector

### D1 — Two navigation systems, only one reachable  *(fixed)*

| | selector | position | z-index | rect @1440x900 | labels |
|---|---|---|---|---|---|
| visible | `.gt-five-nav` | fixed | 9100 | 720x72 @ y=786 | Home · Map · Planner · Calendar · Vault |
| dead | `.gtlive-nav` | in-flow | 90 | 1390x79 @ **y=939** | Now · Dates · Build · Plans · Explore · Vault |

`.gtlive-app` is `height:900px; overflow:hidden`, so its content box ends at
y=924. The in-flow nav began at y=939 — 95px *below* the bottom of its own
shell — and was clipped away entirely. The two navs do not even share a label
set.

Proof: in the baseline run, `1440x900__signed-in__nav-explore.png` is
byte-identical to `nav-home.png`. Every automated nav click landed on a
clipped, invisible button, so no navigation occurred at all.

Root rule: `good-times-live.css:4` —
`.gtlive-app{height:100dvh;max-width:540px;overflow:hidden}` (mobile-first
shell), then forced to viewport height again by three separate `!important`
overrides:
- `good-times-profile.css:22` and `:30`
- `good-times-desktop.css:30` and `:211`

### D2 — Content clipped behind floating chrome  *(fixed)*

`.gtlive-scroll` (the only scrolling surface, `flex:1; overflow-y:auto`, 747px)
sits under `.gt-five-nav` and three fixed pills. The last ~116px of every rail
was permanently under opaque chrome — the "Your starter picks" cards were
sliced through the middle of their artwork with the title never reachable.

### D3 — Floating controls overlapped  *(fixed)*

Measured at 1440x900:

```
Tickets   x 1256 → 1370   z-index 8500
Account   x 1298 → 1388   z-index 9250
```

72px of overlap; Account won on z-index and covered the word "TICKETS".
Cause: three independently `position:fixed` elements, each with a hardcoded
inset set from a different stylesheet (`good-times-connect.css:1`,
`good-times-desktop.css:190`, `good-times-overlay-safety.css:5`). No shared
layout, so any width change re-broke them.

### D4 — Desktop navigation is a mobile dock  *(partially addressed)*

`.gt-five-nav` is a centered floating pill island. The plan requires "a desktop
navigation system, not a mobile dock enlarged on screen". It is now a
gutter-aligned opaque bar inside a defined bottom chrome band, but it is still
a bottom dock, not a desktop nav. **Not finished.**

### D5 — Hero uses raw event artwork  *(not addressed)*

The hero background is the event's own promotional flyer, upscaled and
center-cropped, so giant partial letters ("MARKET!", "12PM") sit behind the
`<h1>`. Plan Phase 3 requires the hero never overlap unsafe image regions.

### D6 — The build is not idempotent  *(reported, not fixed)*

`npm run build` runs nine `apply-*.mjs` codemods that rewrite tracked source
before `vite build`. Running it twice fails:

```
Error: Production release patch failed: media and fallback-plan helpers
    at scripts/apply-production-release.mjs:7
```

A clean build mutates `api/data.js`, `public/sitemap.xml`,
`GoodTimesLiveApp.jsx`, `GoodTimesPaymentsLauncher.jsx` and generates
`public/guides/`, `public/llms.txt`. This is the mechanism behind the
patch-on-patch CSS the plan describes: each pass bolts more on. Any local
iteration requires `git checkout` of those paths between builds. This should be
fixed before Phase 1 can genuinely "collapse the stack" — otherwise the
codemods will re-inject what gets removed.

## What changed

One new file, `src/features/experience/good-times-shell.css`, imported last
from `main.jsx`. Every rule is annotated with the measurement that justifies it.
It removes the duplicate nav, gives the scroll region clearance, and derives
the three utility pills' positions from one another so they cannot overlap.

### Result

| | baseline | after |
|---|---|---|
| geometry violations (5 viewports x 2 states) | 9 | 0 |
| reachable nav systems | 1 of 2 | 1 of 1 |
| Tickets/Account overlap | 72px | 0 |
| topbar visible at 1440x900 | no | yes |
| page errors | 0 | 0 |

The topbar (logo, "LIVE CITY CONCIERGE", city selector) was previously pushed
out of the clipped shell entirely and is now visible — that was a side effect
of reclaiming the 95px of overflow.

## Not done

Phases 1 and 2 are partially complete; Phases 3–8 are not started.

- **Phase 1**: the consolidating sheet exists, but the superseded rules in
  `good-times-overlay-safety.css`, `good-times-desktop.css` and
  `good-times-profile.css` have **not** been deleted, and the sheet count has
  gone up by one, not down. The plan's exit criteria explicitly require removing
  the broad behaviour at source. Blocked in practice by D6.
- **Phase 2**: desktop navigation is still a dock (D4).
- **Phase 3–6**: Home composition, per-surface loading/empty/error states,
  interaction matrix, and the polish pass are untouched.
- **Phase 7**: no Playwright visual-regression tests committed. The harness used
  here lives outside the repo in `~/.khg/gt-audit-tools/` and should be moved in
  and wired to CI as `scripts/ui-*.test.mjs`.
- **Phase 8**: no acceptance review.

## Known open defects

1. The desktop dock still overlaps the top edge of the first card rail at rest.
2. Hero art direction (D5).
3. Card heights in "Your starter picks" are inconsistent and titles are cropped.
4. Two console warnings remain in the signed-in state on every viewport.
5. `.gtlive-app` remains a fixed-height `overflow:hidden` box; the fix worked
   around it rather than replacing it.
