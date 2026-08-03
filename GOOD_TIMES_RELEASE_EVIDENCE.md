# GOOD TIMES release evidence

## Product boundary

- GOOD TIMES remains a separate multi-city nightlife and events concierge brand.
- Customer identity and saved items stay in Supabase project `czocqfaovfpjweayniuw`.
- Curated venues, shows, city configuration, source operations, and application laws stay in project `dzlmtvodpyhetvektfuo`.
- The app uses the approved GOOD TIMES homescreen video, backgrounds, category art, flyers, logo, and gold/dark visual system from the portfolio graphics library.

## Verified foundation

- The current source pipeline contains 4,016 shows, including 759 active future shows.
- `gt_sourced_events` is healthy and was refreshed within three hours of this audit.
- Public event and venue queries continue to read only from the `gt_*` content tables.
- The customer feed no longer queries the orphan auth-database `events` table or stale `gt_city_events`; it renders current shows, daily events, venue happenings, sports, and active brand events.
- Authentication, profiles, and saved items continue to use the separate customer-facing database.
- Direct membership, concierge, trip, and group request routes retain validated server submissions.

## Upgrade evidence

- React upgraded to 19.2.8, Vite to 8.2.0, and Capacitor to 8.x.
- Production package audit reports zero known vulnerabilities.
- Supabase configuration and public read helpers moved out of the monolithic screen into `src/lib/supabase.js`, with environment-variable rotation support.
- Design tokens moved into `src/styles/tokens.js` without changing the gold/dark visual system.
- Sixteen request-validation, session, recovery, and database-boundary tests pass.
- Web production build passes.
- Capacitor iOS dependency sync passes and a no-signing iOS simulator build succeeds.

## Remaining gates

- Expand rendered-screen and browser-flow coverage across all nine tabs.
- Address the dormant `gt_artists` pipeline and retire or repair legacy `gt_city_events` usage without weakening the healthy `gt_shows` feed.
- Continue venue geocoding and freshness work; never overwrite owner-curated culture fields.
- Run Android compilation after a Java 21 runtime is installed or made available to the build environment.
- Produce signed iOS and Android release archives and complete store-review checks.
