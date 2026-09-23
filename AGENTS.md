# AGENTS.md — GOOD TIMES Operating Contract

This is the mandatory source-of-truth entry point for every coding, product, data, design, and operating agent working on GOOD TIMES.

## REQUIRED READING BEFORE PROTECTED WORK

1. `AGENTS.md`
2. `docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md`
3. `docs/GOOD_TIMES_PRODUCTION_SOP.md`
4. `docs/GOOD_TIMES_SCREEN_CONTRACTS.md`
5. Relevant Golden Screen / current approved product reference

A coding agent may not reinterpret GOOD TIMES from a single ticket. The governance above persists across tasks.

## Current production authority

### Launch scope — non-negotiable
- **GOOD TIMES is launching publicly in Atlanta only.**
- Customer-facing city selectors, public navigation, launch reporting, editorial programming and readiness claims must expose Atlanta only until Dr. Dorsey explicitly expands scope.
- Future-city records may remain in the data warehouse for research and later expansion, but they are not live cities and must not leak into customer-facing launch surfaces.
- Do not “fix” Atlanta-only scope by re-enabling other cities from existing database inventory.

- Canonical consumer UI: `src/features/experience/GoodTimesCommandAppV4.jsx`
- Final visual authority: `src/features/experience/good-times-v4.css`
- Entry routing: `src/main.jsx`
- Legacy route remains `/legacy` only.
- Repository: `dolodorsey/good-times-app`
- Vercel project: `good-times-app`

## Protected UI contract

1. **Permanent bottom navigation is exactly Home / Discover / Plan / Saved / Profile.** Plan is the elevated center action. Never replace Plan with Radar, rename Saved to Vault in permanent navigation, or mutate order per screen.
2. **Radar is a feature/destination, not a permanent bottom-nav replacement.** Enter it from the bell, City Radar strip, Home modules, deep links, and Profile alert controls.
3. **The app shell must not break.** Content scrolls; primary bottom navigation stays anchored outside the scroll pane. Respect iOS/Android safe areas.
4. **Primary screen formula:** SCENE → PROMISE → INTELLIGENCE → DECISION → ACTION.
5. **No freestyle design.** Use protected theme/component rules. Do not introduce uncontrolled colors, typography, radii, spacing, gold usage, or ad-hoc card systems.
6. **Do not downgrade cinematic context.** GOOD TIMES must remain editorial, immersive, current, premium and human—not a generic directory with dark colors.
7. **Design regressions are product bugs.** If the change materially lowers visual hierarchy, image quality, navigation consistency, CTA clarity, responsiveness, or brand identity, it is not complete.

## Data / intelligence hard rules

1. **Explore remains taxonomy-driven.** Load active categories from `gt_taxonomy_categories`, subcategories from `gt_taxonomy_subcategories`, and places from `v_gt_venue_taxonomy_directory`. Emotional lanes such as Eat Well / Turn Up / Be There / Stay Right / Do More are the front door, not a replacement for the deep taxonomy.
2. **Build My Night is core.** Preserve natural-language Concierge plus guided/custom planning. It must build source-backed itineraries from current verified inventory.
3. **Never invent venue or event information.** Website, phone, image, date, venue, hours, price, ticket state, availability, category, and confirmation require source evidence or an approved deterministic rule.
4. **Never claim CONFIRMED/AVAILABLE/TICKETED without backing state.** Plan membership alone is not confirmation.
5. **Always normalize cities through the canonical city-normalization system.** Wrong-city inventory is P0.
6. **Do not use loose venue matching.** Automatic matches are reviewed aliases or one unique full normalized address. Street-number-only or ambiguous fuzzy matching is prohibited.
7. **Do not discard valid business inventory** to make quality metrics look clean. Career fairs, networking, mixers, real estate, finance, classes, community and professional programs remain valid taxonomy lanes. Noise filtering is limited to known spam/MLM/timeshare/make-money noise and true irrelevant inventory.
8. **Never commit credentials.** Supabase credential storage/reference paths remain the source of truth. Clients and agents receive references, never secret service-role values.
9. Removed GOOD TIMES providers may not be silently reintroduced: **Perplexity, Google Place Details, Apify, ScrapeGraph**.
10. **Rank experience before image.** Media quality is an explicit component only; an image path/uploader/curator/default fallback may not inflate underlying venue/event quality.
11. **Nearby is not the same as good.** Proximity contributes at most 5% to the canonical base score. SEO/search rank contributes 0%. Review-platform popularity is supporting evidence, not primary quality authority.
12. **Curator imagery is a candidate, not a default.** Verified real media wins when it truthfully represents the entity and meets quality/rights/crop requirements.
13. **Sourcing agents never publish directly.** Discovery → evidence → identity → verification → source authority/domain score → visual research → editorial/quality gate → publication → monitoring.
14. Do not revive the retired `khg_managed_agents` GOOD TIMES scheduler as the operating path.

