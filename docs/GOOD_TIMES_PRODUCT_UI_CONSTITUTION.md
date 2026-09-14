# GOOD TIMES Product + UI Constitution v2.0

**Status:** ACTIVE / PROTECTED  
**Product:** GOOD TIMES — Worldwide Experience Concierge

## 1. Product identity
GOOD TIMES is a premium city-intelligence and experience concierge. It is not a generic directory, Yelp clone, Eventbrite clone, OpenTable skin, ticket list, or a black-and-gold database UI.

The product must help a customer **Discover → Decide → Plan → Act → Monitor → Remember → Personalize**.

## 2. Master experience formula
Every primary screen follows:

> **SCENE → PROMISE → INTELLIGENCE → DECISION → ACTION**

Every major module must create **Desire + Context + Relevance + Trust + Action**. A beautiful module with no useful action is incomplete. A functional module with no desire is generic. Personalized stale information is unacceptable.

## 3. Cinematic context
The design language is cinematic context, not simply black and gold. Prefer a recognizable environment + human subject + experiential action. Use verified real imagery when it represents a specific venue/event.

- Home: current city + social energy + immediate possibility.
- Discover: exploration, culture, dining, nightlife, stays, experiences.
- Plan: chemistry, aspiration, friends, dates, celebrations.
- Radar: urgency and city pulse.
- Saved: memory and aspiration.
- Profile: membership and identity.
- Venue/Event detail: the actual verified entity.
- Itinerary: emotional summary of the completed plan.

## 4. Permanent navigation constitution
Bottom navigation is exactly:

**Home / Discover / Plan / Saved / Profile**

Plan is the elevated center action. Never reorder these items or rename them by screen. Radar is a first-class destination reached from the bell, City Radar strip, Home modules, deep links, and notification controls; it never replaces Plan in permanent navigation.

Detail screens preserve origin, scroll, query/filter state, city and date when returning.

## 5. Visual system
GOOD TIMES is **cinematic, editorial, metropolitan, warm, cultured, premium, human, useful**. It is not casino, cyberpunk, gaming, crypto, neon-tech, generic SaaS, or generic luxury-template design.

Approximate distribution:
- 70–75% near-black / charcoal
- 15–20% photography
- 5–10% ivory / white
- 5–8% gold

Gold is semantic: active, selected, primary, premium, high-priority, or brand signature. Do not use gold as filler decoration.

Core palette:
- Canvas `#050607`
- Surface 1 `#090A0C`
- Surface 2 `#0E1013`
- Surface 3 `#151619`
- Ivory `#F7F2E9`
- Text `#F5F2EA`
- Secondary `#AAA8A3`
- Muted `#737373`
- Gold 1 `#FFF0B3`
- Gold 2 `#F8D46A`
- Gold 3 `#E9B83F`
- Gold 4 `#B58222`
- Success `#55D98B`
- Danger `#F16060`

## 6. Typography
Use no more than three voices:
1. Editorial serif — heroes, venue names, major titles.
2. Modern sans — UI, controls, metadata, dates, times, addresses.
3. Script accent — rare brand moments such as “Good People. Better Nights.” Never body copy or controls.

Large editorial headings should usually be 2–7 words. One gold-emphasis phrase per hero maximum.

## 7. Layout
Use an 8-point system: `4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80`.

- Standard gutters: 20–24px
- Compact phones: 16–18px
- Touch targets: >=44pt
- Radius family: 8 / 12 / 16 / 20 / 24 / 28 / pill

Do not freestyle per-screen spacing, radii, colors or typography.

## 8. Imagery
Venue order: interior/experience → food/drink → people → exterior → logo.  
Event order: live moment → artist → crowd/stage → official art.

Never let stock imagery impersonate a real entity. Fallback: verified primary → verified secondary → approved category media → city fallback → branded gradient. UI text remains real UI text, never baked into production images.

## 9. Screen jobs
### Home
Answers: **What is worth doing right now?** Dynamic by city, time, weekday, user and major local moments. Not an endless directory.

### Discover
Answers: **Let me intentionally explore.** Editorial lanes: **Eat Well / Turn Up / Be There / Stay Right / Do More**. Full taxonomy remains behind the lanes.

### Tonight / Now
Only current, actionable, correct-city, quality inventory. Suppress expired/cancelled/impossible/stale results.

### Venue / Event detail
Editorial first, transaction-ready second. Real imagery, trustworthy facts, one obvious primary action.

### Plan
Turns natural intent into an executable experience. AI may interpret, rank, explain and compose; it may not invent venue, address, hours, availability, price, ticket inventory or confirmation.

### Itinerary
A chronological plan, not a recommendation list. Statuses: SUGGESTED / SELECTED / HELD / REQUESTED / CONFIRMED / TICKETED / WAITLIST / ACTION REQUIRED / CANCELLED / COMPLETED. Never show CONFIRMED without backing state.

### Saved
Memory layer for places/events plus complete plans.

### Radar
City intelligence with provenance, timestamps, expiry, confidence, audience logic, dedupe and rate limiting.

### Profile
Identity → Membership → Preferred City → Personalization → Account/Payment → Notifications → Privacy → Support.

## 10. Truth rules
Never invent business/event facts. Missing optional data collapses cleanly. Do not claim availability unless verified; otherwise say **Check availability**. Expired events disappear from active discovery. Wrong-city data is a release blocker.

## 11. Recommendation principle
Base quality qualifies inventory before personalization. Personalization may reorder qualified inventory but cannot rescue weak inventory. Paid/commercial priority cannot rescue weak inventory. Proximity is useful but not quality.

## 12. Performance + accessibility
Targets under reasonable modern mobile conditions:
- app shell <1s
- primary useful content <2s
- interactive <2.5s

Use responsive media sizes, skeletons, reduced-motion support, readable contrast, and non-color-only state communication.

## 13. Paid content
Partner content must be clearly labeled Partner / Featured Partner / Sponsored / Presented By / Exclusive Access. Ads must look native to GOOD TIMES and never silently overpower relevance.

## 14. Definition of complete
Never use **Done** as the final state.

**SPECIFIED → DESIGNED → BUILT → CONNECTED → QA PASSED → BETA VERIFIED → PRODUCTION DEPLOYED → PRODUCTION VERIFIED**

A feature is complete only with real data, loading/empty/error states, analytics, accessibility, responsiveness, navigation, automated tests, deployment, and production verification.

## Final quality test
Would this feel appropriate if Apple featured it tomorrow? Would a user trust it for an important date/night out? Would an upscale venue want to be represented this way? Does it remain premium and usable with messy real-world data? If not, it is not ready.
