# AGENTS.md — AI Agent Instructions for Good Times App

> This file is read by Codex, Claude Code, Cursor, and other AI coding agents at the start of every session. It's the single source of truth for what an agent should do, not do, and how to verify its work.

---

## ⛔ HARD RULES — never violate these

1. **Never write to the legacy auth DB tables.** On `czocqfaovfpjweayniuw`, the `venues`, `events`, `experiences`, `bookings`, `concierge_requests`, `concierge_threads`, `concierge_messages`, `concierge_agent_requests` tables are orphaned. Reads are OK only for cleanup audits; writes are forbidden. The live content lives on `dzlmtvodpyhetvektfuo` in `gt_*` tables.

2. **Never bypass `gt_city_normalize()` for city values.** Any code that touches a city string (from feeds, user input, scrapers) MUST normalize before joins. The 11 canonical keys are: `atlanta`, `houston`, `miami`, `new_york`, `los_angeles`, `charlotte`, `dallas`, `washington_dc`, `phoenix`, `scottsdale`, `las_vegas`.

3. **Never use raw event_type strings** when inserting to `gt_shows`. The CHECK constraint allows only: `concert`, `comedy`, `festival`, `play`, `musical`, `sports`, `special_event`, `activation`, `nightlife`, `brunch`. Map raw values via the CASE block in `gt_promote_sourced_to_shows()`.

4. **Never set `gt_shows.venue_id`.** The FK points to a broken `gt_entertainment_venues` table. All current rows have NULL — keep it that way. Use `venue_name` (text) instead. Schema repair is TD-003, scheduled separately.

5. **Never delete app_laws.** The `gt_app_laws` table is governed by GT-043 (only Dr. Dorsey confirms done). Read freely. Do not INSERT/UPDATE/DELETE without explicit approval.

6. **Never commit secrets.** No `.env` files, no API keys in source. The current hardcoded keys in App.jsx are anon-only (RLS-protected) — replacing them with env vars is fine and encouraged.

7. **Never create a new repo for a feature that belongs in this one.** One app = one repo = one Vercel project. If the work is for the Good Times iOS/web app, it goes here.

---

## ✅ WHAT TO DO — defaults

### Before any code change
1. Read `README.md` in full.
2. Read this `AGENTS.md`.
3. Run `SELECT * FROM v_gt_data_health;` against `dzlmtvodpyhetvektfuo` to know the current state.
4. Check for existing tasks: `SELECT task_key, title, status FROM khg_master_tasks WHERE brand='good_times' AND status IN ('open','in_progress') ORDER BY priority DESC LIMIT 20;`

### When refactoring App.jsx
- Refactor in increments — extract one component or one screen per PR. Never one giant move.
- Keep public function signatures (`khgF`, `sbF`, `gtRandomBg`) until ALL callers are migrated, then deprecate.
- Preserve the gold/dark aesthetic. Color tokens live in `C` (line ~411). Move them to `src/styles/tokens.js` as a first step.
- Test each extraction by running `npm run build` AND `npm run dev` AND visiting all 9 screens before merging.

### When adding new features
- New screens → `src/screens/<Name>Tab.jsx`. Lazy-load if heavy.
- New shared UI → `src/components/<Component>.jsx`.
- New data calls → add to `src/lib/queries.js`. Never `fetch()` directly from a screen.
- New cities → must add to `gt_cities` table AND `CITY_OPTIONS` in App.jsx AND `gt_city_normalize()` function.

### When fixing data
- Use migrations for schema changes. Use the Supabase `apply_migration` tool, never inline DDL.
- For data backfills (UPDATE/INSERT), wrap in a transaction and write a dry-run first. Always log to `khg_master_tasks` when complete.
- Never silently overwrite columns Dr. Dorsey populated manually (e.g. `is_khg`, `is_culture_pick`, `culture_tier`, `khg_brand_key`).

---

## 🧭 ORIENTATION — the 5-minute tour

