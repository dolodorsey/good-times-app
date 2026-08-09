# GOOD TIMES — UI stabilization: evidence and acceptance pack

Branch: `claude/ui-stabilization-v2` (not merged to `main`)
Plan: `GOOD_TIMES_UI_9_OF_10_EXECUTION_PLAN.md`
Date: 2026-08-09

---

## Phase 8 — required evidence

### Before / after screenshots

`audit-evidence/phase0-baseline/` and `audit-evidence/phase8-final/`.

Both runs cover **1440x900, 1280x800, 1024x768, 430x932, 390x844**, in
**signed-out and signed-in** state, across landing, auth, Now, Dates, Build,
Plans, Explore, Vault, Connect, Tickets and Account — 60 screenshots plus a
`report.json` of measurements per run.

### Measured result

| | baseline | final |
|---|---|---|
| geometry violations (5 viewports x 2 states) | 9 | **0** |
| unreachable surfaces | 5 of 6 nav targets | **0** |
| visible navigation systems | 2 (one clipped, unreachable) | **1** |
| Tickets/Account overlap @1440 | 72px | **0** |
| `.gtlive-app` self-clipped content | 95px | **0** |
| topbar visible @1440x900 | no | **yes** |
| uncaught page errors | 0 | **0** |
| emergency override stylesheets | 3 | **2** |
| `npm run build` runs twice | fails | **passes** |

### Browser console summary

Zero page errors and zero uncaught exceptions at every viewport, both states.
Two console **warnings** remain in the signed-in state on every viewport
(non-fatal, not raised by layout code). The signed-out state is completely
clean. One run showed 6 warnings at 1280x800 rather than 2 — transient, from
upstream `/api` responses, not deterministic.

### Deleted / consolidated CSS

- **Deleted** `src/features/experience/good-times-overlay-safety.css` (43 lines)
  and its `<link>` from `index.html`. Its entire purpose was undoing
  `.gt-premium-experience > *`; that rule is now scoped at source.
- **Rewrote** the bare `.gt-premium-experience > *` shell rule (3 occurrences:
  base + 2 media queries) to exclude floating controls, using `:where()` so
  specificity is unchanged and no cascade order shifts.
- **Added** `src/features/experience/good-times-shell.css` — one annotated
  sheet carrying the shell tokens, the single-nav rule, the utility-row layout,
  hero legibility and the border/focus tokens.

Net stylesheet count: **10 → 10** (one deleted, one added). This is honest
rather than flattering: the plan asks for the emergency sheets to be reduced,
and `good-times-desktop.css` and `good-times-profile.css` still contain shell
overrides that duplicate each other. See "Not done".

---

## How this was measured

- Production build (`npm run build`) served from `dist/` by
  `scripts/serve-dist.mjs`, with `/api/*` proxied to production.
  `vercel dev` is unusable here: the `"/(.*)" -> /index.html` rewrite in
  `vercel.json` catches `/src/*`, `/gt-stabilizer.js` and
  `/gt-timezone-guard.js`, so every asset returns HTML and the app never boots.
- Chromium via Playwright. All figures are real `getBoundingClientRect` values.
- Signed-in uses an isolated QA identity
  (`gt.ui.qa+20260809@thegoodtimesworldwide.com`, auth id
  `94db7d26-70ff-489a-ab6c-3988fbf0d0c0`). No customer data was used.
  **Delete this account when the pass is accepted.**

---

## Defects found and fixed

### D1 — Two navigation systems, only one reachable

| | selector | position | z-index | rect @1440x900 | labels |
|---|---|---|---|---|---|
| visible | `.gt-five-nav` | fixed | 9100 | 720x72 @ y=786 | Home · Map · Planner · Calendar · Vault |
| dead | `.gtlive-nav` | in-flow | 90 | 1390x79 @ **y=939** | Now · Dates · Build · Plans · Explore · Vault |

`.gtlive-app` is `height:900px; overflow:hidden`, so its content box ends at
y=924. The in-flow nav began at y=939 — 95px *below* the bottom of its own
shell — and was clipped away. The two navs do not even share a label set.

Proof: in the baseline, `1440x900__signed-in__nav-explore.png` is
byte-identical to `nav-home.png`. Every automated nav click landed on a
clipped, invisible button, so no navigation occurred at all.

Source: `good-times-live.css:4` sets the mobile-first
`height:100dvh; max-width:540px; overflow:hidden` shell, then it is forced back
to viewport height by `good-times-profile.css:22,30` and
`good-times-desktop.css:30,211`.

