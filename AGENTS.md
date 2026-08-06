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
11. **The following providers are removed and may not be reintroduced:** Perplexity, Google Place Details, Apify, and ScrapeGraph.
12. **One app, one repository, one Vercel project.** GOOD TIMES work stays in `dolodorsey/good-times-app` and deploys through the `good-times-app` Vercel project.

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

Then verify the production routes and inspect Vercel runtime errors.

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

src/App.jsx                                legacy experience only
```

## GOOD TIMES Agent Operating System

The old independent cron pile has been replaced by nine named deterministic agents registered in `khg_managed_agents`:

| Agent | Responsibility |
|---|---|
| `GT__SUPERVISOR` | Own queues, priorities, SLAs, deduplication, and escalation. |
| `GT__SOURCE_SCOUT` | Maintain official/direct sources and replace broken calendars. |
| `GT__EVENT_STOCKER` | Close event inventory gaps across 25 categories and 141 subcategories. |
| `GT__VENUE_REGISTRAR` | Verify and onboard legitimate missing venues. |
| `GT__VENUE_RESOLVER` | Maintain aliases and canonical venue links. |
| `GT__DATA_STEWARD` | Complete contacts, images, hours, booking links, and evidence. |
| `GT__QA_AUDITOR` | Audit duplicates, taxonomy, city accuracy, freshness, and regressions. |
| `GT__PUBLISHER` | Promote verified records and rank the public feed incrementally. |
| `GT__RELIABILITY` | Recover stuck work and monitor Supabase, GitHub, Vercel, and crons. |

Agent state and work:

```sql
select * from v_gt_agent_command_center order by agent_name;
select * from gt_agent_work_items
where status in ('queued','waiting','failed')
order by priority, created_at;
```

Run an agent manually only for testing or incident recovery:

```sql
select gt_run_agent('GT__SUPERVISOR','manual');
select gt_run_agent('GT__PUBLISHER','promotion');
select gt_run_agent('GT__PUBLISHER','ranking');
```

Promotion and ranking are intentionally separate phases. Do not combine them into one transaction.

## Data workflow

```text
official/direct sources + exact Eventbrite feeds
    ↓
gt_sourced_events
    ↓  GT__PUBLISHER / promotion
gt_shows
    ↓  verified taxonomy precedence
v_gt_effective_* / ranked internal feed
    ↓  GT__PUBLISHER / ranking
public GOOD TIMES feed
```

Venue workflow:

```text
unmatched event venue text
    ↓
gt_venue_normalization_queue
    ├─ reviewed alias → GT__VENUE_RESOLVER
    ├─ legitimate missing venue → GT__VENUE_REGISTRAR
    ├─ profile completion → GT__DATA_STEWARD
    └─ generic/junk text → quarantine
```

## Safe data changes

- Schema changes use Supabase migrations.
- Backfills run in transactions and must be idempotent.
- Preserve manually curated fields such as `is_khg`, `is_culture_pick`, `culture_tier`, and `khg_brand_key`.
- Never silently lower inventory or quality targets to make a scorecard appear complete.
- Never delete evidence when repairing or merging a record.

## Session start

```sql
select * from v_gt_agent_command_center order by health, agent_name;
select * from v_gt_atlanta_subcategory_coverage order by inventory_gap desc;
select * from gt_venue_normalization_queue
where status='open'
order by upcoming_show_count desc;
select jobname, status, return_message, start_time
from cron.job_run_details d
join cron.job j using(jobid)
where j.jobname like 'gt-agent-%'
order by start_time desc
limit 30;
```

Fix critical health failures before feature expansion.

## Session end

- Build the app.
- Confirm Vercel deployment is READY.
- Check runtime errors.
- Record the work in the normal handoff/task system.
- Leave queue ownership with the named agent responsible for the lane.

**Last updated: August 6, 2026 — GOOD TIMES Command Experience + Agent Operating System v1.**