```
src/App.jsx (2,480 LOC) — the entire app
  ├─ Lines 1-50      : GT background image pool (CDN-hosted webp)
  ├─ Lines 52-79     : <GTSplashScreen> — intro video + progress
  ├─ Lines 80-166    : <GTLoadingOverlay>
  ├─ Lines 109-150   : Auth helpers (signup/signin/recover via auth DB)
  ├─ Lines 167-380   : <GoodTimesOnboarding> — 5-step wizard
  ├─ Lines 381-410   : <GoodTimesAuthGate> — session check + route to onboarding/app
  ├─ Lines 411-460   : Style tokens (C colors, F fonts, V button factory, K card)
  ├─ Lines 422-428   : Supabase clients (SB=auth DB, KHG_SB=content DB)
  ├─ Lines 432-455   : CAT_MAP — Explore category → gt_venues.category_key
  ├─ Lines 462-540   : Image pool maps (Pool 1-8, gt-bg distribution)
  ├─ Lines 540-660   : Static data: SectionHead, SponsorBanner, EventTile, EventGrid, EventRow, EventCard
  ├─ Lines 661-790   : Reusable: StarRating, ScrollWrap
  ├─ Lines 857+      : <GoodTimesApp> — the main 9-screen container with ~50 useState hooks
  └─ Lines 2400+     : Default export, theme injection
```

When in doubt, search for `screen===` to see how the active tab routes.

---

## 🔧 CODEX TASK CATALOG

When delegated work to Codex, hand it ONE of these prompts (don't combine, don't generalize):

### TASK 1: Extract style tokens
```
Goal: Move color tokens (C), font tokens (F), button factory (V), and card style (K) from src/App.jsx 
  into src/styles/tokens.js. Export named: COLORS, FONTS, btnStyle, cardStyle.
Update src/App.jsx to import from tokens.js. Do not change any visual output.
Verify: npm run build succeeds. Diff dist/ output before/after — should be byte-for-byte equivalent or 
  differ only in module ordering.
```

### TASK 2: Extract Supabase clients into lib/
```
Goal: Move SB, SK, KHG_SB, KHG_SK, sbF(), khgF() from src/App.jsx into src/lib/supabase.js.
Replace hardcoded URLs/keys with import.meta.env.VITE_GT_SUPABASE_URL etc.
Add a .env.example with all 4 vars listed.
Update src/App.jsx imports. Do not change any callsite logic.
Verify: npm run dev still loads, login still works, venue/show data still appears.
```

### TASK 3: Extract <EventCard> family
```
Goal: Move EventTile, EventGrid, EventRow, EventCard, SectionHead, SponsorBanner, StarRating, 
  ScrollWrap into src/components/<Name>.jsx files (one per file). Use named exports.
Update src/App.jsx to import them. Use barrel export src/components/index.js for cleanliness.
Verify: Now, Explore, Vault, Calendar tabs all render unchanged.
```

### TASK 4: Extract <NowTab>
```
Goal: Take the JSX block currently rendered when screen === "now" and move it to 
  src/screens/NowTab.jsx as a default export <NowTab/>.
Pass needed state down via props (city, events, loading, onSelect, onSave, etc.) — do not pull from 
  shared context yet.
Update src/App.jsx to render <NowTab {...props}/> when screen === "now".
Verify: Now tab still loads venues/events for current city, sponsor banner appears, search works.
```

### TASK 5: Add Vitest smoke tests
```
Goal: Install vitest + @testing-library/react. Add tests under tests/ for:
  - src/lib/supabase.js: clients are configured from env vars
  - src/components/EventCard.jsx: renders an event with name, date, image
  - src/data/cities.js: CITY_OPTIONS contains exactly 11 entries with expected ids
Add `npm test` script to package.json. Tests must pass on a clean clone.
```

