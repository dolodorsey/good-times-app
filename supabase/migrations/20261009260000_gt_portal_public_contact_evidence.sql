-- GOOD TIMES public official-site contact evidence. No sending / no claiming a verified decision maker.
create table if not exists public.gt_portal_outreach_email_evidence(
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.gt_venues(id) on delete restrict,
 email text not null check(email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
 source_url text not null check(source_url ~ '^https://'),
 extraction_method text not null check(extraction_method in ('public_mailto','official_contact_page','owner_submitted')),
 source_domain text,
 reviewer_status text not null default 'unreviewed' check(reviewer_status in ('unreviewed','verified_general','verified_person','rejected','suppressed')),
 reviewer_id uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 reviewer_note text,
 observed_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(venue_id,email,source_url),
 check((reviewer_status='unreviewed' and reviewer_id is null and reviewed_at is null) or reviewer_status<>'unreviewed')
);
create index if not exists gt_portal_contact_evidence_review_idx on public.gt_portal_outreach_email_evidence(reviewer_status,observed_at);
create index if not exists gt_portal_contact_evidence_venue_idx on public.gt_portal_outreach_email_evidence(venue_id);
create index if not exists gt_portal_contact_evidence_review_actor_idx on public.gt_portal_outreach_email_evidence(reviewer_id) where reviewer_id is not null;
alter table public.gt_portal_outreach_email_evidence enable row level security;
revoke all on public.gt_portal_outreach_email_evidence from public,anon,authenticated;
grant select,insert,update,delete on public.gt_portal_outreach_email_evidence to service_role;
comment on table public.gt_portal_outreach_email_evidence is 'Source-backed contact suggestions crawled from official public venue sites. NEVER a verified recipient or send authorization without staff review, identity/contact-role checks and suppression.';
