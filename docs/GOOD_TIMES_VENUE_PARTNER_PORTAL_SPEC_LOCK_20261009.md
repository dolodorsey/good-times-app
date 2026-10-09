# GOOD TIMES — Venue Partner Portal / Official Profile Claim Contract v1.0

**Status: SPECIFIED / SCOPE LOCKED — NOT BUILT, NOT CONNECTED, NOT DEPLOYED.**
**Locked:** 2026-10-09
**Brand:** GOOD TIMES only. Do not merge partner data, billing, or creative with any other Kollective brand.
**Launch city:** Atlanta only. Other-city warehouse inventory is not a public product launch.
**Scope of this document:** Action 1 only — complete functional and technical specification for a self-service venue profile/claim portal, asset intake and sales-ready conversion path. This document does not approve pricing, commercial package publication, payments, campaign fulfillment, launch emails, or a production release.

## 0. Non-negotiable inheritance

Read and obey AGENTS.md, docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md, docs/GOOD_TIMES_PRODUCTION_SOP.md, docs/GOOD_TIMES_SCREEN_CONTRACTS.md and the approved customer Golden Screens before implementation. This B2B portal must never replace, redesign, or downgrade the protected GOOD TIMES consumer experience. Protected consumer permanent navigation remains **Home / Places / Plan / Entertainment / Profile** (Plan centered); Radar remains a destination, not a replacement tab. Legacy contradictory docs do not override AGENTS.md/current screen contracts.

GOOD TIMES partner acquisition is **venue-level**, not an indiscriminate email signup. Core path:

Qualified venue + validated recipient → authorized venue-specific invitation → claim landing with prefilled canonical venue → authentication → authority verification → approved organization/venue membership → edit official profile + upload permitted media → approval/publish → growth marketplace and customized marketing offers → paid campaign in later phase → evidence-backed reports and renewal.

**Primary invitation CTA:** Claim Your Free Official Venue Profile.
**Secondary invitation CTA:** See What GOOD TIMES Can Do for Your Venue (read-only offer preview; no misleading prices).

A claim link is a lead-routing pointer, **not proof of ownership or authorization**. Every claimed profile must bind to the canonical venue ID after verification. Free profile creation cannot be conditioned on payment.

## 1. Verified existing assets and boundaries (checked 2026-10-09)

- MCP Gateway Supabase project: dzlmtvodpyhetvektfuo.
- Authoritative venue entity: public.gt_venues, including its stable UUID id, city_key, category, address, website, photos, verification flags; **2,370 records** observed (record count does not imply all active, unique, bookable or verified).
- Existing intake: public.gt_partner_applications with GT venue ID, contact/marketing fields, asset URLs, approval fields; **0 submissions** observed.
- Existing role request/admin tables: gt_partner_role_requests and gt_partner_admins, the latter email-based; neither is an acceptable substitute for per-venue memberships/RLS.
- Existing ad metadata in Gateway: gt_ad_inventory (7 records), gt_ad_placements (10 records), not a verified unified public rate card.
- Consumer GOOD TIMES Supabase project: czocqfaovfpjweayniuw. Existing 5 active gt_ad_placements definitions, gt_ad_campaigns/gt_ad_creatives/gt_ad_events currently empty. Commercial fulfillment mapping comes later.
- Existing storage bucket: gt-partner-assets is **PUBLIC**, max file size **10 MiB**, allowlisted types JPEG/PNG/WebP/PDF; never store ownership/identity documents or private staff information here. A future private evidence bucket must be provisioned with scoped access before verification upload goes live.
- Canonical software repository: dolodorsey/good-times-app. Existing Vercel project: good-times-app (team_TbL7iJTpBTe3gF5TwBLAzSbV). This portal contract is for a **separate B2B web experience**; do not redirect the existing consumer app root or replace its mobile/web UX.
- The GOOD-TIMES-CONCIERGE-2026 repository is a separate Rork/Expo consumer app and is not the authoritative codebase for this Vercel B2B portal.

All observations above are inventory/readback, not proof that a venue portal, ownership verification, checkout, paid sends, or fulfilled placements are live.

## 2. Product boundaries and route architecture

