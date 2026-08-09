# GOOD TIMES source-of-truth invariant

The committed `src/main.jsx` must route signed-in customers directly to the rich Command experience (`GoodTimesCreativeLayer + GoodTimesCommandApp + GoodTimesPartyPulse`). Production must not depend on Vercel-only source mutation to replace `GoodTimesLiveApp` or `GoodTimesNavigationBridge`.

Rendered signed-in QA must run in Chromium even when no private session secret is present. The UI regression harness therefore uses a browser-only deterministic member fixture and mocked read endpoints, while an explicitly configured real `GT_UI_SESSION` still takes precedence.

A green signed-out onboarding screenshot is not evidence that the signed-in product is visually correct.