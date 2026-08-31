-- GOOD TIMES: harden the intentionally public active-ad delivery view.
-- The underlying ad inventory tables already enforce active/approved-only RLS
-- for anon/authenticated callers. Make the view execute with the caller's
-- privileges so it cannot bypass those policies as the ad system grows.

alter view public.v_gt_active_ads set (security_invoker = true);

comment on view public.v_gt_active_ads is
  'GOOD TIMES public active-ad delivery surface. Runs as SECURITY INVOKER so underlying RLS remains authoritative.';