- Deliver a responsive, accessible, premium GOOD TIMES **Partner Portal** on web. Desktop-first for business owners, fully usable on mobile. Keep it isolated from customer screens, state, route shell, and navigation. Suggested route namespace: /partners (final domain/route to be verified against production router before implementation).
- Route reservations (illustrative, not live): /partners, /partners/claim, /partners/verify, /partners/onboarding, /partners/assets, /partners/preview, /partners/dashboard, /partners/growth, /partners/orders, /partners/results, /partners/team, /partners/support.
- Keep all app-side venue detail/search/ranking sourcing through the existing canonical GOOD TIMES data API. No second venue table, no reset of editor curation and no ownership-based quality/rank boost.
- Commercial paid content must remain clearly labeled and separate from independent recommendation quality.
- An organization may manage multiple venues; each venue remains individually identifiable/permissioned by gt_venues.id, with its own offers, media, reporting and billing allocations.
- No public city expansion beyond Atlanta. Future-city records may be kept private for research.
- Venue owner onboarding must be progressive, save drafts, and survive browser/device interruptions without losing fields.

## 3. Exact screens and state contracts

### P01 — Partner invitation / claim landing
Job: convert a pre-qualified email visitor into a venue-specific claimed-account intent.
- Title: Welcome to GOOD TIMES, [Verified Venue Name].
- Show preloaded logo/hero only when approved and identity-matched. Show canonical name, neighborhood and partial public address from gt_venues.
- Explain free listing benefit and a truthful 3-step path. Primary CTA Claim My Official Profile; secondary What Can GOOD TIMES Do For Us?
- Opaque one-time invitation reference resolved server-side and bound to specific venue + intended recipient + expiry. No sequential ID token acting as a credential; do not embed PII or admin grants in URLs.
- Generic /partners allows safe search/select for venues not pre-invited, with manual claim verification; it must not reveal private contacts or claim holders.
- States: valid prefill; expired invite (request new); already-claimed conflict (request access/transfer, no account leak); mismatch; unlisted business (submit candidate, never silently create canonical venue); blocked/suppressed recipient; loading/error/retry.

### P02 — Secure sign-in and ownership/authorization verification
Job: prove identity AND operating authority before edit rights are granted.
- Email OTP/magic link via verified auth system with login/session/CSRF/rate-limiting controls; provider/source selection based on verified Gateway Auth configuration. Distinguish authentication from business authority.
- Collect full name, role, business email, optional phone, relationship to venue, and evidence method: official-domain mailbox, venue website reference, verified business channel, authorized invitation from existing owner, or staff manual review. A verified email domain alone is not automatic ownership.
- Staff review for disputed, high-risk, mismatched, or unverifiable claims; never auto-accept a claimant because an email link was clicked.
- Consent to partner terms, media rights and publication policy as separate versioned acknowledgments.
- Status machine: invited → initiated → email_verified → verification_pending → verified / rejected / more_info_requested / disputed / withdrawn. Claim state is immutable history with a separate current status; no lost evidence.
- All venue mutations blocked until verification succeeds and membership is activated.

### P03 — Organization and venue onboarding
Job: capture official details without a lengthy form.
- Step A: organization display name and primary operator details.
- Step B: location confirmation via existing canonical venue record, role, category/subcategory, public contact/website/social handles, reservation/ticket link, hours and address.
- Step C: programming/marketing: weekly specials, recurring events, promotions, target guests, priority nights, desired leads/reservations/ticket sales, optional budget band (do not require purchase).
- Step D: review/submit, with visible profile completion meter and 'save and finish later'.
- Prefill only source-backed fields; distinguish existing canonical data from proposed user-edited values.
- Moderated updates: hours, public phone, address, category, event time, links and claims of open/available require source/reviewer QA before consumer publication. Partner content does not overwrite independent editorial scores, cultural tags or externally verified evidence.

### P04 — Asset center and upload
Job: make venue assets reusable by approved GOOD TIMES campaigns.
- Intake types: primary logo, cover image, gallery, optional menu PDFs, promo flyers, event artwork, vertical video submissions (videos require approved storage path and capacity; existing public gt-partner-assets bucket does NOT allow video).
- Proposed delivery recommendations: logo >=1000px square, cover 1600×900, photo gallery high resolution, vertical creative 1080×1920, caption/crop control. Show accepted actual formats/limits as validated at runtime, never claim unsupported upload types work.
- Each file carries venue_id, uploader_id, organization_id, asset_type, original_filename, MIME, dimensions/duration, checksum, legal usage attestation, provenance, upload/approval/publish status, source and expiration/permission metadata.
- Guardrails: type/MIME and content sniff, malware scan for PDFs, size/format limits, filename sanitization, private object ACL on pending assets, thumbnail processing, no personal ID in public buckets, no direct public publish. Use server-authorized signed upload operations or strict RLS by venue role.
- If approved assets are later made public, move/copy only cleared derivatives to a published asset path. Preserve original evidence and media QA decisions.
- Asset rejection must show reason and allow reupload without losing earlier proof.

