# GOOD TIMES — PAGE 17/30
# CONCERTS / LIVE MUSIC

**Status:** LOCKED PLANNING STANDARD  
**Family:** Entertainment  
**Primary visual identity:** Black/dark navy + electric blue/ultraviolet  
**Read first:** `00_MASTER_CONTEXT.md`

## Best Move / Purpose
Dedicated music Event-discovery engine spanning major concerts, festivals, local artists and intimate live music.

## Locked Hierarchy
**Time → Music Type → Genre → Event.**

## Required Modules
- Tonight / Weekend / Upcoming / This Month.
- All / Concerts / Live Music / Festivals.
- Genre rail.
- Featured Live, Live Tonight, Starting Soon.
- Big Concerts, Live Music, Atlanta Live/Local Artists, Touring Artists.
- Genre lanes, Music Festivals, Intimate Live, Free Live Music, Neighborhoods.
- Venues to Follow, From Artists You Follow, Just Announced, Presale/On Sale Soon, Trending.

## Backend / Supabase Rules
- Canonical performer records + event_performer relationships.
- Normalized genres.
- Venue remains Place.
- Ticket/presale/on-sale/doors/show states canonical.
- Recurring live music uses series/occurrences.

## Required Actions
- Tickets
- Save
- + Plan
- Follow Artist
- Follow Venue
- Add Music Event

## Routing / Return-State Contract
Event→20; Venue→Place; preserve time/music/genre state.

Preserve relevant query, category/subcategory, filters, date/time, neighborhood, map/list state, scroll, selected item, and Plan/anchor context.

## Loading / Empty / Error / Partial States
- Sold out.
- Presale/not-on-sale.
- Cancelled/postponed.
- No genre inventory → future/related.

## QA — Automatic Failure Conditions
- Ticketmaster clone.
- Giant posters.
- Concerts/Live Music indistinguishable.
- Venue as performance.
- Party misclassified as concert.
- Local music absent.

Also fail if the page violates the locked five-tab navigation, reintroduces Saved globally, displays fake/stale claims, loses return state, duplicates canonical masters, or is polished but operationally read-only.

## Definition of Done
Music modes/genres, performer/follow, touring/local/live inventory, truthful access/timing and >=95.

Before approval: capture first-viewport screenshot + full-page screenshot, verify real routing/actions/data, document state QA, and score the page **>=95/100**.
