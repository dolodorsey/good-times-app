-- GOOD TIMES Gateway staff / CRM queue FK performance remediation.
create index if not exists gt_portal_audit_venue_idx on public.gt_portal_audit(venue_id) where venue_id is not null;
create index if not exists gt_portal_muse_claim_idx on public.gt_portal_muse_outbox(claim_id) where claim_id is not null;
create index if not exists gt_portal_muse_interest_idx on public.gt_portal_muse_outbox(interest_id) where interest_id is not null;
create index if not exists gt_portal_muse_venue_idx on public.gt_portal_muse_outbox(venue_id) where venue_id is not null;
create index if not exists gt_portal_publications_approver_idx on public.gt_portal_publications(approved_by);
create index if not exists gt_portal_publications_venue_idx on public.gt_portal_publications(venue_id);
