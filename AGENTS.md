# AGENTS.md — GOOD TIMES Operating Contract

This file is the current source of truth for coding agents and operating agents working on GOOD TIMES.

## Hard rules

1. **The live customer app is `src/features/experience/GoodTimesCommandApp.jsx`.** `src/App.jsx` is the legacy experience available only through `/legacy`. New production features belong in the command experience unless a migration plan explicitly says otherwise.
2. **Do not break the app shell.** The viewport remains fixed, `.gt2-content` is the scroll container, and `.gt2-nav` stays outside the scrolling pane. Long pages must never move the bottom navigation.
3. **Explore must remain taxonomy-driven.** Load active categories from `gt_taxonomy_categories`, subcategories from `gt_taxonomy_subcategories`, and places from `v_gt_venue_taxonomy_directory`. Do not replace this with a hardcoded category list.
4. **Build My Night is a core product feature.** Keep the guided builder and conversational concierge. The builder must create source-backed itineraries from current events and verified venues.
5. **Never write content to the legacy auth project.** Live GOOD TIMES content is in Supabase project `dzlmtvodpyhetvektfuo`, primarily in `gt_*` tables and views.
6. **Always normalize cities through `gt_city_normalize()`.** Canonical city keys remain: `atlanta`, `houston`, `miami`, `new_york`, `los_angeles`, `charlotte`, `dallas`, `washington_dc`, `phoenix`, `scottsdale`, `las_vegas`.
7. **Do not invent venue or event information.** A public website, phone, image, date, venue, or taxonomy assignment requires source evidence or an approved deterministic rule.
8. **Do not use loose venue matching.** Allowed automatic matches are reviewed aliases or one unique full normalized address. Street-number-only and ambiguous fuzzy matching are prohibited.
9. **Do not discard valid business inventory.** Career fairs, professional networking, mixers, real-estate events, finance events, classes, and community programs are valid taxonomy lanes. Noise filtering is limited to virtual-only spam, MLM/pyramid offers, timeshares, and obvious make-money schemes.
10. **Never commit credentials.** Supabase `credentials` is the credential source of truth. Applications and agents receive credential references, never raw values.
11. **The following GOOD TIMES providers are removed and may not be reintroduced:** Perplexity, Google Place Details, Apify, and ScrapeGraph.
12. **One app, one repository, one Vercel project.** GOOD TIMES work stays in `dolodorsey/good-times-app` and deploys through the `good-times-app` Vercel project.
13. **Rank the experience before the image.** Media quality may contribute only through the explicit visual-quality component; an image path, uploader, curator submission, or stock fallback may never inflate the underlying venue/event quality.
14. **Nearby is not the same as good.** Proximity contributes at most 5% to the canonical GOOD TIMES score. SEO/search rank contributes 0%. Google/Yelp/review-platform popularity may be retained as secondary evidence but is not a primary ranking authority.
15. **Curator imagery is a candidate, not a default.** The Visual Research Director must compare eligible truthful alternatives. Stock photography must never impersonate a real venue/event when verified real media can be sourced.
16. **Sourcing agents never publish directly.** Discovery → evidence → identity resolution → verification → domain score → visual research → editorial/quality gate → publication → monitoring are separate stages.
17. **Do not revive the retired `khg_managed_agents` GOOD TIMES scheduler.** The legacy nine-agent scheduler was retired August 18, 2026 when enterprise BOH autonomy became canonical. Current intelligence roles live in `khg_agents` and the skills below.

## Canonical skills

- `skills/app-intelligence-director/SKILL.md` — enterprise app routing and shared reliability rules.
- `skills/good-times-intelligence/SKILL.md` — GOOD TIMES-specific source, taste, ranking, visual, freshness, and release contract.

## Product acceptance checks

Every production change must preserve:

- Fixed bottom navigation while content scrolls.
- Now feed.
- Explore with all active categories and subcategories.
- Build My Night guided flow.
- Conversational concierge.
- Calendar.
- Map/directory discovery.
- Vault and saved items.
- Current city selection.
- Source-backed event and venue details.

Before merge:

```bash
npm install --legacy-peer-deps
npm run build
```

Then verify the production routes, Supabase security/performance checks, and Vercel runtime errors.

## Current architecture

```text
src/main.jsx
  └─ GoodTimesCommandApp.jsx              current signed-in experience
       ├─ BuildMyNightPanel.jsx            guided itinerary builder
       ├─ ExploreTaxonomyBrowser.jsx       category → subcategory → place flow
       ├─ good-times-command.css           base command UI
       └─ good-times-command-v2.css        fixed viewport shell + restored flows

src/features/intelligence/client.js
  ├─ canonical events and venues
  ├─ loadExploreTaxonomy()
  ├─ loadExploreDirectory()
  └─ concierge / profile / save APIs

api/good-times-intelligence.js             culture/source/media scoring contract
api/data-live.js                           source-backed live inventory gateway
api/data-fast.js                           quality-first + intent personalization

src/App.jsx                                legacy experience only
```

