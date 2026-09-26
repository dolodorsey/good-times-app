# GOOD TIMES experience preservation — mandatory

Read root `AGENTS.md`, `docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md`, `docs/GOOD_TIMES_SCREEN_CONTRACTS.md` and `docs/GOOD_TIMES_PRODUCTION_SOP.md` before any work here. This scoped instruction reinforces, not replaces, those rules.

## Owner correction — September 25, 2026

The owner rejected release `09a48fe6c8a3c851bd9de69f97baa8d0ee1fbe09`: the previous experience was better and the existing categories and subcategories are the standard. The accepted restoration source is `2ee55a0a69dd5112fe43bbf85fa37fe904e49146`, restored in PR #155. Do not reintroduce the rejected redesign through another branch or feature flag default.

## Protected product behavior

- Preserve all active category IDs, names, parent relationships, subcategory IDs/names/order, zero-result lanes, category counts and category → subcategory → directory → detail → return behavior.
- Load categories from `gt_taxonomy_categories`, subcategories from `gt_taxonomy_subcategories`, and directory records from `v_gt_venue_taxonomy_directory`. Presentation shortcuts may not replace these sources or reduce their reachability.
- `ExploreTaxonomyBrowser` is the protected current implementation. A replacement requires specific owner approval of equivalent or better full taxonomy behavior and comparative screenshots, not an agent's claim that a shorter filter list is cleaner.
- Preserve Directory / Map, detail actions, saves, plans, state on return and the established cinematic identity.
- A request to improve UX, upgrade cards/fonts, split discovery, or deploy is not permission to erase taxonomy or silently reduce capability. Describe the permitted change and protected elements before editing.
- Do not rewrite failing acceptance assertions merely to make a redesign pass. Identify whether the failure is a genuine regression or a specifically approved change; preserve or increase behavioral coverage. Never duplicate a required check name with a weaker test.
- Passing a build, HTTP 200, screenshot geometry checks or Vercel READY is not product approval. Evidence must show the protected user journey as well as the visual result.

## Enforcement and evidence

`scripts/protected-taxonomy.test.mjs` runs static checks during the ordinary test/build and dynamic catalog traversal in the existing required `geometry` workflow. It verifies unknown database-shaped category/subcategory IDs, complete lists, directory results, detail return, Map and retained empty subcategories. Fixtures are confined to loopback test origins; they are not evidence of a production customer login.

For future releases record the exact tested SHA, protected-capability comparison, category and subcategory traversal results, desktop/mobile screenshots, unchanged data scope and actual production release. A product-regression rejection requires restoration first, not another redesign. No agent may declare another independent agent approved a release without its actual review evidence.