### TASK 6: Geocode missing venues
```
Goal: Write a Node script (scripts/geocode_venues.js) that:
  - Connects to KHG Supabase using SUPABASE_SERVICE_ROLE_KEY
  - Queries gt_venues WHERE latitude IS NULL AND address IS NOT NULL (~437 rows)
  - Calls Google Geocoding API one row at a time (rate limit 50 req/sec)
  - Updates latitude, longitude, neighborhood
Log each call. Idempotent: rerun-safe.
Verify: After running once, SELECT COUNT(*) FROM gt_venues WHERE latitude IS NULL drops by 80%+.
```

---

## 📊 OPERATIONAL HEALTH

### Scheduled jobs (pg_cron on dzlmtvodpyhetvektfuo)
| jobid | Schedule | Command | Purpose |
|---|---|---|---|
| 69-78 | Daily 9-18 UTC | `run_gt_city_sourcer_v2('<city>')` | Per-city Perplexity intake → `gt_sourced_events` |
| 134 | Every 6h at :15 | `gt_promote_sourced_to_shows(NULL, false, 1000)` | Promote sourced events to `gt_shows` |

### Health alerts to watch
- `v_gt_data_health` showing CRITICAL on `gt_shows` → promotion job failed; check `cron.job_run_details`.
- `gt_sourced_events` count not increasing day-over-day → city sourcer broken; check Perplexity API credit.
- `gt_artists` permanently CRITICAL → known issue (TD-007), no agent exists yet.

### Where things break (and what to do)
| Symptom | Root cause | Fix |
|---|---|---|
| App shows "Atlanta only" / no events for other cities | Promotion job not running | `SELECT * FROM gt_promote_sourced_to_shows(NULL, false, 1000);` |
| Map tab shows venues without pins | `gt_venues.latitude` NULL | Geocode (TASK 6) |
| Career fair / job fair junk in Now tab | Noise filter not aggressive enough | Add patterns to `v_noise_patterns` array in promotion function |
| Auth flow broken | GT auth DB issue | Check `czocqfaovfpjweayniuw` advisors; verify `gt_user_profiles` RLS |
| iOS build fails on Codemagic | Usually CocoaPods or signing | Check codemagic.yaml, re-run pod install in `ios/App` |

---

## 🔐 SECRETS & CREDENTIALS

Never commit. The `credentials` table on KHG main DB is the source of truth:
```sql
SELECT credential_key, credential_value FROM credentials 
WHERE credential_key ILIKE '%<service>%' AND is_active = true;
```

For local dev, mirror needed values into `.env` (which is gitignored). Never push `.env`.

Standing convention from KHG ops:
- iMessage = Mac watcher (never named in deliverables)
- GHL sends = direct PIT API (not n8n)
- Email approval gate = ALL emails go through `email_approval_queue`

---

## 📝 SESSION CHECKLIST (run at start)

```sql
-- 1. Latest handoff
SELECT * FROM v_latest_handoff;

-- 2. Active GT tasks
SELECT task_key, title, priority, status FROM khg_master_tasks 
WHERE brand='good_times' AND status IN ('open','in_progress','blocked')
ORDER BY priority DESC, created_at DESC LIMIT 20;

-- 3. Pipeline health
SELECT * FROM v_gt_data_health;

-- 4. Last cron runs
SELECT jobid, jobname, status, return_message, start_time
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE command ILIKE '%gt%')
ORDER BY start_time DESC LIMIT 10;
```

If anything is CRITICAL → fix it before starting feature work.

---

## 🚦 SESSION CHECKLIST (run at end)

```sql
-- Log a handoff
INSERT INTO khg_session_handoffs (session_summary, key_decisions, next_steps, brand)
VALUES ('<what you did>', '<decisions made>', '<what should happen next>', 'good_times');

-- Mark completed tasks
UPDATE khg_master_tasks SET status='completed', last_completed_at=NOW() 
WHERE task_key IN ('TASK-...', 'TASK-...');
```

---

**Last updated:** 2026-05-06 by Claude (during data pipeline revival sprint).
