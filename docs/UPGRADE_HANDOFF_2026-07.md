# GOOD TIMES Foundation Upgrade Handoff

**Date:** July 10, 2026  
**Branch:** `upgrade/foundation-2026-07`  
**Production database migration:** `add_good_times_measurement_foundation_20260710`

## Implemented

The GOOD TIMES Supabase project now includes:

- `gt_product_events` — first-party product analytics with user-scoped RLS and idempotency support.
- `gt_taste_signals` — recommendation-learning signals for venues, events, experiences, plans, categories, and cities.
- `gt_experiment_assignments` — server-managed experiment assignments readable only by the assigned user.

Validation confirmed RLS is enabled on all three tables. Anonymous access is denied. Signed-in users can access only their own analytics and taste data.

## Required Integration

1. Extract Supabase configuration from `src/App.jsx` into controlled web/mobile environment settings.
2. Add a typed analytics service outside display components.
3. Instrument onboarding, discovery, recommendation, save, share, concierge, itinerary, booking, and rating events.
4. Use `client_event_id` for retry-safe inserts.
5. Add offline-safe event queuing without blocking the customer journey.
6. Add RLS, idempotency, and regression tests.
7. Connect taste signals to a separate recommendation service.

## Required Event Set

`app_opened`, `onboarding_started`, `onboarding_completed`, `city_selected`, `category_selected`, `search_submitted`, `recommendation_impression`, `recommendation_opened`, `venue_viewed`, `event_viewed`, `item_saved`, `item_shared`, `concierge_started`, `concierge_completed`, `itinerary_created`, `itinerary_stop_replaced`, `booking_started`, `booking_completed`, `rating_submitted`, `recommendation_dismissed`.

## Guardrails

- Do not create another GOOD TIMES repository or Vercel project.
- Do not put privileged server access in client code.
- Do not store raw payment details or raw residential addresses in event properties.
- Do not call results personalized until customer signals affect ranking.
- Do not claim completed bookings without verified transaction or partner confirmation.

## Drive Handoff

https://docs.google.com/document/d/1fTr7oPcOnfAIoPApdRQO-BlijVRHO3B_ucMWuZjb4UU/edit
