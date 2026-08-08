# GOOD TIMES release evidence

## Product boundary

- GOOD TIMES remains a separate multi-city nightlife, lifestyle, events, discovery, and concierge brand.
- Customer identity, preferences, taste signals, saves, recommendation sessions, and customer transactions stay in Supabase project `czocqfaovfpjweayniuw`.
- Curated venues, shows, city configuration, source operations, rankings, and application laws stay in project `dzlmtvodpyhetvektfuo`.
- The app uses the approved GOOD TIMES homescreen video, backgrounds, category art, flyers, logo, and gold/dark visual system from the portfolio graphics library.

## Verified foundation

- Production inventory currently contains 6,522 shows, including 2,863 future confirmed/tentative shows.
- The sourced-event plane contains 2,840 future published events.
- The canonical venue plane contains 1,665 active venues.
- Public event and venue queries read only from the canonical `gt_*` content tables; customer identity remains isolated in the GOOD TIMES customer project.
- Authentication, profiles, saved items, direct membership, concierge, trip, and group request routes retain validated server submissions.
- Vercel production is serving the canonical GOOD TIMES customer-ready inventory endpoint without a degraded flag for the repaired launch cities.

## 2026-08-08 multi-city repair

Atlanta was already healthy and remains the benchmark city. The repair was scoped to Houston, Los Angeles, Miami, Charlotte, Washington DC, Dallas, New York, Phoenix, Scottsdale, and Las Vegas.

- Replaced the legacy non-Atlanta sourcer path that only queued work into an obsolete queue with direct Eventbrite refresh jobs.
- Deployed `gt-multicity-eventbrite-refresh` v2 with an explicit ten-city allowlist and an explicit Atlanta rejection guard.
- The v2 collector validates physical metro location, rejects virtual/out-of-region/cancelled events, upserts canonical sourced events, promotes them into shows, and never calls the Atlanta ranking worker.
- A hidden Atlanta-only ranking dependency was discovered during the repair and removed from the multi-city collector so future runs are isolated.
- Populated the previously empty `gt_sourcing_schedule` for the ten non-Atlanta launch cities.
- Re-enabled Dallas and Las Vegas city agents and created missing New York, Phoenix, and Scottsdale city-agent records.
- Added staggered four-hour direct event refresh schedules and six-hour direct venue website rechecks.
- Added reconciliation, direct-source qualification, noise cleanup, customer-priority, and consumer-lifestyle classification jobs.
- Customer qualification requires a physical venue, image, ticket/action, supported lifestyle taxonomy, and either verified venue trust or machine-qualified consumer event signals. Conference, workshop, webinar, career, networking, and similar noise is suppressed.
- Added direct venue website revalidation so stale venue records are only marked fresh after a real website responds.
- Seeded customer-ready Las Vegas anchor venues from official venue/operator sources rather than lowering public RLS requirements.

## Current city readiness

All 11 launch-city readiness rows are `healthy`.

| City | Active venues | Upcoming events | Event age | Venue age |
| --- | ---: | ---: | ---: | ---: |
| Atlanta | 848 | 2,304 | 0.2h | 2.1d |
| Charlotte | 82 | 42 | 0.0h | 0.0d |
| Dallas | 66 | 38 | 0.0h | 0.0d |
| Houston | 143 | 39 | 0.0h | 0.0d |
| Las Vegas | 24 | 27 | 0.0h | 0.0d |
| Los Angeles | 86 | 121 | 0.0h | 0.0d |
| Miami | 123 | 37 | 0.0h | 0.0d |
| New York | 97 | 55 | 0.0h | 0.0d |
| Phoenix | 57 | 44 | 0.0h | 0.0d |
| Scottsdale | 49 | 58 | 0.0h | 0.0d |
| Washington DC | 90 | 98 | 0.0h | 0.0d |

## Production hardening

- React is on 19.2.8, Vite on 8.2.0, and Capacitor on 8.x.
- Production builds run validation tests before Vite output is produced.
- Supabase configuration and public read helpers live outside the legacy monolithic screen in `src/lib/supabase.js`.
- Customer-database public execution of the unused `gt_public_product_scorecard(integer)` SECURITY DEFINER RPC was removed.
- Anonymous/authenticated table privileges on `public.spatial_ref_sys` were removed rather than blindly enabling RLS and risking PostGIS breakage.
- Public execution of `st_estimatedextent` SECURITY DEFINER helpers was removed.
- Advisor-confirmed duplicate indexes were removed and covering indexes were added on active concierge, agent-run, and recommendation-session paths.
- The app-specific scorecard SECURITY DEFINER warning is cleared. PostGIS placement and leaked-password protection remain platform-level hardening items.

## Remaining release gates

- Expand authenticated rendered-screen/browser-flow coverage across all customer tabs and critical paths, including onboarding, city switching, Explore, Map, Calendar, Plan For Me, Concierge, save/share, booking actions, and account flows.
- Continue improving recommendation-session and save usage so personalization is proven by real customer behavior, not only infrastructure.
- Continue venue enrichment without overwriting owner-curated culture fields.
- Enable Supabase Auth leaked-password protection through the project Auth configuration surface.
- Complete signed iOS and Android production archives and store-review checks.
