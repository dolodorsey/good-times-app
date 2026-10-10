# GOOD TIMES — Partner Portal Action 3 Implementation & Release Evidence

**Date:** October 9, 2026 | **Scope:** GOOD TIMES Atlanta venue partner acquisition (not consumer app).  
**Status:** BACKEND CONNECTED / ISOLATED STATIC PREVIEW BUILT — **NOT PRODUCTION VERIFIED**.  
**Prior specs:** Draft PR #206 (Action 1), Draft PR #207 (Action 2). This branch derives from Action 2's branch, not from a merged main.  
**No automatic external venue sends.** Muse owns approved outreach; OTP is a user-triggered transactional authentication event only.

## Implemented in Gateway (project dzlmtvodpyhetvektfuo)

Migrations applied:
- gt_partner_portal_claim_intake_v1
- gt_partner_portal_perf_hardening
- gt_partner_portal_verified_draft_edits

Provisioned:
- public.gt_portal_claims — canonical venue UUID referenced by verified claim; alternate manual unlisted submission. Email identity verified by Gateway Auth JWT, and applicant cannot directly change status/reviewer fields. Owner only reads/updates limited draft columns. Verified claim holders can propose revised drafts without changing the published consumer page.
- public.gt_portal_memberships — server-issued roles for staff-approved venue ownership (no partner write grant).
- public.gt_portal_media — owner-only pending submission metadata and rights acknowledgment.
- public.gt_portal_interests — non-binding marketing inquiries, not payment or fulfilled promotions.
- storage bucket gt-partner-pending — PRIVATE, up to 10 MiB, JPEG/PNG/WebP/PDF; storage path scoped to auth user UUID + owned claim UUID. Pending uploads cannot be published without operations review.
- RLS applied, anonymous grants denied for personal tables, signed-in partner reads/writes scoped to auth.uid, private Storage prefix protected.
- Existing canonical public.gt_venues reused; no second venue directory, no public mutation/publishing from applicant. 298 active/verified Atlanta venue records in canonical table at 2026-10-09 readback, public RLS further restricts display quality.

Gateway Action 2 commercial rate card remains internal only. Partner UI deliberately displays category choices, **not invented prices, placements, or checkout**.

## Implemented in GitHub

Source repo: dolodorsey/good-times-app
Branch: feat/good-times-partner-portal-20261009
- public/partners/index.html — separate responsive B2B partner shell; no imports to or modifications of src/main.jsx consumer UX.
- public/partners/partners.css — distinct premium GOOD TIMES venue interface with desktop/mobile grids and reduced-motion rules.
- public/partners/app.js — Gateway Auth email link/OTP handling, exact venue selection, unlisted venue request, claim submission, own submitted-claims dashboard, private media, draft updates and marketing interests.
- vercel.json branch-only path reservation /partners → /partners/index.html; the existing consumer fallback and protected screens remain untouched on main.
- supabase/migrations/20261009020000_gt_partner_portal_claim_intake_v1.sql plus two hardening migrations.
- None of the production consumer assets, auth sessions, mobile navigation, ranking, stored plans/saves or release safeguards were intentionally modified.

## Separate Vercel environment / deployment

Created dedicated project good-times-venue-partners (prj_yRrgAigjxEa9iIaRpYjvZNjXNjd3), configured with Vercel Authentication protection for .vercel.app access.
- Existing consumer project good-times-app remains separate and unchanged.
- Git-driven initial builds of the portal branch failed on an **unrelated existing** consumer test in scripts/finish-atlanta-occurrences.test.mjs: expected HTTP 200 but observed 503 in historical Atlanta snapshot handler. This test was **not bypassed or modified**.
- For isolated B2B visual access, fetched the exact three partner files from GitHub and deployed them directly as static files into the separate Vercel project. This avoids modifying the consumer build gate. The static deployment is not a substitute for the main consumer release checks.
- Deployment links/status must be verified from Vercel readback before sharing. Direct static deployment does not imply authenticated workflows were exercised with a real account.