## Canonical GOOD TIMES quality score

```text
Cultural relevance   25%
Experience quality   20%
Source authority     15%
Current momentum     15%
Visual quality       10%
Uniqueness           10%
Proximity              5%
------------------------
Total                100%
```

- SEO/search position: 0%.
- Review-platform popularity: metadata/evidence only.
- Personalization is applied after base quality qualification and may reorder qualified results; it may not rescue weak inventory.
- Unknown distance is neutral; never fabricate it.

## Visual research workflow

```text
verified entity/event
  ↓
collect eligible media candidates
  ├ official venue / artist / organizer
  ├ permitted editorial / press
  ├ verified ticketing media
  ├ verified creator / photographer
  ├ curator submission
  └ branded fallback only when necessary
  ↓
identity + rights + resolution + crop + recency + composition QA
  ↓
visual score
  ↓
best truthful candidate
  ↓
publish/review gate
```

Never use stock photography to impersonate a real venue/event when truthful verified media exists.

## Safe data changes

- Schema changes use Supabase migrations.
- Backfills run in transactions and must be idempotent.
- Preserve manually curated fields such as `is_khg`, `is_culture_pick`, `culture_tier`, and `khg_brand_key`.
- Never silently lower inventory/quality targets to make a scorecard appear complete.
- Never delete evidence when repairing/merging a record.
- Rejected media stays as evidence with a rejection reason; it does not silently return to candidate inventory.
- After persistent schema changes, run Supabase **security and performance advisors** and record disposition.

## Current architecture

```text
src/main.jsx
  └─ GoodTimesCommandAppV4.jsx             canonical consumer experience
       ├─ permanent Home / Discover / Plan / Saved / Profile nav
       ├─ Radar destination from City Radar/bell
       ├─ source-backed Venue/Event detail overlays
       ├─ Plan/Concierge + generated itinerary
       ├─ BuildMyNightPanel.jsx
       ├─ ExploreTaxonomyBrowser.jsx
       └─ good-times-v4.css                final protected visual authority

src/features/intelligence/client.js
  ├─ canonical events/venues
  ├─ Explore taxonomy/directory
  ├─ Concierge/profile/save APIs
  └─ product/taste events

api/good-times-intelligence.js
api/data-live.js
api/data-fast.js
```

## Protected release gates

A release cannot be considered complete until applicable P0/P1 gates in `docs/GOOD_TIMES_PRODUCTION_SOP.md` and `docs/GOOD_TIMES_SCREEN_CONTRACTS.md` pass.

At minimum before merge:

```bash
npm install --legacy-peer-deps
npm test
npm run build
```

Then:
- verify exact tested SHA on Vercel Preview is `READY`
- run UI/Golden Screen checks on protected screens
- run core journeys
- inspect Vercel runtime errors
- verify source/city/time/confirmation semantics
- run Supabase advisors when schema changed

After merge:
- wait for production Vercel deployment `READY`
- execute production smoke tests
- confirm no severe visual regression
- record release evidence
- only then mark `PRODUCTION VERIFIED`

## Status language

Do not use “Done” as proof.

```text
SPECIFIED
DESIGNED
BUILT
CONNECTED
QA PASSED
BETA VERIFIED
PRODUCTION DEPLOYED
PRODUCTION VERIFIED
```

## Session start

- Read governance docs.
- Confirm canonical app/repo/project.
- Inspect existing build/runtime health before broad expansion.
- Fix P0/P1 health failures before non-essential feature expansion.

## Session end

- Build/test the exact candidate commit.
- Confirm Vercel Preview/Production state as applicable.
- Check runtime errors.
- Check Supabase advisors after persistent schema changes.
- Record evidence and unresolved owners.
- Leave incomplete work behind a flag rather than exposing a lower-quality state.

**Last updated: September 23, 2026 — Atlanta-only launch scope + GOOD TIMES V4 Product/UI Constitution + Anti-Regression Production System.**
