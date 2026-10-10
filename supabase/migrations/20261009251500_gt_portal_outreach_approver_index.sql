create index if not exists gt_portal_outreach_approved_by_idx on public.gt_portal_outreach_candidates(approved_by) where approved_by is not null;