### P05 — Official profile preview and publication
Job: venue sees exactly what consumers will see before publication.
- Preview GOOD TIMES venue detail with current approved identity, venue-specific verified media, hours, official links, categories, events and CTAs.
- Comparison: currently published vs proposed edits; missing facts collapse gracefully. Clear Draft / Submitted / Needs Changes / Approved / Published status.
- Publication approval is a server-side staff/editor action; no raw public self-publishing, no false Verified badge.
- New or updated partner assets enter separate verification/editorial queue. Profile status and claimed account status remain distinct.
- Keep working links, back-to-edit, responsive cropping and missing-media fallback; no invented opening hours, tickets, available reservations or ratings.

### P06 — Partner dashboard
Job: activate repeat engagement after first claim.
- Above the fold: official venue identity, verification state, public listing preview, profile completeness and one relevant next action.
- Cards: My Profile; Upload Assets; Upcoming Events; Growth Opportunities; Orders & Billing (later); Campaign Results (later); Team Access; Partner Support.
- Smart next action: finish claim → finish profile → upload missing assets → preview/publish → view offers → request proposal → campaign results → renew.
- Show no zero/fictional revenue, impressions, placements or contracts. Empty states must say 'Not yet available', not present invented success.

### P07 — Growth Marketplace preview (Action 2 / Phase 2 implementation only)
- Read-only product categories from locked commercial taxonomy: App Promotions, Email Inclusion, Social Spotlights, Influencer Posts, Influencer Visits/Experience Coverage, Physical Marketing, Event Boosts, Content Production, Push Notifications, Bundles.
- Phase 1 may show 'Learn more / Request a proposal / Tell us your goals', but **no unverified price, checkout, availability, audience size or fulfillment promises**.
- Each future sellable offer must describe market, exact deliverables, channel, run dates, eligibility, creative specs, exclusions, max capacity, price rules, cancellation, approval owner and evidence expected. Never represent a pending paid visit as a guaranteed positive review.
- Growth recommendations must be venue-type and event-day aware, not a static universal upsell wall.

### P08 — Admin verification and editorial queues
- Claim review queue with evidence link, duplicate-conflict detection, authorized reviewer, timestamp and decision reason.
- Profile change review queue with source comparisons, publication/rollback, asset QA and rejected items.
- Separation of duty: ops staff can review, but partner user cannot approve its own venue, bypass verification or modify paid inventory.
- Audit trail per venue and per revision with reviewer receipts. Human dispute/transfer workflow for owner departure or multiple competing claimants.

## 4. Permissions and tenant isolation

| Role | Can view venue | Edit draft | Upload assets | Invite venue teammates | Billing later | Verify claim / publish |
|---|---|---|---|---|---|---|
| Unauthenticated prospect | Public fields only | No | No | No | No | No |
| Claimant pending verification | Prefill + own request | Limited own draft only | Pending/private if policy permits | No | No | No |
| Venue Owner (verified) | Assigned venues | Yes | Yes | Yes | Yes | No |
| Venue Manager (delegated) | Assigned venues | Yes | Yes | Delegated role only | Optional permission | No |
| Venue Marketing/Editor (delegated) | Assigned venues | Yes, marketing scope | Yes | No | No | No |
| Venue Finance/Analyst (delegated) | Assigned venues | No | No | No | View/invoices only | No |
| GOOD TIMES Partner Ops reviewer | Scoped moderation | Reviewer queue | Review | Assign per policy | Future fulfillment review | Yes, audited |
| Muse outreach executor | Lead/send workspace only | No partner write entitlement | No | No | No | No |

Authorization derives from server-validated membership scoped to organization_id AND venue_id. **Never** authorize from editable user_metadata or from gt_partner_admins.email alone. Enforce row-level policies for all exposed relational tables and storage.object paths, using auth.uid with actual venue memberships plus separate audited elevated server operations. Deny by default. No service role keys in browser bundles, GitHub or outgoing emails. Test two unrelated partner organizations for cross-tenant isolation.

## 5. Proposed incremental backend contract — not yet migrated

