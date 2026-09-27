# GOOD TIMES compact pilot — owner amendment, 2026-09-27

Dr. Dorsey approved separate two-column previews, the enhanced execution plan, and implementation with Go. This is the preview-only Nightlife vertical slice in the existing canonical V4 app. Browser review precedes production promotion and broad propagation.

## Approved changes
Compact two-column categories, subcategories and truthful venue cards; independent Save; compact Discover search; collapsed subcategory choices with Change after selection; no large decorative Discover hero or broad All–Experiences strip. Remove Home Restaurants–This Week shortcuts only in the preview variant. Preserve every taxonomy identity, parent, order, empty lane, Directory/Map, account record, saved plan, detail return and five-tab navigation.

## Data boundaries
Existing eligible taxonomy view; 24 membership rows per bounded request; quality/name/ID keyset cursor; deduplicated venue identities. Query-scoped unique totals remain unknown when unavailable. This does not provide a cross-request database snapshot. This pilot is explicitly PLACE search. Full event search and canonical Tonight repairs remain open. Preserve the current clock, do not silently install the proposed evening policy. The Clubs live read contains media, coordinates and classification gaps still requiring review.

Failed reads expose Retry instead of false zero results. Top-level Discover reentry resets discovery state; detail Back retains it. Unsave failure must not be acknowledged as success. Map describes coordinates on loaded records and does not invent customer location. Plan action prefills the existing planner only; it is not a generated or confirmed booking.

## Isolation and evidence
Compile-time preview flag; always disabled for VERCEL_ENV=production. No URL or localStorage can enable it. Preserve final eager founder stylesheet and all existing required tests. Separate loopback fixture tests from live account/provider tests. Missing images are honest fallback, not invented venue photos. No database writes, production promotion, subscriptions, actual reservations, marketing sends, source scheduling changes or reactivation of paused jobs. Branch/PR CI has no schedule. Production verification and owner browser approval remain outstanding.
