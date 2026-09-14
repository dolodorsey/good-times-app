# GOOD TIMES Production SOP + Anti-Regression Release System

**Status:** ACTIVE / RELEASE-BLOCKING

The only final state is **PRODUCTION VERIFIED** with evidence.

## Canonical lifecycle
`SPECIFIED → DESIGNED → BUILT → CONNECTED → QA PASSED → BETA VERIFIED → PRODUCTION DEPLOYED → PRODUCTION VERIFIED`

## SOP

1. **Change intake — PM**  
   Record customer outcome, affected screens, data dependencies, analytics, Golden Screen, allowed visual changes, protected elements, risk, and rollback. No ambiguous “make it better” implementation task.

2. **Load governance — Engineer/Agent**  
   Read `AGENTS.md`, Product/UI Constitution, this SOP, Screen Contracts, and relevant Golden Screens before protected work.

3. **Component map — UI Engineering**  
   Map the change to existing tokens/components. Create a new design-system pattern only when an existing variant cannot solve the need.

4. **Lock target — Design/Product**  
   Identify exactly what may change and what may not. Navigation, typography roles, gold semantics, card family, safe areas, and primary CTA hierarchy are protected defaults.

5. **Isolated branch — Engineering**  
   Build broad UI changes on a branch from current main. Never do an unverified redesign directly on production.

6. **Protect app shell — Engineering**  
   Permanent bottom nav: Home / Discover / Plan / Saved / Profile. Plan is the elevated center action. Radar never replaces Plan. Bottom nav remains fixed outside the content scroll container.

7. **Use production-shaped data early — Engineering/Data**  
   Do not build final UI around perfect fixtures. Missing optional fields collapse. No `undefined`, fake ratings, fake open state, fake availability, or invented details.

8. **Implement state matrix — Engineering**  
   Applicable surfaces need loading, success, empty, partial-data, missing-media, disabled, error, retry, offline/degraded, long-copy, and narrow-screen states.

9. **Truth semantics — Product/Data**  
   `CONFIRMED`, `TICKETED`, `AVAILABLE`, `OPEN NOW`, `SOLD OUT`, `PRESALE`, and equivalent claims require backing data. If not verified, use qualified language.

10. **Automated tests — Engineering**  
    Run unit, UI contract, data-state, integration/E2E where relevant, and production build against the exact candidate SHA. P0/P1 failures block.

11. **Multi-device render — QA**  
    Render affected protected screens on compact, standard and large phone widths. Check hierarchy, typography, crops, gold restraint, spacing, fixed nav, safe areas, >=44pt touch targets, overflow, long titles, and keyboard behavior.

12. **Golden Screen diff — Design/QA**  
    Material drift from an approved screen requires explicit approval. Navigation movement, typography drift, arbitrary spacing/radius changes, lost cinematic context, gold overuse, or weakened primary CTA are bugs.

13. **Navigation memory — QA**  
    Open details from Home/Discover/Saved and return. Preserve origin, scroll, query, filters, city, date and taxonomy state when applicable.

14. **Data QA — Data/QA**  
    Verify city, title, local date/time/timezone, venue/location, source-backed image, expiry/cancellation, booking/ticket destination, save sync, Radar dedupe, and planner feasibility. Wrong-city data / false confirmation / expired active content are P0.

15. **Transaction handoff — QA**  
    Test reserve, guest-list/table, ticket, hotel, call, directions, share, and add-to-plan actions. Specific entity context must survive external handoff.

16. **Preview deploy — Engineering**  
    Deploy exact tested branch/commit to Vercel Preview and wait for `READY`. Evidence: preview URL + deployment ID + commit SHA.

17. **Preview runtime check — Engineering/QA**  
    Run core journeys and inspect Vercel runtime error clusters/logs. No unresolved P0/P1 error on core paths.

18. **Supabase advisor review — Data Engineering**  
    After persistent schema changes, run security + performance advisors. Remediate newly introduced critical/high issues or document accepted baseline findings. Never expose service-role credentials in clients.

19. **Evidence review — Reviewer**  
    Review PR/diff, tested SHA, CI, screenshots/diff, data checks, preview, runtime report, and unresolved issues/owners. “Done” is not evidence.

20. **Merge exact candidate — Release Owner**  
    Merge only when all blocking gates pass. If head SHA changes after approval, rerun required checks.

21. **Production verification — Release Owner/QA**  
    Wait for production `READY`, then smoke canonical production: Home, city switch, Discover/search, Tonight/current inventory, Venue/Event detail, Plan/Concierge, Save, Saved plans, Radar entry, Profile, critical transaction links, back-navigation context and visual integrity.

22. **Rollback / incident — Release Owner**  
    Immediately rollback to the last verified deployment for crash/unusable app, wrong-city data, false confirmation, transaction failure, save/plan loss, major auth failure, severe nav regression, or material UI collapse. Contain first; fix forward second.

## Automated anti-regression requirements
- Static test asserts permanent bottom-nav labels/order.
- Protected screens get visual snapshots.
- Cards are tested with missing images, missing metadata and long copy.
- Test failure blocks build/release.
- Vercel Preview must be READY before merge.
- Runtime error review is mandatory.
- Supabase schema changes trigger advisor review.
- Incomplete features stay behind flags instead of shipping half-built.
- Production state is never inferred from local/preview success.

## Bug severity
- **P0:** app unusable, wrong-city/wrong-person data, false confirmation, lost plans/saves, transaction-breaking defect.
- **P1:** core journey broken or material UI/product regression.
- **P2:** important but contained UX defect.
- **P3:** polish/non-blocking issue.

P0/P1 block release.

## Release evidence template
- Release:
- Branch:
- PR:
- Head SHA:
- Tests:
- Build:
- Preview URL:
- Vercel deployment ID:
- Golden Screen diff:
- Data checks:
- Runtime errors:
- Supabase advisors (if schema changed):
- Production deployment ID:
- Production URL:
- Production verification timestamp:
- Known issues:
- Owners:
- Final status: `PRODUCTION VERIFIED` / `NOT VERIFIED`
