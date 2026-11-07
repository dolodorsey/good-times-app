# GOOD TIMES — Atlanta Venue Revenue Catalog & Fulfillment Contract v1.0

**Status:** ACTION 2 BACKEND STAGED + RATE CARD DEFINED. **NOT CUSTOMER-APPROVED FOR RELEASE. NOT CHECKOUT ENABLED. NO SALES OR SENDS.**  
**Date:** October 9, 2026 | **Division:** GOOD TIMES only | **Market:** Atlanta only  
**Canonical rate source:** MCP Gateway Supabase `dzlmtvodpyhetvektfuo`, `public.gt_partner_rate_cards` / `public.gt_partner_commercial_offers`, version `2026-10-09-v1`.  
**Provenance migration:** `supabase/migrations/20261009010000_gt_partner_commercial_rate_card_v1.sql`.  
**Action 1 prerequisite:** Draft PR #206, `docs/GOOD_TIMES_VENUE_PARTNER_PORTAL_SPEC_LOCK_20261009.md`. Protect current GOOD TIMES consumer app and Atlanta-only scope.

## 1. Verified facts — before making offers to a venue

Three **non-equivalent** inventories were present:
1. **Gateway `gt_ad_placements`:** 10 entries = 7 cash-priced base placements plus 3 noncash trade placements. Base cash prices were $150, $250, $200, $500, $300, $350, $400. The legacy `max_duration_days=30` is an upper bound, **not evidence that all prices historically entitled 30 days**.
2. **Gateway `gt_ad_inventory`:** 7 Atlanta premium sponsorship configurations, historic monthly flat amounts $2,000–$9,000 and projected impressions. Projection is **not observed reach**, and `is_available=true` is not proof a modern GOOD TIMES app placement actually renders.
3. **Consumer GOOD TIMES `gt_ad_placements`:** five active placement definitions `home_radar_strip`, `home_feed_1`, `discover_inline`, `concierge_inline`, `saved_partner`. No commercial prices in that table. The consumer ad campaign, creative and event tables had **0** rows when checked; no verified inventory delivery was observed.

The Gateway venue directory contained 2,370 rows across markets; **961 Atlanta rows**, of which **298** carried `status='active'`. These are not claimed partner accounts, not qualified email destinations, not proved monthly audience. Existing partner application submissions: zero.

**Business rule:** Do not add together incompatible impression estimates or claim 300k/500k viewers, 80k email audience or revenue from historical catalog fields.

## 2. Canonical catalog architecture (already staged)

- Rate card version: `2026-10-09-v1`, Atlanta / GOOD_TIMES / USD.
- 32 catalog entries created in Gateway: 7 base-paid, 7 premium, 3 trade, 5 consumer technical slots, 6 channel services, 4 packages.
- 17 entries carry **internal** proposed prices; the others require private trade or qualified quotation.
- Every entry records its source, legacy key, historical price if applicable, delivery specification, proof needed and QA gate.
- **Database-enforced:** both tables RLS enabled; no anon/authenticated grants; only server/service role permissions. `public_visible=false`, `checkout_enabled=false`, `delivery_verified=false` under CHECK constraints on every item. Rate card similarly cannot go public or take payments without a future reviewed migration.
- Existing 7/10/5 source tables were **not edited**. Consumer-app screens, inventory and rankings were **not modified**. No marketing sends or charges.
- `internal_list_price_cents` is the internal planning price, not a published quote, live price feed or Stripe amount. The subsequent UI must never use it as a customer-facing price without qualification/approval and a separate explicit sellability grant.

## 3. Entry-level a la carte rate ladder (internal; pending capacity QA)

| Internal SKU | Offer | Internal list price | Proposed unit | Fulfillment definition |
|---|---|---:|---|---|
| GT-ATL-CATEGORY-30D | Category Spotlight | **$150** | Up to 30 days | Clearly labeled sponsored category unit |
| GT-ATL-EVENT-BOOST | Event Boost | **$200** | One verified event | Paid event promotion within its valid event window |
| GT-ATL-CITY-FEATURE-30D | City Featured Placement | **$250** | Up to 30 days | Clearly labeled city/Places paid card |
| GT-ATL-HOME-SECONDARY-30D | Home Secondary Sponsor | **$300** | Up to 30 days | Secondary home paid unit, rotations subject to booking |
| GT-ATL-STORY-30D | Vertical In-App Creative | **$350** | Up to 30 days | Actual production-supported vertical unit |
| GT-ATL-PUSH-1X | Sponsored Push | **$400** | One approved send | Eligible opted-in audience, permission and delivery readback |
| GT-ATL-HOME-HERO-30D | Home Hero Sponsor | **$500** | Up to 30 days | Actual rendered hero sponsorship, rotated if inventory requires |

**Price provenance:** $150–$500 preserves recorded base amounts. Proposed units/descriptions are a NEW internal packaging assumption; capacity, duration, creative renderer, booking windows and any exclusive promise must be formally approved before checkout.