Reuse:
- Gateway public.gt_venues = canonical venue ID and approved consumer data.
- Gateway public.gt_partner_applications = existing application intake compatibility surface, not authoritative ownership grant.
- Gateway gt_ad_inventory / gt_ad_placements = existing commercial metadata requiring Action 2 price reconciliation before sale.
- GOOD TIMES app's existing GT ad surfaces are separate from the claim flow; no direct campaign or pricing write in Action 1.
- Existing gt-partner-assets public bucket may hold **cleared public files only**, within its current MIME/size limits.

Proposed new Gateway entities (create only during build, after migration review):
1. gt_partner_organizations — legal/display organization, primary contact, status.
2. gt_partner_memberships — organization_id, gt_venue_id, auth_user_id, role, scoped grants, verification and revoked_at; unique active constraints.
3. gt_venue_claims — venue_id, claimant_id, invite_id, submitted evidence refs, status, decision/reviewer/expiry, dispute links.
4. gt_partner_invites — opaque token hash, email hash or intended identity, venue_id, created/expiry/consumed/revoked; one-time token and resend guardrails.
5. gt_venue_profile_edits — venue_id, revision, patch JSON, field provenance, submitted/reviewed/published state, current canonical revision.
6. gt_partner_media — owner, venue, storage path, MIME/size/checksum, rights/license/source, review/publish status and derivatives.
7. gt_partner_activity — append-only audit events and idempotency key, actor, resource, old/new state, source, receipt.
8. gt_partner_marketing_interest — venue ID, offer category/key, request, status, source and follow-up owner; **interest only**, no phantom orders.

Identity and storage:
- Confirm existing Gateway Supabase Auth tenant/provider configuration before choosing auth bridge; do not assume the consumer app project and gateway share user sessions or user IDs.
- Create a separate PRIVATE verification-evidence storage bucket or equivalent approved isolated private path. Never use gt-partner-assets or generic public brand-media for claim documents.
- Define unique constraints, tenant RLS, insert/update/select policies and privileged server handlers; do not write user-entered financial/verification state directly from browsers.
- Preserve venue UUID when approving partner registration. Duplicate/alias matching follows GOOD TIMES strict matching (reviewed alias or unique fully normalized address only; never street number/fuzzy guess). Owner claim cannot merge two venues without evidence.

## 6. Invites, analytics and GHL handoff

Muse remains the only external outreach sender after owner-approved targeting/content QA. ChatGPT, Dot, agents, and portal automations may **prepare**, qualify, personalize, dedupe, document, and recommend, but must not send marketing emails externally under the current owner directive.

Before Muse send: qualified venue_id → human-confirmed official business recipient/channel → DNC/suppression and consent/legal basis checks → dedupe → sender verification → personalized message and CTA → approval → Muse executes → provider receipt.

Use idempotent, brand-isolated event types:
- partner_invite_prepared (not sent)
- partner_invite_sent (only after actual provider receipt)
- partner_claim_started
- partner_email_verified
- partner_claim_submitted
- partner_claim_verified / partner_claim_rejected / partner_claim_disputed
- partner_profile_draft_saved
- partner_asset_uploaded / partner_asset_approved / partner_asset_rejected
- partner_profile_published
- partner_growth_offer_viewed
- partner_growth_interest_requested

CRM mapping:
- GHL source GOOD_TIMES only; use exact gt_venue_id, organization id, authorized contact id, invite id, verified receipt id, segmentation and status.
- Pipeline: Qualified → Invite Prepared → Invite Sent Verified → Claim Started → Verification Pending → Official Partner Verified → Profile Complete → Growth Interest → Proposal Requested → (future) Paid → Campaign Live → Renewal.
- No claims of sent/opened/booked/paid without provider evidence; clicking email or requesting quote is not a purchase.
- If a user claims without prior outreach, tag organic_source and let operator qualification continue. Owner transfer/dispute must pause outreach/permission changes.

## 7. Critical flows with measurable acceptance

**F1 Authorized existing venue:** venue-specific invite → OTP sign-in → submit authority → staff approval → membership activates → prefilled venue editor → upload approved asset → preview → staff publish. Expected result: same canonical gt_venue_id end to end; venue public profile updated only after moderation.

**F2 Missing venue:** search yields no confident match → manual submit for source review. Expected: unlisted candidate stored separately; no new canonical venue silently inserted/published.

