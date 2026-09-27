-- WARNING: re-allows anyone with the public key to trigger cross-brand GHL newsletter sends.
grant execute on function public.gtm_dispatch_brand_newsletters_sync_v2(text,integer) to public, anon, authenticated;
grant execute on function public.gtm_dispatch_focus_newsletters_sync_v2()             to public, anon, authenticated;