No organic-rank boost, false 'featured because best', guaranteed foot traffic, venue open state, ticket availability or subscriber-count promise.

## 4. Proposed 3-package sales ladder (internal; dependent on real surface inventory)

| Package | Internal proposal | Exact included products | A la carte component total | Difference |
|---|---:|---|---:|---:|
| **Launch Boost** | **$299** | Category Spotlight + Event Boost (one actual event) | $350 | $51 lower |
| **Weekend Winner** | **$649** | City Featured + Home Secondary + Event Boost (one actual event) | $750 | $101 lower |
| **City Leader** | **$1,199** | Home Hero + Home Secondary + City Featured + Category Spotlight + Event Boost (one actual event) | $1,400 | $201 lower |
| **Custom Atlanta Takeover** | **Custom proposal** | Approved premium advertising + email/social/creator/physical channels as available | To be quoted | Not set |

These are planning prices subject to margin and actual bookable slot verification. Proposed 30-day package term applies to eligible ongoing placements only; an event boost is for one actual event. Do not market a one-event product as a full-month event program. Bundles cannot promise simultaneous conflicting exclusivity or duplicate ad slots.

**Default portal merchandising later:** 3 concise cards + separate custom proposal CTA + searchable add-on categories. Start at free verified profile, then soft upsell; do not block free official profile with payment.

## 5. Premium sponsorship rate reference (existing legacy monthly list; all HOLD)

| Historical key | Catalog title | Legacy monthly flat amount | Reason not currently sellable |
|---|---|---:|---|
| atl_weekend_brief_email | Weekend Brief Email Sponsor | $2,000 | No verified GOOD TIMES subscribed audience/send inventory or exact number of issues |
| atl_events_banner | ATL Events Banner Sponsor | $2,500 | Banner surface and rotation unverified |
| atl_push_notification | ATL Push Sponsorship | $2,500 | Send frequency and opted-in audience unverified; distinct from $400 single send |
| atl_city_bg | ATL City Background Sponsor | $3,000 | Historical CityBG not mapped to proven current renderer |
| atl_now_tab_hero | ATL NOW Hero Sponsor | $3,500 | Historical NOW tab label does not establish a current navigation destination |
| atl_neighborhood_spotlight | ATL Neighborhood Sponsor | $6,500 | Exclusive inventory/editorial boundaries unverified |
| atl_reel_native | ATL Reel Native Sponsor | $9,000 | Native Reel surface and reach projections unverified |

All 7 retain their historical prices for reference and use **quote/contract only after surface/audience QA**. Legacy CPMs and projected monthly impressions are not deliverable guarantees or credible published media-kit audience sizes.

## 6. What is not priced yet (deliberately)

- Six additional requested categories are recorded: email promo inclusion, GOOD TIMES social spotlight, influencer posts, influencer visitation/coverage, physical venue marketing, and content/graphics/video production. Each has a scope/proof template but stays **custom quote** until external provider capacity and real cost are confirmed.
- Five consumer-app native placements are technical slot IDs, **not separate proof of five additional monetizable slots or delivery**. They must first be reconciled with standard/premium offers; a semantic similarity (such as 'home card') is NOT an exact inventory match.
- Three existing trade entries are private negotiated exchanges; no generic `$0` BUY NOW. Value, signed consideration, reciprocal deliverables, tax/accounting review and fulfillment proof are needed.

## 7. Exact reconciliation method (no blind join)

A mapping is sellable only when it has:
1. A verified unique production surface/owned channel, true creative dimensions and placement contract.
2. An authoritative inventory key and unit/rotation/period (including frequency cap).
3. Confirmed eligible partner category and Atlanta geography; conflict/exclusivity check.
4. A first-party render or provider test send with timestamped receipt, not an estimate.
5. A customer-visible deliverable definition, service level and cancellation/refund terms.
6. A priced SKU in cents, cost owner, fulfillment owner, margin floor and booking permission.
7. Signed/approved creative rights, sponsorship disclosures and consumer separation.
8. Operational owner, fallback if delivery fails, and reporting mechanism.

**No one-to-one mapping assumed** between a 1920×600 legacy banner and a 300×160 native card, or between historical NOW/Story labels and the current protected GOOD TIMES navigational UX. The current Home / Places / Plan / Entertainment / Profile shell is not to be altered to fit unsold legacy products.

## 8. Fulfillment SOP (seller → ops → evidence → renewal)

