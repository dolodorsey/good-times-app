-- GOOD TIMES only: internal CRM orchestration must remain server-side.
-- The signup trigger is SECURITY DEFINER and writes these rows without browser table grants.

alter table public.gt_crm_links enable row level security;
alter table public.gt_crm_outbox enable row level security;

revoke all privileges on table public.gt_crm_links from anon, authenticated;
revoke all privileges on table public.gt_crm_outbox from anon, authenticated;

grant all privileges on table public.gt_crm_links to service_role;
grant all privileges on table public.gt_crm_outbox to service_role;
