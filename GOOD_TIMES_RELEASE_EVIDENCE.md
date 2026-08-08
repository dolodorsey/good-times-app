# GOOD TIMES release evidence

## Product boundary

- GOOD TIMES remains a separate multi-city nightlife, lifestyle, events, discovery, and concierge brand.
- Customer identity, preferences, taste signals, saves, recommendation sessions, and customer transactions stay in Supabase project `czocqfaovfpjweayniuw`.
- Curated venues, shows, city configuration, source operations, rankings, and application laws stay in project `dzlmtvodpyhetvektfuo`.
- The app uses the approved GOOD TIMES homescreen video, backgrounds, category art, flyers, logo, and gold/dark visual system from the portfolio graphics library.

## Verified foundation

- Production inventory contains 6,522 shows, including 2,863 future confirmed/tentative shows.
- The sourced-event plane contains 2,840 future published events.
- The canonical venue plane contains 1,665 active venues.
- Public event and venue queries read only from the canonical `gt_*` content tables; customer identity remains isolated in the GOOD TIMES customer project.
- Authentication, profiles, saved items, direct membership, concierge, trip, and group request routes retain validated server submissions.
- Vercel production serves the canonical GOOD TIMES customer-ready inventory endpoint without a degraded flag for the repaired launch cities.

## 2026-08-08 multi-city repair

The stale-city repair covers Houston, Los Angeles, Miami, Charlotte, Washington DC, Dallas, New York, Phoenix, Scottsdale, and Las Vegas.

- Replaced the legacy non-Atlanta sourcer path that only queued work into an obsolete queue with direct Eventbrite refresh jobs.
- Deployed `gt-multicity-eventbrite-refresh` v2 with an explicit ten-city allowlist and an explicit Atlanta rejection guard.
- The v2 collector validates physical metro location, rejects virtual/out-of-region/cancelled events, upserts canonical sourced events, promotes them into shows, and never calls the Atlanta ranking worker.
- A hidden Atlanta-only ranking dependency was discovered during the repair and removed from the multi-city collector so future multi-city runs are isolated.
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

## Atlanta refinement pass

Atlanta was healthy, but a separate customer-surface pass identified two quality issues: future headliners could outrank strong same-day inventory, and hundreds of venues reused a small set of generic stock photos.

- Atlanta had 238 valid current-day events during the repair, 229 customer-ready, and 842 within the next seven days.
- Added an Atlanta urgency ranking layer to the public inventory API: current-day events rank first, then the next seven days, then later events; existing GOOD TIMES quality scoring remains the tiebreaker inside each time window.
- Updated the signed-in home hero to use the same current-day/next-seven-days preference after personalization ranking.
- Added deterministic GOOD TIMES scene fallbacks for repeated generic venue stock images instead of showing the same photograph across hundreds of venue cards.
- The Atlanta polish is included in web, iOS, and Android build commands.

## Authenticated customer QA + personalization proof

A controlled GOOD TIMES QA identity was exercised against the production customer project under authenticated RLS rather than service-role bypasses.

Verified customer-state sequence:

1. Profile and preference update.
2. Atlanta → Houston → Atlanta city switching.
3. Event and venue product activity.
4. Event and venue saves into Vault.
5. Taste-signal creation.
6. Itinerary creation through the plan flow.
7. Ticket-click and reservation-click conversion signals.
8. Authenticated read-back of saved/planned/recommendation state.

The QA run produced:

- 2 saved items.
- 4 taste signals.
- 5 product events.
- 1 itinerary.
- 1 recommendation session.

The recommendation architecture was also repaired so a successfully persisted AI itinerary automatically creates an auditable `gt_recommendation_sessions` row. That closes the prior state where the recommendation infrastructure existed but session evidence remained zero.

Current customer-project evidence as of 2026-08-08:

- GOOD TIMES customer profiles: 14
- Taste signals: 33
- Saved items: 2
- Recommendation sessions: 1

This is enough to prove the save → learn → plan → conversion → recommendation-session loop technically. It is not yet enough real-customer volume to judge recommendation quality statistically.

## Account deletion + privacy review gate

GOOD TIMES now has an App Store-compatible self-service deletion path.

- Added a visible signed-in `Account` center to the production member shell.
- Account center exposes sign out, Privacy Policy, Support & Privacy Choices, and `Delete account permanently`.
- Deletion requires explicit confirmation.
- The authenticated client calls the protected Supabase `delete-account` Edge Function with the user's bearer token.
- `delete-account` v4 purges the current GOOD TIMES customer footprint before deleting the Auth identity, including saves, profile, taste signals, recommendation history, product events, intelligence profiles, experiment assignments, itineraries, concierge records, bookings/loyalty, push tokens, and customer/agent records tied to the user.
- If an application-data purge fails, the function does not delete the Auth identity, avoiding a stranded partially deleted account.
- Production Privacy Policy is live at `/privacy.html` on `thegoodtimesworldwide.com` and returns HTTP 200.
- Production Support & Privacy Choices is live at `/support.html` on `thegoodtimesworldwide.com` and returns HTTP 200.
- The App Store listing document now points to those production endpoints.

