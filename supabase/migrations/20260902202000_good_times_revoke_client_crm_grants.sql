-- GOOD TIMES: CRM orchestration tables are internal control-plane surfaces.
-- Signup enrollment is produced by the protected auth.users trigger and trusted
-- server/service-role workers. Browser roles do not require direct table access.

revoke all privileges on table public.gt_crm_links from anon, authenticated;
revoke all privileges on table public.gt_crm_outbox from anon, authenticated;

grant all privileges on table public.gt_crm_links to service_role;
grant all privileges on table public.gt_crm_outbox to service_role;

comment on table public.gt_crm_links is
  'GOOD TIMES internal CRM identity/link state. Direct browser-role access is revoked; service-role/trusted backend only.';

comment on table public.gt_crm_outbox is
  'GOOD TIMES internal CRM delivery queue. Direct browser-role access is revoked; service-role/trusted backend only.';