**F3 Existing claim/transfer:** another claimant holds venue → request staff arbitration. Expected: no ownership takeover, no private claimant disclosure, no second effective owner without approved transfer.

**F4 Bad/expired invite:** invalid/consumed/expired token. Expected: harmless error, no venue details leaked; secure resend/renewal path.

**F5 Cross-tenant attack:** user A guesses user B's venue_id or media path. Expected: every data and storage write returns authorization denial, no data leak.

**F6 Media moderation:** upload unsupported file/oversize/unsafe PDF + valid photo. Expected: invalid blocked with clear reason, valid queued; never auto-publish and private evidence never publicly accessible.

**F7 Public consumer untouched:** production consumer root and five primary tabs, Plans, Saves, Radar and venue detail are unchanged. Paid placement does not alter editorial base scores, venue identity, or organic recommendation ranking.

**F8 Partial/empty/offline:** missing logo, no email, no social, no offers, interrupted upload, mobile keyboard, narrow viewport, long venue names and slow network. Expected: no dead ends, graceful fallback, recoverable state and retry.

## 8. Visual and release gate — minimum 98/100

Partner portal uses GOOD TIMES protected brand tokens with a distinct business navigation shell. Dark cinematic/editorial hierarchy, genuine venue imagery, restrained semantic gold, balanced grid/spacing and accessible labels. Do not reproduce the consumer bottom navigation inside B2B screens. Do not introduce generic SaaS template cards or duplicate UI design systems.

**Hard requirements:**
- Desktop + responsive compact/standard/large mobile and tablet screenshots; light/dark accessibility where applicable, safe areas, no horizontal overflow.
- >=44pt touch targets, meaningful empty/error/loading/disabled states, keyboard navigation, visible focus, sufficient contrast and reduced motion handling.
- Profile preview and customer-facing venue page match truthful source-backed data.
- Conversion CTA, upload controls, role grants and back-to-edit states actually work.
- Screenshot evidence at top/mid/bottom for onboarding, assets, preview, dashboard and admin moderation.
- Cross-tenant access, identity takeovers, invite replay, arbitrary file upload, URL tampering, fake approval, duplicate profile and permissions regression are release-blocking.
- Scorecard floor **98/100** for layout balance, media quality, typographic system, usability, performance and execution safety; any P0/P1 is an automatic failed gate regardless of score.
- Follow production SOP before merge: exact SHA, tests, build, Vercel Preview READY, visual diff, real end-to-end flows, runtime error review, security/performance advisors after DDL. Do not call a READY preview production verification.
- If the portal cannot pass, leave it unlaunched behind routing/feature controls. No direct consumer app replacement, no sending unverified invites to 2,370 venue records.

## 9. Out of scope for this locked Action 1

- Action 2: official rate card, 7-vs-10-vs-5 placement reconciliation, pricing, bundling, margin, fulfillment rules and inventory.
- Action 3: actual portal UI/API/DB migrations, Stripe and partner send links, QA/deploy and Muse outreach handoff.
- No Stripe charges, no marketing sends, no partner claim grants, no partner data migration, no city expansion and no production route switch under this spec-only change.

## 10. Implementation-ready task slices (future actions, not executed)

A. Validate current auth/provenance and design isolation/route ownership against existing app.
B. Approve proposed migration and private storage with RLS, tests, advisors.
C. Build venue-specific invite/claim/sign-in and staffed verification queue.
D. Build secure draft/edit/asset processing and public preview/moderation.
E. Build partner dashboard and *read-only* growth inquiry CTA.
F. Wire brand-isolated GHL event outbox and receipt semantics (Muse controls sends).
G. QA full matrix + protected consumer regression + 98/100 screenshot audit, then decide rollout.
H. Only after Action 2 catalog signoff, enable paid inventory/checkout/campaign lifecycle.

### Lock acceptance for current action

- [x] Canonical repo, city, database IDs, venue counts, existing schema and bucket inspected.
- [x] Conversion CTA, exact screen jobs/states, role matrix, claim authority and media pipeline specified.
- [x] Single canonical venue ID, data separation and GHL/Muse rules recorded.
- [x] Consumer UI protection and 98/100 QA/release criteria recorded.
- [ ] Backend migration, portal implementation, paid products, outreach and deployment — **not part of Action 1; not executed**.

**Last line:** A saved specification is **SPECIFIED**, never **BUILT**, **CONNECTED** or **PRODUCTION VERIFIED**.