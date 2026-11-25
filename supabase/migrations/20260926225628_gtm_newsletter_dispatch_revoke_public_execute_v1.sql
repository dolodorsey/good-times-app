-- SECURITY: SECURITY DEFINER newsletter dispatchers were EXECUTE-able by PUBLIC/anon/authenticated
-- (browser-public key). They read brand_ghl_map.pit_token and send queued GHL emails for any
-- brand_key over HTTP. No cron/app caller uses the public roles; service_role and owner retained.
-- Rollback: supabase/rollbacks/20260926225628_gtm_newsletter_dispatch_revoke_public_execute_v1.rollback.sql
revoke execute on function public.gtm_dispatch_brand_newsletters_sync_v2(text,integer) from public, anon, authenticated;
revoke execute on function public.gtm_dispatch_focus_newsletters_sync_v2()             from public, anon, authenticated;
grant  execute on function public.gtm_dispatch_brand_newsletters_sync_v2(text,integer) to service_role;
grant  execute on function public.gtm_dispatch_focus_newsletters_sync_v2()             to service_role;
