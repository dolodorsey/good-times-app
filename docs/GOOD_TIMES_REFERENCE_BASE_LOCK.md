# GOOD TIMES reference-base restoration and release lock

Date: 2026-09-24. Scope: GOOD TIMES only.

## Authority and sequence
The owner's nine supplied September 13–14 cinematic mobile references are the visual target. Their current instruction supersedes conflicting September 17–19 palette and typography interpretations. Do not call an old V4 commit or a passing build a visual approval. The current restoration is UNDER REVIEW until rendered screenshots and core journeys have actually been inspected.

Keep Home / Discover / Plan / Saved / Profile in the bottom bar. Keep Radar available from the bell. Keep current Atlanta-only data, authentication, saved records, planning and API behavior intact. Production text, dates, venue facts, ratings and booking states must come from current verified records, not the mockups. Never populate a real profile with the fictional reference identity.

## Single visual authority
`src/features/experience/good-times-founder-v4-restore.css` is the final scoped reference-base stylesheet. No new global theme, late stylesheet, arbitrary palette or replacement font may be added as an unrelated feature change. Keep the mandatory CI checks intact. The restored header/hero/lane typography, gold controls, brand mark visibility and mobile label geometry must be tested as rendered, not just with source-code searches.

## Evidence required before release
1. Exact candidate SHA and Vercel deployment.
2. Compact/standard/large phone, tablet and desktop screenshots.
3. Home, Discover, Tonight, Plan, Saved, Profile, Radar, venue detail and itinerary. Capture top and bottom of scrolling screens.
4. Preserve back navigation, bottom navigation, form actions, empty/error states and current-data integrity.
5. Separate isolated fixture screenshots from genuinely authenticated production screenshots. A fixture session is never proof of login or persistence. Do not expose credentials, tokens or QA storage state in artifacts.
6. Review source-image lineage, readable typography, crops, labels, control targets and remaining reference differences.
7. Do not certify production from a READY build alone. Record observed failures rather than suppressing tests.

## Deferred upgrade work
Only after the base is accepted: (1) Atlanta-only launch hardening, (2) auth and Google login, (3) saved items/profiles/plans, (4) Instagram attribution/install funnel, (5) backend/API, (6) monitoring and production safeguards, (7) Entertainment destination. Entertainment should initially be a Discover category/tab and Home entry; do not replace the center Plan button or silently add a sixth bottom-nav item.

## Honest limitation
Technical gates reduce regression risk; they cannot guarantee that no defect will ever recur. Repository administrator controls and independent visual approval remain necessary. Reference media crops are not equivalent to full-resolution clean art, and passing geometric tests is not nine-screen reference parity.
