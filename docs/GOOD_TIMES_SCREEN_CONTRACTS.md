# GOOD TIMES Golden Screen Contracts

**Global formula:** `SCENE → PROMISE → INTELLIGENCE → DECISION → ACTION`

**Permanent navigation:** `Home / Discover / Plan / Saved / Profile`. Radar never replaces Plan.

## Home
**Job:** What is worth doing right now?  
**Visual promise:** The city is alive and GOOD TIMES knows the move.

Required: global header/city, cinematic hero, short emotional promise, intent search, quick actions, fresh local content, featured/trending/for-you logic, Radar entry, Plan/Concierge entry.  
Forbidden: generic directory opening, text wall, stale events, irrelevant stock hero, nav mutation.

## Discover
**Job:** Let me intentionally explore.  
**Visual promise:** Editorial exploration, not a taxonomy dump.

Required: Discover hero, universal search, top filters, emotional lanes (**Eat Well / Turn Up / Be There / Stay Right / Do More**), deep taxonomy, source-backed results.  
Forbidden: removing taxonomy, hardcoded shallow categories, hardcoded city in reusable components, generic grid as the whole experience.

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

## Saved
**Job:** Everything worth returning to remains organized.  
Required: Saved hero, Plans/Saved switch, plan itinerary previews, saved places/events, share/edit/unsave.  
Forbidden: flat bookmark dump as entire product, lost save state, dead-end empty state.

## Profile
**Job:** Identity and membership before settings.  
Required: identity, membership/tier, preferred city, personalization, account/payment where implemented, notifications, privacy, support.  
Forbidden: opening as settings dump, sensitive-data exposure, silent city-context mutation.

# Blocking acceptance gates

| Gate | Level | Standard |
|---|---|---|
| Bottom navigation | P0 | Exact Home / Discover / Plan / Saved / Profile order |
| Real data | P0 | No invented venue/event facts or confirmations |
| City integrity | P0 | No wrong-city inventory |
| Expiry/cancellation | P0 | No stale/cancelled content shown active |
| Confirmation truth | P0 | CONFIRMED/TICKETED/AVAILABLE requires backing state |
| Design system | P1 | Shared tokens/components; no uncontrolled drift |
| State matrix | P1 | Loading/empty/partial/error/missing-media/degraded safe |
| Responsive | P1 | Compact/standard/large phone support + 44pt targets |
| Golden Screen | P1 | No material protected-screen visual regression without approval |
| Core journeys | P0 | Home/Discover/detail/Plan/save/Radar/Profile/back navigation work |
| Build | P0 | Exact SHA passes tests + production build |
| Preview | P0 | Exact SHA has READY Vercel preview |
| Runtime | P0 | No unresolved P0/P1 preview runtime cluster |
| Supabase advisors | P1 | Required after persistent schema change |
| Production verification | P0 | Production READY + smoke + visual verification |

## Anti-half-ass rule
If a feature cannot meet its screen contract and applicable gates, keep it behind a feature flag. GOOD TIMES does not expose a weaker half-built version solely to say the feature exists.
