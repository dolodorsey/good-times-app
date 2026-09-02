-- GOOD TIMES: CRM control-plane least-privilege hardening.
-- Scope: dedicated GOOD TIMES auth/users database only.
-- Signup enrollment is produced by the SECURITY DEFINER auth.users trigger
-- gt_queue_crm_on_signup(); browser roles do not need direct table access.

alter table public.gt_crm_links enable row level security;
alter table public.gt_crm_outbox enable row level security;

revoke all privileges on table public.gt_crm_links from anon, authenticated;
revoke all privileges on table public.gt_crm_outbox from anon, authenticated;

grant all privileges on table public.gt_crm_links to service_role;
grant all privileges on table public.gt_crm_outbox to service_role;

comment on table public.gt_crm_links is
  'GOOD TIMES internal CRM identity/link control plane. Browser roles have no direct privileges; trusted server/service-role workflows only.';

comment on table public.gt_crm_outbox is
  'GOOD TIMES internal CRM delivery queue. Browser roles have no direct privileges; trusted server/service-role workers only.';
