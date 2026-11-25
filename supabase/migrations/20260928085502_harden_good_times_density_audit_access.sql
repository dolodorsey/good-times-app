-- GOOD TIMES production reconciliation.
-- Applied to content project dzlmtvodpyhetvektfuo as migration 20260928085502.
-- Security hardening after replacing internal coverage views and adding the manual work-queue refresh RPC.

alter view public.v_gt_atlanta_subcategory_coverage
  set (security_invoker = true);

alter view public.v_gt_atlanta_taxonomy_stock_health
  set (security_invoker = true);

alter view public.v_gt_customer_subcategory_inventory
  set (security_invoker = true);

revoke execute on function public.gt_refresh_discovery_upgrade_work_queue()
  from public, anon, authenticated;

grant execute on function public.gt_refresh_discovery_upgrade_work_queue()
  to service_role;