| Stage | Accountable owner | Required evidence | Stop/go |
|---|---|---|---|
| Offer QA / publication | GOOD TIMES product + sales ops | Surface mapping, live inventory, costs, approved price, creative format | Cannot sell before pass |
| Qualified sale / proposal | GOOD TIMES sales | Verified venue ID, contact authority, versioned offer/SOW | No invented commitments |
| Authorization / payment (future Action 3) | Payments backend | Approved order, signed terms, verified Stripe webhook / invoice status | No fake paid state |
| Creative intake | Venue partner + creative ops | Licensed asset IDs, required copy, venue rights, deadline | Incomplete = blocked |
| Campaign approval | Creative/editorial + privacy ops | Format check, real venue/event facts, sponsored label | False/missing = reject |
| Placement reserve / scheduling | GOOD TIMES campaign ops | Slot lock with start/end/timezone, allocation receipt | Prevent overselling |
| Deliverable execution | Channel executor | Actual link/screenshot/send receipt/installation proof | Queued != delivered |
| Report and closeout | Analytics + sales | Measured provider events, delivery statement, exceptions | No fabricated reach |
| Renewal | GHL/Muse handoff | Prior campaign actual performance, next authorized offer | External sends only Muse |

Channel-specific evidence:
- **App:** approved creative, unique placement mapping, timestamped real rendered ad screen, booking period, first-party impressions/clicks where instrumented.
- **Email:** consent/suppression, brand-specific sender ownership, provider send + delivered receipts, actual cohort/campaign metrics. Opens are unreliable; do not substitute estimates for verified send counts.
- **Social:** real GOOD TIMES account access, approved post/caption/CTA, public permalink and actual timestamp/insights.
- **Influencers:** approved creator, written SOW, rights, confirmed attendance/post, permalink, clear prominent paid relationship disclosure, truthful experience. Do not purchase or guarantee a positive review.
- **Physical:** venue authorization, print/manufacturing/placement proof, dated installation photo, QR/campaign tracking and removal/renewal agreement.
- **Trade:** signed value-exchange contract, verified reciprocity and proof; neither cash revenue nor zero-dollar sale.

Source: FTC influencer rules, including disclosure and truthful endorsements: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking

## 9. Pricing governance and margin QA

1. Commercial changes require versioned card, approved_by, sales/ops owner, effective date and audit trail. Legacy raw catalogs are **source metadata**, not a price feed. Never duplicate owner edits to multiple tables.
2. Do not ship a price before costs are recorded for paid external services: creator fee, transportation, content shooting/editing, printing/install labor, email incremental provider cost, payment fees and applicable tax.
3. **Proposed margin guardrail:** target >=50% gross margin on service-heavy packages after third-party/direct fulfillment costs, or documented executive signoff for exceptions. This is a go/no-go control, not an observed current margin.
4. Capacity, exclusivity, available dates and proposed discounts must be calculated over actually verified inventory. Package price never implies unlimited sends/posts/events.
5. Avoid blanket reach/CTR, rankings, ticket, reservations or return-on-ad-spend guarantees; measured reports distinguish impressions, clicks, verified conversions and attributed sales.
6. Paid/Partner/Sponsored is visible where appropriate. No editorial score/rank hijacking. No influencer review sentiment purchase.
7. Quote expiration recommended 14 calendar days, with date/availability reconfirmation. Actual contract terms should be approved at sale time.
8. Reversals/refunds require authorizer and provider payment receipt; do not alter old ledger entries without appended correction.

## 10. Technical state and next gating action

Verified staging result on 2026-10-09:
- 1 internal rate card version and 32 offer rows.
- 17 priced rows, 15 unpriced.
- 0 checkout-enabled rows; 0 public-visible rows; 0 marked delivery-verified.
- RLS enabled; read/write for `anon` and `authenticated` revoked; controlled server-only access.
- No new consumer-app campaign, ad creative, rendered placements, payment records or external message sends created by this action.
- Security advisor reports expected informational 'RLS enabled with no policies' for these deliberately private tables. No new-table performance advisor findings were detected.

**Action 2 exit:** Internal rate card, source mappings, bundle math, offer gating, evidence/fulfillment rules **implemented and verified** in Gateway. Catalog is deliberately not live/purchasable, because Action 3 must verify the production advertising surfaces and payment pipeline first.

**Action 3 (future, not performed here):** Build portal UI/auth/claim/asset flow, connect approved catalog to inquiry/proposals, verify exact paid slot capacity, wire Stripe order lifecycle, test end-to-end, then controlled rollout and Muse-only sends after approval.

## 11. Post-setup small venue sales deck (DEFERRED)

After the venue partner portal, bookings/payments, fulfilled-placement proof, and verified audience metrics are real, produce a compact **5–6 slide GOOD TIMES Venue Partner Deck** using the final approved rate card:
1. GOOD TIMES: Why Atlanta Venues Partner With Us.
2. Claim Your Official Venue Profile: free, verified, asset-ready.
3. Monetization channels: app, email, social, creators, physical, custom.
4. Final approved packages: Launch Boost / Weekend Winner / City Leader (or revised verified prices).
5. How it works: claim → customize → reserve → pay → deliver → measure.
6. Partner onboarding CTA / claim QR code, contact and activation instructions.

Use real interface/screenshots, authentic deliverables and measured claims only. Pricing should be pulled from approved active catalog revision at deck generation; **do not reuse internal draft numbers as public promises without verification**.

**Final scope control:** Nothing from this Action 2 authorizes or executes the deck, public marketing, checkout, a payment, an audience send, or consumer app UI changes.
