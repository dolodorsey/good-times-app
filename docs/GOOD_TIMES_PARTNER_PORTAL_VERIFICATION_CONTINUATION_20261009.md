# GOOD TIMES Venue Partner Portal — Continuation Evidence (October 9, 2026)

Status: BUILT + BACKEND CONNECTED + PROTECTED VERCEL PREVIEW READY. NOT END-TO-END PRODUCTION VERIFIED. NO EXTERNAL SENDS, NO CHECKOUT.

## Verified current rollout
- Vercel protected preview deployment dpl_Ggqbb59ND4vFT6QDZ2XrcN5vXSFX READY; exact 5 files present (index.html, app.js, partners.css, admin.html, admin.js).
- Preview URL: https://good-times-venue-partners-p9nfalr7r-dr-dorseys-projects.vercel.app (Vercel SSO enabled; test with authorized team account).
- Supabase Gateway project dzlmtvodpyhetvektfuo; existing canonical gt_venues unchanged except via future verified staff publishing only.
- Partner login/claim/profile draft/media/inquiry source in public/partners.
- Staff desk: admin.html; authenticated Gateway Auth staff-profile RPC, claim/authority decisions, media approval, inquiry qualification and selective publish.
- One confirmed founder Supabase Auth account bootstrapped as explicit supervisor; legacy gt_partner_admins email list is not authoritative.
- All sensitive staff tables + Muse outbox deny anon/authenticated direct reads. Staff RPCs check dedicated staff registry and confirmed identity, claims require evidence notes.
- Publishing requires verified claim, active membership and exact reviewed draft snapshot; only website, instagram handle, booking_link, short_desc permitted; previous/current values audited.
- Staff supervisor can revoke venue membership; revoked verified accounts lose profile edit and new media upload permission.
- Supabase performance advisor: zero newly surfaced non-unused-index items for gt_portal_* after remediation.
- Simulated unauthenticated/unknown-subject authenticated role reports staff=false. No fabricated user accounts or fake claims created.

## Added migrations on top of Action 3
gt_portal_staff_moderation; gt_portal_staff_publish_compare_and_swap; gt_portal_muse_handoff_queue; gt_portal_staff_fk_indexes; gt_portal_revocation_security; gt_portal_revocation_outer_row_fix. All applied successfully.

## Muse handoff semantics
Private gt_portal_muse_outbox uses idempotent event keys for claim submitted/verified/review-needed/rejected, media submitted/approved, growth inquiry/qualified/proposal. Queue is passive; no marketing send agent connected; no provider email or GHL receipt is claimed.

## Current blockers to FULL COMPLETION
1. Supabase Auth Site URL + allowed redirect host must include final partner Vercel host; real magic-link/OTP sign-in roundtrip not yet user-tested. New Auth email requires user action and should not be triggered without a real operator.
2. Actual end-to-end two-user tenant isolation, staff evidence checks, and claimed venue upload/approval/publish not yet tested with real authenticated users; no venue claims currently exist.
3. UI screenshot proof / 98/100 responsive audit not yet performed; static READY does not mean visual QA passed.
4. Paid inventory/capacity and first-party ad rendering still unverified; internal 32-item price catalog remains public_visible=false, checkout_enabled=false.
5. Stripe account connection was declined/needs authorization in this session; do not write or activate payment flow using guessed account.
6. GHL synchronization with provider receipts and Muse external send approval not yet connected. No external outreach without owner approval.
7. Existing consumer application repo CI test failure (Atlanta snapshot handler expected 200, observed 503) is unrelated to static partner build. Do not bypass the customer app's tests.
8. Final 5–6-slide venue deck and customer-visible prices deferred until actual rates, rendered placements, test payments and approved screenshots are verified.

## Next constrained execution
- Obtain real trusted Auth redirect verification and screenshot QA against SSO-protected preview.
- Run two-account cross-tenant E2E using invited venue representative and authorized staff review.
- Verify actual ad surfaces and capacity, then formally approve sellable price SKUs.
- Wire Stripe only after valid merchant scope and verified checkout/webhook tests.
- Document release/rollback, then invite Muse to execute approved venue-specific sends with provider receipts.
- Create 5–6 slide sales deck with final approved prices and real portal screenshots.

Neither production readiness nor any campaign revenue can be inferred from code deploy or internal catalog records.
