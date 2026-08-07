-- GOOD TIMES production hardening applied 2026-08-07.
-- Keep recommendation-profile maintenance server/trigger-only and ensure the
-- aggregate scorecard view does not bypass caller RLS.

REVOKE ALL ON FUNCTION public.gt_refresh_intelligence_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gt_refresh_intelligence_profile(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.gt_refresh_intelligence_profile(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.gt_refresh_intelligence_profile(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.gt_taste_signal_profile_trigger() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gt_taste_signal_profile_trigger() FROM anon;
REVOKE ALL ON FUNCTION public.gt_taste_signal_profile_trigger() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.gt_taste_signal_profile_trigger() TO service_role;

ALTER VIEW public.v_gt_product_scorecard SET (security_invoker = true);
