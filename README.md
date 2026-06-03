# Good Times™ — City Nightlife & Events Concierge

Live: [thegoodtimesworldwide.com](https://thegoodtimesworldwide.com)
iOS bundle: `com.kollective.goodtimes`
Web prod: `good-times-app.vercel.app`

---

## What this app does

Good Times is a multi-city nightlife & events concierge. Users pick a city, browse what's happening tonight or this week across categories (dining, nightlife, music, sports, etc.), save favorites, build multi-stop plans, and get pushed updates on new drops.

Currently shipping iOS (Capacitor) and web. Active cities: Atlanta, Houston, Miami, NYC, LA, Charlotte, Dallas, DC, Phoenix, Scottsdale, Las Vegas.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 (no SSR, no router lib — single SPA) |
| Mobile shell | Capacitor 6 (iOS only currently) |
| Backend | Two Supabase projects (see Architecture below) |
| Hosting | Vercel (web), Codemagic + GitHub Actions (iOS) |
| CDN | Supabase Storage public buckets |
| CI | `.github/workflows/ios-build.yml` + `codemagic.yaml` |

---

## Architecture

The app reads from **two separate Supabase projects** by design:

### 1. GT Auth/Users DB — `czocqfaovfpjweayniuw`
"GOOD TIMES" Supabase project. Holds:
- `gt_user_profiles` — auth-linked user records
- `gt_saved_items` — user favorites (events, venues)
- Auth flows (signup, password reset)

The `venues`, `events`, `experiences`, `bookings`, `concierge_requests` tables in this DB are **legacy/orphaned**. Do not write to them. They are scheduled for cleanup.

### 2. KHG Main DB — `dzlmtvodpyhetvektfuo`
"MCP Gateway" Supabase project (the KHG enterprise hub). Holds the live content the app renders:
- `gt_venues` (2,200+ venues across 11 cities) — the heart of the Map and Explore tabs
- `gt_shows` (1,400+ events) — Calendar, Now, and Dates tabs
- `gt_cities` — city-level config
- `gt_app_laws` — runtime QA rules
- `gt_sourced_events` — raw intake from Perplexity/Eventbrite (NOT shown directly; promoted into `gt_shows` every 6h via `gt_promote_sourced_to_shows()`)
- 70+ other `gt_*` tables for sourcing agents, content references, image QA, etc.

**Why two DBs?** GT auth is a customer-facing public DB with PII. KHG main is the internal enterprise hub. They never share auth identities — joining is done client-side (e.g. user profile from one, saved venue list from the other).

### Data flow (high level)
```
[Perplexity Scout cron] ──► gt_sourced_events  ──┐
                                                 │
[GHL/Eventbrite scrapers] ──► gt_sourced_events ─┤
                                                 │
                                                 ▼
                              gt_promote_sourced_to_shows() (cron, every 6h)
                                                 │
                                                 ▼
                                            gt_shows  ──► App fetches → user sees
```

---

## Local development

### Prerequisites
- Node 18+
- Xcode 15+ (for iOS builds only)
- CocoaPods (`brew install cocoapods`)

### Setup
```bash
git clone https://github.com/dolodorsey/good-times-app.git
cd good-times-app
npm install
cp .env.example .env  # then fill in Supabase keys
npm run dev           # http://localhost:5173
```

### Build for production (web)
```bash
npm run build         # outputs to dist/
```

### Build for iOS
```bash
npm run ios:build     # builds web + syncs Capacitor
npm run ios:open      # opens Xcode
```

---

## Environment variables

Currently, Supabase URLs and anon keys are **hardcoded** in `src/App.jsx` (lines ~109, 422, 426). This is a known tech debt item — see the Refactor Plan section.

When migrating to env vars, use `import.meta.env.VITE_*`:
```
VITE_GT_SUPABASE_URL=https://czocqfaovfpjweayniuw.supabase.co
VITE_GT_SUPABASE_ANON_KEY=eyJhbGciOiJ...
VITE_KHG_SUPABASE_URL=https://dzlmtvodpyhetvektfuo.supabase.co
VITE_KHG_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

Anon keys are RLS-protected and OK to ship in the bundle — but using env vars enables rotation without redeploys.

---

## File structure

```
src/
  App.jsx           ⚠️ 2,480 lines — single-file monolith. Refactor planned (see RFC-001).
  main.jsx          Entry point
  native.js         Capacitor bridge (iOS plugins)

components/
  KHGForms.jsx              Form rendering for partner applications
  forms/KHGFormsGrid.jsx    Form picker UI
  forms/KHGFormModal.jsx    Form submit modal

app/api/forms/      Vercel serverless API for form submissions
lib/forms-config.js Form definitions

ios/                Capacitor iOS project (Xcode workspace)
public/             Static assets, brand logos, OG images
```

---

## Database conventions

### City keys (canonical, snake_case)
`atlanta` · `houston` · `miami` · `new_york` · `los_angeles` · `charlotte` · `dallas` · `washington_dc` · `phoenix` · `scottsdale` · `las_vegas`

External feeds may use any case ("ATL", "Atlanta", "atl"). The DB function `gt_city_normalize(text)` handles all normalization. Always run incoming city values through it.

### Event types (gt_shows.event_type CHECK constraint)
`concert` · `comedy` · `festival` · `play` · `musical` · `sports` · `special_event` · `activation` · `nightlife` · `brunch`

### Venue categories (gt_venues.category_key)
See `CAT_MAP` in `src/App.jsx` ~line 432 for the full mapping.

### Health monitoring
```sql
SELECT * FROM v_gt_data_health;
```
Returns HEALTHY (<24h) / SLOW (<72h) / STALE (<7d) / CRITICAL (>7d) per critical table.

---

## Deployment

### Web
Push to `main` → Vercel auto-deploys to production. Branch deploys are previews.
- Vercel project: `prj_XScizxpsIoCggXakSla6dNGfjr01`
- Vercel team: `team_TbL7iJTpBTe3gF5TwBLAzSbV`

### iOS
Push to `main` → Codemagic auto-builds, signs, uploads to TestFlight.
- App Store Connect ID: 6752312555
- Bundle: `com.kollective.goodtimes`
- Current build: 16

---

## Refactor Plan (RFC-001)

The current `src/App.jsx` is a 2,480-line monolith with ~50 useState hooks across 9 screens. Planned split:

```
src/
  screens/
    NowTab.jsx          (~250 LOC)
    ExploreTab.jsx      (~300 LOC)
    MapTab.jsx          (~250 LOC)
    PlansTab.jsx        (~200 LOC)
    CalendarTab.jsx     (~250 LOC)
    DatesTab.jsx        (~150 LOC)
    BuildMyNight.jsx    (~200 LOC)
    VaultTab.jsx        (~150 LOC)
    DetailScreen.jsx    (~250 LOC)
  components/
    EventCard.jsx
    EventGrid.jsx
    EventRow.jsx
    SectionHead.jsx
    MiniHeader.jsx
    SponsorBanner.jsx
    StarRating.jsx
    CitySheet.jsx
    LegalModal.jsx
  lib/
    supabase.js         (env-driven clients)
    queries.js          (all DB calls in one place)
    auth.js             (signup, signin, recover, profile)
    haptics.js          (Capacitor wrappers)
  data/
    cities.js
    categories.js
    backgrounds.js      (gt-bg pool definitions)
    images.js           (CAT_MAP, BRAND_IMAGES)
  styles/
    tokens.js           (colors C, typography F)
```

See [AGENTS.md](./AGENTS.md) for guidance on which Codex prompts produce which outputs.

---

## Known issues / tech debt

| ID | Issue | Severity |
|---|---|---|
| TD-001 | App.jsx is 2,480 LOC monolith | High |
| TD-002 | Supabase URLs/keys hardcoded (not env vars) | Medium |
| TD-003 | `gt_shows.venue_id` FK points at orphaned `gt_entertainment_venues` table; all rows have NULL venue_id | Medium |
| TD-004 | 4 RLS-disabled tables on GT auth DB (`spatial_ref_sys`, `event_sync_logs`, `source_posts`, `sources`) | High |
| TD-005 | 1,019 venues missing `instagram_handle`; 437 missing GPS; 514 missing address | Medium |
| TD-006 | No tests (no Vitest, no Playwright) | High |
| TD-007 | `gt_artists` is 42 days stale (no refresh workflow exists) | Medium |
| TD-008 | `gt_city_events` is 7+ days stale (intake exists but is broken) | Medium |
| TD-009 | Las Vegas was missing from CITY_OPTIONS in App.jsx (FIXED) | — |

---

## Useful queries

```sql
-- Health snapshot
SELECT * FROM v_gt_data_health;

-- Manually run promotion (normally cron does this every 6h)
SELECT * FROM gt_promote_sourced_to_shows(NULL, false, 1000);

-- Dry run promotion for one city
SELECT * FROM gt_promote_sourced_to_shows('atlanta', true, 100);

-- Active sourcer cron jobs
SELECT jobid, schedule, command, active 
FROM cron.job 
WHERE command ILIKE '%gt%' 
ORDER BY schedule;

-- Future shows by city
SELECT city_key, COUNT(*) FILTER (WHERE show_date >= CURRENT_DATE) future
FROM gt_shows GROUP BY city_key ORDER BY future DESC;
```

---

## Contact

- Owner: Dr. Dorsey (`thedoctordorsey@gmail.com`)
- Support: `hello@thegoodtimesworldwide.com`
- Privacy: [thegoodtimesworldwide.com/privacy.html](https://thegoodtimesworldwide.com/privacy.html)

© 2026 Good Times Worldwide. All rights reserved.
