# Page 01 — Home / For You

Status: IN PROGRESS. No Page 02 implementation authorized by this gate yet.

## Source precedence
The October 7 owner request and uploaded 30-page contract supersede older repository navigation and hero requirements. Primary navigation is Home / Discover / Entertainment / Plan / Profile. The internal `places` route remains compatible. The supplied Home reference with GOOD PEOPLE. BETTER NIGHTS., typed rails and Build / Shake / Ask guides density and color; the written compact-header and truth rules take priority over its decorative hero and invented live claims.

The graphics archive contains 35 PNGs, 25 unique by SHA-256, rather than 30 numbered references. Several are Home variants. Later-page visual mapping remains unresolved.

## Existing architecture audited
Baseline main: 18e98206d80c453f3d6f502bcc27afd73d625b24.
Canonical app: GoodTimesCommandAppV4, its existing complete/ layer, protected taxonomy browser, existing planner and details.

| Module/action | Existing data/implementation |
|---|---|
| Home inventory | deduplicated client request to /api/data → /api/data-live → existing public live-inventory RPCs |
| Places | shared content project dzlmtvodpyhetvektfuo: gt_venues; existing customer eligibility filters |
| Events | shared content project: gt_shows; canonical occurrence IDs, source facts and event clock |
| Taxonomy | gt_taxonomy_categories, gt_taxonomy_subcategories, v_gt_venue_taxonomy_directory |
| Images | existing canonical hero_image/image_url; existing safe-image checks and branded missing-media fallback |
| Personalization | GOOD TIMES project czocqfaovfpjweayniuw: gt_user_profiles, gt_user_intelligence_profiles |
| Save/Unsave | gt_saved_items via existing authenticated client |
| Follows | gt_user_follows via existing Radar client |
| Plan | existing Planner, /api/plan, itineraries with canonical typed stops |
| Detail actions | existing revalidated Details, verified provider links, directions and anchor planning |
| Add Space | existing /provider-onboarding utility route |
| Search | existing GlobalSearch |

The named GOOD TIMES project is not the public content master. Do not create duplicate venue/event tables there.

Read-only schema inspection confirmed RLS enabled on gt_user_profiles, gt_saved_items, gt_user_follows and itineraries. Policies restrict rows to auth.uid() directly or through the user's gt_user_profiles row. No schema, policy, migration, scheduler or inventory changes were made.

Live feed check returned 80 Events and 120 Places, ok=true, degraded=false, event_status=live. This validates the existing public feed, not authenticated save/plan writes.

## Implementation
Compact gold Home, intent shortcuts, typed Place/Event rails, direct +Plan, three planner entry modes, preference entry, week/sports/interactive collections, Atlanta neighborhood search. No fabricated open states, distances, popularity, inventory counts or booking claims. Empty/loading/error states reuse the existing state components. Missing location uses Atlanta without requesting location permission.

## Pending acceptance
Live authenticated Save/Unsave, profile preference persistence, plan persistence and provider handoffs require a real QA session. Isolated local layout sessions are explicitly not authentication evidence. Preview deployment, final screenshots, state matrix and visual score must be recorded before approval. Page 02 remains gated.
