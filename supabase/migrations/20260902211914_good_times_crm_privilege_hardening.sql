-- GOOD TIMES only: the CRM link/outbox tables are internal control-plane state.
-- Auth signup is queued by public.gt_queue_crm_on_signup(); browsers do not need
-- direct table access. Preserve RLS and trusted backend/service-role access.

alter table public.gt_crm_links enable row level security;
alter table public.gt_crm_outbox enable row level security;

revoke all privileges on table public.gt_crm_links from anon, authenticated;
revoke all privileges on table public.gt_crm_outbox from anon, authenticated;

grant all privileges on table public.gt_crm_links to service_role;
grant all privileges on table public.gt_crm_outbox to service_role;