## Currently functional by design (code-path implemented; live user test still required)

1. User enters a business email and requests a Supabase Auth magic link or verifies an OTP code.
2. User searches public eligible Atlanta venues from canonical gt_venues, explicitly chooses exact record or indicates venue not listed.
3. Authenticated user requests claim; saved as pending_review, never auto-approved.
4. User sees own claims and can save proposed profile edits; verified claim can likewise propose edits without publishing.
5. User uploads photo/menu asset to private pending bucket, with rights attestation and own-claim metadata.
6. User explores marketing categories and submits interest; status new, not a Stripe charge, reservation or actual campaign.
7. User sees own submitted asset/claim/inquiry records.

## Critical remaining release gates (NOT YET CLAIMED COMPLETE)

### Identity and staff operations
- Confirm Supabase Auth redirect allowlist includes final canonical partner host (and whichever protected preview host is used). Transactional email delivery, verification-link return and session persistence must be tested with a real operator account.
- Build and activate a **verified GOOD TIMES admin review console**, separate from public partner workspace, to inspect evidence and approve/reject/dispute claims and profile drafts. The existing Gateway gt_partner_admins email list is not an adequate standalone grant of venue/operations permissions.
- Staff approval must require independent authority checks against the venue; a clicked email link alone never approves or inserts membership. Server-only enrollment of gt_portal_memberships and reviewer audit receipts remain necessary.
- Public publishing of approved media/profile edits must be implemented as reviewed server operation; not executed in this action.

### App + channel/payment integration
- Confirm matching consumer advertising surfaces and rate-card sellability; Action 2 pricing is internal, no verified render/capacity.
- Implement Stripe checkout/order ledger only after approved SKUs/capacity and payment webhook verification.
- Connect authorized GHL source/event and Muse handoff; no outgoing marketing sends until owner-approved and provider receipts.
- Integrate approved venue data and cleared media into customer-facing gt_venues without overwriting editorial verification/ranking. Do not migrate users across Supabase Auth projects without identity assurance.

### Release evidence and QA
- Visual screenshots for 390px, 768px, 1440px (both long/empty/errors; no overlap/overflow), keyboard and contrast audit. Visual floor 98/100 not yet evaluated.
- Auth user A / user B cross-tenant negative read/write, expired session, invalid OTP, disputed/duplicate claim, staged upload MIME and size, denied approval write.
- End-to-end claim → staff verification → membership → profile draft → published approved media → inquiry → booked paid product must be exercised before calling full setup complete.
- Verify preview HTML/CSS/JS actual HTTP status and Vercel deployment readback; no static READY label alone establishes correctness.
- Record provider receipt for any actual outreach separately. Unverified/queued never equals sent.
- Subsequent 5–6 page venue deck, with final pricing and real screenshots, must be produced **after** those release gates, not during this partial setup.

## Manual safe staff workflow (until audited admin console)

Only authorized GOOD TIMES staff with audited privileged database administration should inspect pending claims in Supabase Dashboard. Review venue authority evidence outside the public media bucket. To approve, use a transaction that:
1. Locks the claim and verifies correct Atlanta canonical venue UUID, evidence, claimant identity and no ownership dispute.
2. Writes reviewer ID, status=verified and timestamp.
3. Creates/updates matching gt_portal_memberships for exactly that auth.user and gt_venues UUID.
4. Appends an audit trail with source, reviewer and evidence locator.
5. Does NOT modify gt_venues or publish raw uploads until editorial approval.

**No bulk or automatic approvals.** Never execute generic SQL to approve all pending rows. Manual unlisted claims cannot be granted canonical membership until an approved exact canonical venue record exists.

**Executive readback rule:** This build is not sale-ready, checkout-ready, verified-owner-ready or marketing-send-ready just because the pages and private intake tables exist.
