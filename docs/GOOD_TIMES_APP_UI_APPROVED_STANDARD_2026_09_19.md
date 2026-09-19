# GOOD TIMES — APPROVED APP UI STANDARD

**Approved:** September 19, 2026  
**Owner status:** APPROVED  
**Authority:** Minimum visual and interaction standard for the signed-in GOOD TIMES app.

## Non-negotiable product contract

This work is a UI upgrade. Do not change or remove existing product capabilities, data sources, authentication, customer state, action handlers, or the protected permanent navigation:

**Home / Discover / Plan / Saved / Profile**

No implementation may be considered an upgrade if it reduces or replaces existing functionality.

## Approved visual direction

The approved combined phone-screen reference is stored in the persistent Library at:

`/GOOD TIMES/Standards/GOOD_TIMES_APP_UI_STANDARD_2026-09-19.jpg`

The standard requires:
- compact cards and dense useful information;
- no oversized headers;
- cinematic and image-rich modules rather than dead black expanses;
- warm black / ivory / gold palette;
- modern sans-serif for interface hierarchy, controls, metadata and card titles;
- editorial serif reserved for cinematic hero/detail moments;
- verified exact imagery for named events/places;
- premium no-photo treatment instead of a false or generic named-place photo;
- preserved five-item bottom navigation with central Plan action;
- touch targets that remain usable on phone.

## Approved Home secondary views

Home may expose a secondary in-app control:

**For You / Upcoming / Tonight**

This is not a sixth permanent navigation destination.

### Upcoming

Upcoming is an overall newsletter-like chronological list powered by the same already-loaded, current GOOD TIMES inventory.

It must:
- remain more list-like than card-heavy;
- group events chronologically;
- show date, time, venue, category/status and compact exact imagery;
- open the existing Event Detail;
- use the existing Save action;
- keep current source/timezone/freshness rules;
- contain no hard-coded historical newsletter facts.

### Tonight

Tonight is the same compact editorial-list system restricted to the current city/service day.

## No-downgrade verification

Before release, capture and inspect the actual app bundle at:
- 320×568
- 390×844
- 430×932
- 834×1194

Release is blocked by:
- any permanent-nav change;
- any existing action or feature removal;
- oversized cards/headers returning;
- app-wide serif typography;
- broken image provenance;
- overflow or safe-area collisions;
- stale/hard-coded newsletter content;
- failed auth/runtime/customer-shell/geometry tests;
- missing screenshot evidence.

The approved standard is a floor, not an aspiration.
