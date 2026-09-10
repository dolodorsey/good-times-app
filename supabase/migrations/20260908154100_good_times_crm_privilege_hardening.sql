-- GOOD TIMES only: harden internal CRM orchestration tables.
-- Browser roles do not require direct access; auth signup is queued through
-- trusted backend logic. Keep RLS enabled and preserve service-role access.

alter table public.gt_crm_links enable row level security;
alter table public.gt_crm_outbox enable row level security;

revoke all privileges on table public.gt_crm_links from anon, authenticated;
revoke all privileges on table public.gt_crm_outbox from anon, authenticated;

grant all privileges on table public.gt_crm_links to service_role;
grant all privileges on table public.gt_crm_outbox to service_role;
