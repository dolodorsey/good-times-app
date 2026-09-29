# GOOD TIMES — restaurant enrichment and truthful actions

Scope: Atlanta-only, owner-authorized manual continuation on September 28, 2026 (America/New_York). This is not a claim that the full app or Home acceptance issue #33 is complete.

## Verified live data changes

The manual batch updated 11 existing venue records and their 11 existing restaurant profiles, preserving exact canonical identity and existing verification/freshness/quality thresholds. Previous field values are retained in `gt_venues.metadata.restaurant_enrichment_20260928.before` and `gt_restaurant_profiles.evidence.official_review_20260928.before` for reconciliation. Sources, review timestamps and ambiguity notes accompany the changes.

Post-update verification at 2026-09-29T01:25:09Z:

| Metric | Before | After |
| --- | ---: | ---: |
| Stored restaurant profiles | 91 | 91 |
| Profiles linked to venues with hours summaries | 20 | 27 |
| Profiles linked to venues with booking/order action links | 9 | 19 |
| Profiles linked to venues with hero images | 6 | 6 |
| Enabled legacy GOOD TIMES agents | 0 | 0 |

The seven added hours summaries consist of SIX full weekly schedules and ONE explicitly partial set of service windows. They are not seven complete schedules. Restaurant profile RLS remains enabled; public write privileges remain unavailable. No worker or schedule was activated, and no inventory was deleted or score increased.

## Official source decisions

| Record | Official source | Added / retained decision |
| --- | --- | --- |
| Heritage Supper Club | https://www.heritagesupperclub.com/ | Resy destination, phone, dinner, reservations. Site conflicts on 4:30 PM versus 5 PM opening; hours remain unset and conflict is visible in the description. |
| Sargent | https://www.sargent-atlanta.com/ | Full weekly hours, phone, lunch/dinner, reservations, wine list; clean canonical Resy destination without expired booking date. |
| Sozou | https://www.sozouatl.com/ | Official weekly hours, dinner, dress rule, parking and canonical OpenTable destination. Older conflicting provider hours not used. |
| Pataaka | https://pataakaatl.com/ | Indian/tapas and small plates, reservations and canonical OpenTable destination. Weekly hours not inferred. |
| Amasa Mexican Kitchen | https://www.amasamexican.com/ | Phone, booking, lunch and Sunday brunch windows only; rooftop bar and gluten-free options recorded as venue-supplied claims, not allergen guarantees. |
| BOSK Coffee Wine & Tapas | https://boskcafeandwine.com/ | Store weekly hours (not delivery hours), phone, ordering menu, cafe service, dine-in/takeout/delivery/catering. |
| Cotto Modern Italian — Vinings | https://www.cottoitalian.com/reservations | Vinings phone and reservation page. Gainesville/shared footer hours were not copied to Vinings. |
| Mister Burger — Decatur | https://www.mister-burger.com/ | Decatur phone and location-specific Toast ordering. Dynamic closing text was not treated as weekly hours. |
| Shah's Halal Food — Atlanta | https://www.shahshalalfood.com/atlanta-ga/ | Full weekly schedule with explicit next-day overnight closes, ordering, dine-in/takeout/delivery/catering. |
| Terminal 26 | https://www.terminal26.com/ | Full weekly hours, phone, Thai/seafood and cocktails; no booking destination invented. |
| Toastique — Atlanta Brickworks | https://toastique.com/pages/atlanta-brickworks | Full weekly hours, phone, counter ordering, location-specific order URL, cafe offerings and dietary options. No reservation claim. |

## Media is sourced, NOT approved

Six official-site image candidates were added to the existing media-review ledger for Sargent, Pataaka, BOSK, Amasa, Heritage and Mister Burger Decatur. All remain `candidate` with `rights_status=unknown`; no hero image or gallery was replaced. Only the Amasa exterior was fetched and visually reviewed at this stage; its photographer credit and publication rights still require clearance. Some other candidates did not load, are small thumbnails, or may be graphics rather than venue photography. Those limitations are recorded individually.

## Truthful customer actions

The code increment labels verified provider destinations as `Order online` or `Reserve a table`. A venue-hosted menu receives an ordering label only when the same venue hostname and a recorded `online_ordering` feature agree. Unknown links retain `Check availability`; missing booking links retain `Official website`. Destination URLs are not rewritten and availability is never claimed.

No new CSS, card dimensions, navigation, taxonomy, API authorization or public database access is introduced. Existing ticket actions, safe-link handling, optional-data failure, base details and return-to-Places behavior remain in place.

## Inventory distinction

The current event-only gap view still reports thin or empty scheduled-event coverage in some Entertainment categories. Six separately stored current, non-dated experiences cover observation rides, simulator racing and transport experiences. These must not be counted or manufactured as scheduled events merely to erase gaps. This change does not claim to connect every persistent-experience entry to the customer browse UI or finish coverage.

## Evidence still required before code release

Exact-head CI, all protected UI/security/quality checks, rendered restaurant actions at 320/390/834/1440, screenshots inspected, then production commit/deployment/API verification. Controlled loopback screenshots are layout evidence, not a production customer login. Issue #33 stays open for broader acceptance.
