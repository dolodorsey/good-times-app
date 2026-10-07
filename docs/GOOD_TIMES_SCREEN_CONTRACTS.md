# GOOD TIMES Golden Screen Contracts

**Global formula:** `SCENE → PROMISE → INTELLIGENCE → DECISION → ACTION`

**Permanent navigation:** `Home / Places / Plan / Entertainment / Profile`. Saved state lives inside `Profile → My GOOD TIMES`. Radar never replaces Plan.

## Home
**Job:** What is worth doing right now?  
**Visual promise:** The city is alive and GOOD TIMES knows the move.

Required: global header/city, compact intent search, dense current-city modules spanning Places and Entertainment, fresh local content, featured/trending/for-you logic, Radar entry, Plan/Concierge entry.  
Forbidden: generic directory opening, text wall, stale events, irrelevant stock hero, nav mutation.

## Places
**Job:** Let me intentionally explore persistent destinations.  
**Visual promise:** Dense, useful entity discovery—not a sparse directory landing.

Required: universal search, compact entity lanes, restaurant-first faceting, deep taxonomy, Grid/List/Map browse modes, source-backed results, and useful live place recommendations on the landing.  
Forbidden: removing taxonomy, hardcoded shallow categories, hardcoded city in reusable components, duplicated canonical entities, or large blank regions where useful inventory can be shown.

## Entertainment
**Job:** What is happening, live, or worth doing now and soon?  
**Visual promise:** Time-first city discovery with current energy and clear next actions.

Required: Tonight / This Weekend / Upcoming browsing, nightlife programming, concerts/live music, festivals/events, sports, comedy/performing arts, interactive/family/experience lanes, canonical venue relationships, source-backed dates/times, save and Plan actions.  
Forbidden: treating a persistent place as a fake event, expired/cancelled-as-active inventory, wrong-city results, or unverified event facts.

## Tonight / Now
**Job:** What can I realistically do in this city now?  
Required: current city/date, filters, image-rich actionable cards, time, location, category/vibe, save.  
Forbidden: expired/cancelled-as-active/wrong-city/impossible/unverified-availability content.

## Venue Detail
**Job:** Turn a venue record into an editorial and transactional experience.  
Required: actual verified venue hero, identity, source-backed quality, attributes, location, supported hours/open state, concise editorial description, gallery, one primary transaction CTA, supporting actions.  
Forbidden: generic city hero when strong real venue media exists; fake attributes/open state; broken media; generic Learn More when a direct action exists.

## Event Detail
**Job:** Make the event real, current, trustworthy and actionable.  
Required: verified live/artist/official media, title, local date/time, venue, source-backed status, description, ticket/save/share/follow/plan actions.  
Forbidden: expired-as-live, false ticket state, false confirmation, wrong venue, invented facts.

## Plan
**Job:** Turn intent into an executable night.  
Required: cinematic hero, AI/Custom modes, intent tiles, natural-language input, popular requests, Build My Night CTA, guided builder.  
Forbidden: blank-chat-only UI, invented places/hours/availability, unvalidated timeline.

## Generated Itinerary
**Job:** Turn recommendations into a coherent chronological plan.  
Required: hero summary, date/city, numbered timeline, time/image/name/type/location/status per stop, edit, services, share, concierge.  
Allowed statuses: `SUGGESTED / SELECTED / HELD / REQUESTED / CONFIRMED / TICKETED / WAITLIST / ACTION REQUIRED / CANCELLED / COMPLETED`.  
Forbidden: false CONFIRMED, impossible travel, unordered stops, stop with no next action.

## Radar
**Job:** GOOD TIMES watches city changes and urgency for the customer.  
Required: Radar promise, alert intensity, alert-type controls, City Signals, watchlist/alerts, source/expiry validity behind every signal.  
Forbidden: duplicate spam, source-less signals, non-expiring volatile signals, Radar replacing Plan in bottom nav.

## My GOOD TIMES (Profile)
**Job:** Everything worth returning to remains organized inside the account hub.  
Required: My Plans, Saved Places, Saved Entertainment, recently viewed, following, preferences, plan itinerary previews, share/edit/unsave, and backed ticket/reservation state only when real provider state exists.  
Forbidden: flat bookmark dump as the entire product, lost save state, dead-end empty state, or moving saved behavior without preserving ownership and account isolation.

## Profile
**Job:** Identity and membership before settings.  
Required: identity, membership/tier, My GOOD TIMES library, preferred city, personalization, account/payment where implemented, notifications, privacy, support.  
Forbidden: opening as settings dump, sensitive-data exposure, silent city-context mutation.

# Blocking acceptance gates

| Gate | Level | Standard |
|---|---|---|
| Bottom navigation | P0 | Exact Home / Places / Plan / Entertainment / Profile order |
| Real data | P0 | No invented venue/event facts or confirmations |
| City integrity | P0 | No wrong-city inventory |
| Expiry/cancellation | P0 | No stale/cancelled content shown active |
| Confirmation truth | P0 | CONFIRMED/TICKETED/AVAILABLE requires backing state |
| Design system | P1 | Shared tokens/components; no uncontrolled drift |
| State matrix | P1 | Loading/empty/partial/error/missing-media/degraded safe |
| Responsive | P1 | Compact/standard/large phone support + 44pt targets |
| Golden Screen | P1 | No material protected-screen visual regression without approval |
| Core journeys | P0 | Home/Places/Entertainment/detail/Plan/save/My GOOD TIMES/Radar/Profile/back navigation work |
| Build | P0 | Exact SHA passes tests + production build |
| Preview | P0 | Exact SHA has READY Vercel preview |
| Runtime | P0 | No unresolved P0/P1 preview runtime cluster |
| Supabase advisors | P1 | Required after persistent schema change |
| Production verification | P0 | Production READY + smoke + visual verification |

## Anti-half-ass rule
If a feature cannot meet its screen contract and applicable gates, keep it behind a feature flag. GOOD TIMES does not expose a weaker half-built version solely to say the feature exists.


## Owner-approved compact pilot — 2026-09-27
For the isolated preview pilot, read `docs/GOOD_TIMES_COMPACT_PILOT_2026-09-27.md`. Its compact presentation supersedes oversized hero requirements only within the compiled pilot; all taxonomy, truth, privacy, release and paused-scheduler protections remain binding.

## September 28, 2026 navigation supersession
The owner-approved primary information architecture is **Home / Places / Plan / Entertainment / Profile**. Earlier references to Discover as the primary entity browser and Saved as a permanent tab are historical only. Their capabilities are preserved through Places, Entertainment, and Profile → My GOOD TIMES; the protected taxonomy, truth rules, responsiveness, accessibility, and release gates remain in force.


## October 7, 2026 owner-supplied 30-page contract
The current task supersedes earlier primary-navigation labels/order with **Home / Discover / Entertainment / Plan / Profile**. Saved remains in Profile. Page 01 uses compact headers and dense typed Place/Event rails. Implement sequentially; Page 02 may not start until Page 01 passes live preview, visual, functional and state QA at 95/100 or higher. Existing taxonomy identities and all truth/security safeguards remain binding. This task is preview-only until the requested page gates pass.
