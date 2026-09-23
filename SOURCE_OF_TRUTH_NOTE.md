# GOOD TIMES source-of-truth invariant

The committed `src/main.jsx` must route signed-in customers directly to the rich Command experience (`GoodTimesCreativeLayer + GoodTimesCommandApp + GoodTimesPartyPulse`). Production must not depend on Vercel-only source mutation to replace `GoodTimesLiveApp` or `GoodTimesNavigationBridge`.

Rendered signed-in QA must run in Chromium even when no private session secret is present. The UI regression harness therefore uses a browser-only deterministic member fixture and mocked read endpoints, while an explicitly configured real `GT_UI_SESSION` still takes precedence.

A green signed-out onboarding screenshot is not evidence that the signed-in product is visually correct.

## Public launch scope — effective 2026-09-23

GOOD TIMES has one customer-facing live launch city: **Atlanta**.

Future-city data may remain in MCP Gateway for research, sourcing history and later expansion. It must not be exposed as a live/launch-ready city in public selectors, onboarding, navigation, programming or launch reporting until Dr. Dorsey explicitly expands scope.

Database content breadth is not public launch authority.
