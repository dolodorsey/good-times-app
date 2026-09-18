# Home visual correction — September 18, 2026

Owner direction: improve imagery, remove oversized single sports feature, use readable modern typography, preserve existing five destinations. This supersedes earlier serif direction for product headings; the GOOD TIMES brand remains.

## Changes
- Four compact Home highlights: next concert, next sporting event, next festival, and highest-ranked dining choice. Date sorting is stable, so existing quality/personalization rank breaks date ties. Missing categories are filled with remaining ranked events; imagery never controls inclusion.
- Product headings use DM Sans, including overriding the legacy premium wrapper that forced Playfair.
- Reviewed exact-ID Atlanta restaurant media replaces null/generic defaults; existing real curated media is retained. Generic/repeated-image safeguards remain in place.

## Media provenance and visual review
Public media URLs remain hosted by the official source. This is source attribution, not a claim of exclusive licensing. Canonical IDs, URLs and source pages are in `good-times-reviewed-media.js`.

- Heritage Supper Club: https://www.heritagesupperclub.com/ — DSC09328.jpeg, actual plated food and diner. Verified readable crop.
- Sargent: https://www.sargent-atlanta.com/ — Flower_Artwork.png, official illustrated brand asset; visibly labeled BRAND ARTWORK, not represented as venue photography.
- Pataaka: https://pataakaatl.com/ — official Open Graph image showing branded dining room. Rejected ingredient cutouts and Kerala travel scenery as unsuitable venue representations.
- Sozou: https://sozouatl.com/ — og-outside-chefs.jpg, official founders outside the restaurant.

## Verification
Captured and inspected phone screenshots during implementation. First capture exposed remaining forced serif and generic-image interception; corrected both before release. Second review confirmed all four restaurant graphics, readable titles, mixed Home choices, and unchanged Home / Discover / Plan / Saved / Profile navigation.

Regression checks cover 320, 390, 430 and 834 widths; first two full highlight choices fit above navigation at standard phone widths. Category diversity, actual computed font, 44px controls, planning inputs, event date handoff and Shake repeat avoidance are asserted. Production evidence and deployment identifiers are recorded in the task output report after release.
