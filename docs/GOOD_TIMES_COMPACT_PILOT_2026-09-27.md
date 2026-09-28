# GOOD TIMES — compact Nightlife pilot

Owner direction: the approved two-column previews and explicit “Go” on the enhanced execution plan. Scope: GT-001–005, the venue-directory portion of GT-007, and the GT-012 pilot candidate. This is not completion of all 28 work packages.

## How to review

On a Vercel **preview** deployment, add `?gt_compact=1` and sign in normally, then choose Discover. The same opt-in works on loopback development. The appearance flag cannot be enabled on a production build by adding a query parameter. No authentication bypass is introduced.

## Implemented candidate behavior

- Compact category/subcategory index and two-column venue cards at normal phone widths; adaptive desktop and narrow-view reflow.
- Canonical registry IDs, names, order and empty categories remain reachable. No new taxonomy store.
- Selected-category and free-text **venue** queries use bounded reads against the existing public taxonomy-directory view, with a scope-bound keyset cursor and deduplication by venue ID.
- No 2,500-row initial category download in the compact variant. Counts are identified separately from loaded results; unavailable counts are not invented zeroes.
- Request cancellation, latest-query isolation, explicit errors/retry and load-more controls.
- Clean Discover reentry; unchanged detail-overlay return and existing account/save/plan handlers.
- Map shows one explicitly selected, coordinate-backed venue at a time; loaded mapped/unmapped coverage is disclosed. It does not pretend to draw every listing as a pin.
- Legacy production presentation and all other screens remain unchanged pending pilot acceptance.

## Protected exclusions

No new permanent tabs, no Saved relocation, no framework/account migration, no generated event facts, no raw privileged keys, no publishing/reclassification/backfill writes, no sourcing subscription, no scheduler activation or cron changes, and no production merge/promotion. This pilot does not reintroduce the removed broad Discover strip. The Home shortcut removal and broader screen rollout remain pending, not silently reported complete.

## Verification separation

Local pure query/flag tests are not a live browser or account test. CI fixture screenshots and journey checks are not certification of real customer authentication, current provider data or real booking state. Preserve ordinary repository verify/geometry/taxonomy gates. The actual browser output requires owner visual review and independent acceptance before broad rollout.

## Known remaining scope

Combined event/venue search, canonical Tonight-window repair, cross-session dataset snapshot stability, full field/source independence reconciliation, real-account isolation, Add-to-plan end-to-end receipts, planner upgrades, complete multi-sport feeds, Home/Upcoming/other screen rollout, mobile WebKit/native checks, production runtime and installed-client verification remain open. Scoped pagination uses stable identity ordering, not a new popularity ranking or a claim of a transactionally frozen dataset.

## Release gate

Candidate must pass build, existing protected tests and the new compact browser checks; record exact SHA, fixture context, screenshots and unresolved cases. The implementation agent does not self-award independent review or production approval. An unavailable external dependency or failed browser check leaves the candidate blocked; never weaken assertions to obtain green status.