### D2 — Content clipped behind floating chrome
The last ~116px of every rail sat under opaque chrome. Cards were sliced
through their artwork with the title never reachable.

### D3 — Floating controls overlapped
`Tickets x1256→1370 (z8500)` vs `Account x1298→1388 (z9250)`: 72px overlap,
Account covered the word "TICKETS". Three `position:fixed` elements with
hardcoded insets from three different stylesheets and no shared layout.

### D5 — Hero copy over raw event artwork
The hero background is the event's own flyer, upscaled and centre-cropped. The
veil faded to transparent at 72% across, so headline contrast depended on
whichever image the event supplied.

### D6 — The build was not idempotent
`npm run build` runs nine `apply-*.mjs` codemods that rewrite tracked source.
A second run died:

```
Error: Production release patch failed: media and fallback-plan helpers
Error: GOOD TIMES multi-city polish could not locate Black-Owned filter
```

Cause: applied-checks compared whole blocks, but later codemods edit lines that
earlier ones inserted — `apply-growth-personalization` rewrites `venues` to
`personalizedVenues` inside the exact line `apply-multicity-home-polish`
anchors on. Fixed by checking whether a patch's *added* lines are present.
Three consecutive builds now exit 0 and produce a byte-identical CSS bundle.

### D7 / D8 — Inconsistent card bounds, four gold-hairline opacities
Rail children sized off their own content; borders normalised to one token; a
visible `:focus-visible` ring added (keyboard focus was invisible on dark glass).

---

## Phase 7 — regression protection

`scripts/ui-geometry.test.mjs` renders the production build at all five
viewports, signed-out and signed-in, and asserts: no horizontal overflow, no
fixed control outside the viewport, no Tickets/Account or Connect/Tickets
intersection, exactly one visible nav, `.gtlive-app` does not clip its own
content, hero has positive area, no dialog wider than the viewport, no page
errors.

**The failure path is verified, not assumed.** Reintroducing the
Tickets/Account overlap by changing one offset takes the suite to 8 pass /
3 fail; restoring it returns 11 pass / 0 fail.

Worth recording: the first version asserted "exactly one visible nav" and that
assertion did **not** catch the two-nav regression, because the duplicate nav's
whole problem was that it rendered *outside* the viewport and so never counted
as visible. The `.gtlive-app` self-clipping check is the one that holds.

CI: `.github/workflows/ui-regression.yml` runs it on every PR and uploads all
screenshots as artifacts for 14 days. The suite skips rather than fails when no
browser or `GT_UI_BASE` is present, so `npm test` still runs anywhere. Signed-in
coverage needs a `GT_UI_QA_SESSION` repo secret.

---

## Not done — do not read this as 9/10

The scoring gate in Phase 8 has **not** been met. What remains:

- **Phase 1 is incomplete.** `good-times-desktop.css` (220 lines) and
  `good-times-profile.css` (124 lines) still contain competing shell overrides
  with `!important` on the same properties. Net sheet count is unchanged.
- **Phase 2**: desktop navigation is still a bottom dock, not a desktop
  navigation system. It is now opaque, gutter-aligned and inside a defined
  chrome band, but the plan asks for more than that.
- **Phase 3**: hero legibility and card bounds are fixed; the wider Home
  composition pass (quick actions, curated desktop rows, removing
  placeholder-looking imagery) is not done.
- **Phase 4**: per-surface loading / success / empty / error states for Dates,
  Build, Plans, Explore, Map, Vault, Connect, Tickets, Account — not started.
- **Phase 5**: the repeated-interaction matrix (city switching, 5x open/close
  of each overlay, slow network, orientation) has not been run.
- **Phase 6**: typography scale, 4/8px rhythm, radii and shadow normalisation
  beyond the border/focus token — not done.

### Known open defects

1. The desktop dock still overlaps the top edge of the first card rail at rest.
2. Home hero still uses raw event flyers as artwork; only the contrast is now
   guaranteed, the art direction is not.
3. Card titles in "Your starter picks" are still cropped.
4. Two console warnings in the signed-in state on every viewport.
5. `.gtlive-app` remains a fixed-height `overflow:hidden` box — the fix works
   around it rather than replacing it.
6. The Connect sheet at 1440x900 extends slightly past the viewport bottom
   (`max-height:88vh` measured against a taller offset).