## GOOD TIMES Intelligence Director v2

The current canonical intelligence fleet is registered in `khg_agents` under `entity_scope = ['good_times']`:

| Agent | Responsibility |
|---|---|
| `gt_intelligence_director` | Route discovery, source trust, verification, visuals, editorial quality, freshness, and release protection. |
| `gt_culture_editor` | Judge actual cultural/experience value and reject popular-but-mediocre inventory. |
| `gt_tastemaker_scout` | Find direct, emerging, authoritative, creator, cultural, ticketing, arts, sports, chef, DJ, university, Greek, and promoter signals before generic search results. |
| `gt_source_authority` | Tier sources by directness, independence, historical accuracy, and freshness. |
| `gt_fact_verifier` | Cross-check critical facts and quarantine conflicts rather than guessing. |
| `gt_visual_research` | Compare truthful image candidates and select the strongest verified visual independently from curator/default imagery. |
| `gt_feed_diversity` | Prevent repetitive venue/category/promoter/neighborhood feeds without lowering quality. |
| `gt_freshness_sentinel` | Recheck volatile data and surface stale/zero-yield sources. |
| `gt_release_guardian` | Block releases that fail build, data, security, runtime, or core journey gates. |

Current fleet inspection:

```sql
select agent_key,display_name,role,department_id,platform_key,tools_forbidden,status
from khg_agents
where 'good_times'=any(entity_scope)
order by agent_key;
```

The legacy `GT__SUPERVISOR`, `GT__SOURCE_SCOUT`, `GT__EVENT_STOCKER`, `GT__VENUE_REGISTRAR`, `GT__VENUE_RESOLVER`, `GT__DATA_STEWARD`, `GT__QA_AUDITOR`, `GT__PUBLISHER`, and `GT__RELIABILITY` rows in `khg_managed_agents` are historical/retired scheduler records. Do not call `gt_run_agent()` as an operating path unless explicitly performing legacy incident forensics.

## Canonical GOOD TIMES score

```text
Cultural relevance   25%
Experience quality   20%
Source authority     15%
Current momentum     15%
Visual quality       10%
Uniqueness           10%
Proximity              5%
------------------------
Total                100%
```

- SEO/search result position: **0%**.
- Review-platform popularity: metadata/evidence only, not primary authority.
- Personalization is an overlay after base quality; it may reorder qualified results but must not rescue weak inventory.
- Unknown distance is neutral; never fabricate distance.

## Visual research workflow

```text
verified entity/event
    ↓
collect media candidates
    ├─ official / venue / artist / organizer media
    ├─ licensed or permitted editorial / press media
    ├─ verified ticketing media
    ├─ verified creator / photographer media
    ├─ curator submission
    └─ branded category fallback only when necessary
    ↓
identity + rights + resolution + crop + recency + composition QA
    ↓
visual score
    ↓
best truthful candidate
    ↓
publish/review gate
```

Candidate evidence lives in `gt_media_candidates`; `v_gt_media_candidates_scored` and `v_gt_best_media_candidate` expose the internal scored selection path. These resources are internal and are not anonymous/public tables.

## Data workflow

```text
direct/official + approved public sources
    ↓
evidence / sourced inventory
    ↓
identity resolution + source authority + fact verification
    ↓
canonical gt_shows / gt_venues
    ↓
GOOD TIMES domain score
    ↓
independent visual research
    ↓
editorial + diversity + freshness gates
    ↓
public GOOD TIMES feed
```

`gt_public_live_inventory()` supplies the live candidate pool. Its ordering must not use Google rating, SEO/search rank, or a preferred hero-image path as a quality boost.

## Safe data changes

- Schema changes use Supabase migrations.
- Backfills run in transactions and must be idempotent.
- Preserve manually curated fields such as `is_khg`, `is_culture_pick`, `culture_tier`, and `khg_brand_key`.
- Never silently lower inventory or quality targets to make a scorecard appear complete.
- Never delete evidence when repairing or merging a record.
- Rejected media stays as evidence with a rejection reason; it does not silently return to the candidate pool.

## Session start

```sql
select agent_key,display_name,role,status
from khg_agents
where 'good_times'=any(entity_scope)
order by agent_key;

select * from v_gt_atlanta_subcategory_coverage order by inventory_gap desc;
select * from gt_venue_normalization_queue
where status='open'
order by upcoming_show_count desc;

select status,source_type,count(*)
from gt_media_candidates
group by status,source_type
order by status,count(*) desc;
```

Fix critical health failures before feature expansion.

## Session end

- Build and test the app.
- Confirm Vercel deployment is READY.
- Check production runtime errors.
- Check Supabase security/performance advisories after persistent schema changes.
- Record the work in the normal enterprise handoff/task system.
- Leave unresolved work with the canonical app-specific agent responsible for the lane.

**Last updated: August 19, 2026 — GOOD TIMES App Intelligence Director + Culture-First Ranking + Visual Research v2.**