# GOOD TIMES App Store screenshot production spec

## Output target

- Locale: en-US
- Orientation: portrait
- Primary iPhone target: 1290 × 2796 px (accepted 6.9-inch App Store screenshot size)
- Format: PNG or JPEG/JPG
- Alpha/transparency: none
- Screenshot count target: 8
- Every image must depict the real GOOD TIMES app UI or a faithful capture of the shipped UI. Do not fabricate capabilities that are not in the app.

## Screenshot order

### 01 — NOW
**Capture:** Signed-in Now/Home with current-city hero plus timely event/venue cards.
**Overlay headline:** YOUR CITY. RIGHT NOW.
**Overlay support:** The moves worth leaving home for.
**Why first:** Establishes the core GOOD TIMES promise immediately.

### 02 — DATES
**Capture:** Dates surface with calendar/date controls and event inventory.
**Overlay headline:** PICK THE NIGHT.
**Overlay support:** Browse what is happening by date, category, artist, venue, or vibe.

### 03 — BUILD MY NIGHT
**Capture:** Build surface showing occasion/group/budget/area/vibe controls or a generated itinerary.
**Overlay headline:** BUILD THE WHOLE NIGHT.
**Overlay support:** Give GOOD TIMES the vibe. Get the plan.

### 04 — EXPLORE
**Capture:** Explore taxonomy with multiple lifestyle lanes visible.
**Overlay headline:** FIND YOUR LANE.
**Overlay support:** Nightlife, food, culture, music, experiences, and more.

### 05 — MAP
**Capture:** Map-ready venue/event discovery or directions transition surface.
**Overlay headline:** SEE WHAT'S AROUND YOU.
**Overlay support:** Move from discovery to directions fast.

### 06 — VAULT
**Capture:** Vault with saved events/venues or ticket-oriented saved state.
**Overlay headline:** SAVE THE MOVE.
**Overlay support:** Keep the places and events you do not want to lose.

### 07 — PLANS
**Capture:** Plans with at least one generated itinerary visible.
**Overlay headline:** YOUR NIGHTS, ORGANIZED.
**Overlay support:** Keep, share, and route the plan from one place.

### 08 — ACCOUNT + PRIVACY
**Capture:** Account center with Privacy Policy, Support & Privacy Choices, sign out, and Delete account permanently visible.
**Overlay headline:** YOUR ACCOUNT. YOUR CONTROL.
**Overlay support:** Privacy, support, and permanent account deletion built in.

## Visual system

- Keep GOOD TIMES gold/dark visual language.
- Preserve shipped UI proportions; do not redraw controls into a different product.
- Use short premium headlines outside or above the captured UI only when composition needs it.
- Never cover key buttons, event names, dates, or navigation.
- Avoid tiny disclaimer copy.
- No competitor marks.
- No cross-brand logos or promotion.
- No fake ratings, awards, reviews, prices, inventory counts, or unavailable features.

## Capture QA

Before upload, verify each image:

- [ ] Captured from the current review build or equivalent production UI.
- [ ] No private customer information visible.
- [ ] No debug labels, localhost URLs, console output, or test-only controls.
- [ ] No expired event used as the hero unless clearly historical in context.
- [ ] City/event text is legible.
- [ ] Status bar/device chrome is consistent across the set.
- [ ] Output is exactly an Apple-accepted screenshot dimension.
- [ ] PNG/JPEG contains no alpha channel.
- [ ] Screenshot tells a distinct product story; no redundant frames.

## Release note

App Store Connect requires screenshots for the platform version. Capture/upload is the remaining visual release gate after metadata and binary verification.