## Production verification

Current automated regression suite: **57/57 passing, 0 failures**.

The suite now locks:

- authenticated GOOD TIMES member routing;
- Now / Dates / Build / Plans / Explore / Vault navigation contracts;
- authenticated city switching;
- Vault save/unsave;
- taste/product learning signals;
- ticket/reservation conversion signals;
- itinerary recommendation-session capture;
- plan sharing/directions and ticket Vault behavior;
- visible Account center and secure self-service deletion;
- public privacy/support review endpoints;
- content freshness, taxonomy, deduplication, auth/session behavior, data-boundary isolation, and production fallback behavior.

The full Vite production build passes after the regression suite. Latest production Vercel deployment for main commit `32d4e21c2f7a342d13a80e1b411e9246ae675a7b` is `READY`.

## iOS release status

**iOS binary gate is complete.**

- Apple initially rejected the release because the old workflow used Xcode 16.4 / iOS 18.5 SDK after App Store Connect began requiring Xcode 26 / iOS 26 SDK or later.
- Release CI now runs on GitHub `macos-26` and explicitly verifies an iOS 26+ SDK before building.
- Distribution certificate, App Store provisioning profile, archive, IPA export, App Store validation, and App Store Connect upload all pass.
- iOS release run #250 on commit `e53a11a20258e89c7b212677e26d25f941e1f1b6` completed successfully through App Store Connect upload.
- That binary is after the Account/Delete Account and privacy/support implementation, so it includes the current review-required account UI.
- App Store Connect/TestFlight independently reports **version 1.1.0, build 250** as the latest uploaded iOS build.
- Automated post-upload CI rejects a TestFlight build older than 250, preventing review from accidentally using a pre-account-deletion binary.
- Signed store release is now an explicit `workflow_dispatch` action rather than running on every main-branch commit.

## App Store listing status

Repository store copy has been refreshed for the actual product:

- 1,600+ curated places.
- 11 launch cities.
- Now, Dates, Build My Night, Plans, Explore, Map, Vault, and Concierge surfaces.
- GOOD TIMES-only positioning; legacy cross-brand promotional copy removed.
- Production privacy and support URLs included.

The listing package is prepared in the repository. Store metadata/screenshots and final App Store review submission still require completion in App Store Connect; do not confuse a prepared listing document with an already-submitted store listing.

## Android release status

Android application engineering is release-ready, but store identity credentials are not yet available.

- Debug compile succeeds.
- Release workflow builds a signed Android App Bundle (`.aab`), verifies the signature, authenticates a Google Play service account, and uploads to the internal track as a draft.
- Android `compileSdkVersion` and `targetSdkVersion` are 36.
- Store release is now an explicit `workflow_dispatch` action rather than running on every main-branch commit.
- The repository includes `scripts/bootstrap-android-release-secrets.sh` to create or reuse a permanent upload key, preserve recovery material outside the repository, install the five GitHub Actions secrets, and then allow the Play release workflow to run.

Android remains hard-blocked on these externally controlled credentials:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

The Google Play service-account JSON is not present in connected GOOD TIMES files, and the permanent Play signing identity must not be fabricated as a disposable CI key.

## Production hardening

- React is on 19.2.8, Vite on 8.2.0, and Capacitor on 8.x.
- Production builds run validation tests before Vite output is produced.
- Supabase configuration and public read helpers live outside the legacy monolithic screen in `src/lib/supabase.js`.
- Customer-database public execution of the unused `gt_public_product_scorecard(integer)` SECURITY DEFINER RPC was removed.
- Anonymous/authenticated table privileges on `public.spatial_ref_sys` were removed rather than blindly enabling RLS and risking PostGIS breakage.
- Advisor-confirmed duplicate indexes were removed and covering indexes were added on active concierge, agent-run, and recommendation-session paths.
- The app-specific scorecard SECURITY DEFINER warning is cleared.
- PostGIS is still extension-owned in `public`; its `spatial_ref_sys` RLS advisory and extension-owned `st_estimatedextent` execution advisories cannot be fully remediated by the normal `postgres` migration role. The repository contains `supabase/support-migrations/20260803_relocate_postgis_from_public.sql`, explicitly guarded for Supabase Support / `supabase_admin` execution after backup and maintenance-window approval.
- Supabase Auth leaked-password protection remains disabled and must be enabled through the Auth project configuration surface; the current connector does not expose that write operation.

## Remaining release gates

1. Add the permanent Android signing secrets and Google Play service-account credential, then execute the signed AAB/internal-track workflow.
2. Complete App Store Connect metadata, screenshots, privacy labels/age-rating confirmations, select TestFlight build 250, and submit the iOS version for review.
3. Expand rendered-device/browser QA when an actual browser/device automation runtime is available; current coverage is authenticated production-contract/RLS/runtime coverage, not a claim of literal screen tapping on every device.
4. Continue real-customer behavior acquisition so recommendation quality can be evaluated beyond technical proof.
5. Have Supabase Support relocate PostGIS using the guarded support migration, then rerun security advisors.
6. Enable Supabase Auth leaked-password protection through the project Auth configuration surface.
