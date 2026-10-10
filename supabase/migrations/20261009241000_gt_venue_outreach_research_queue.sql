-- GOOD TIMES Atlanta venue-specific outbound research queue only.
-- NOT sending or authorizing any marketing email. Muse owns sends after explicit approval.
create table if not exists public.gt_portal_outreach_candidates(
 venue_id uuid primary key references public.gt_venues(id) on delete restrict,
 market_key text not null default 'atlanta' check(market_key='atlanta'),
 brand_key text not null default 'GOOD_TIMES' check(brand_key='GOOD_TIMES'),
 venue_name text not null,
 public_website text,
 public_phone text,
 public_instagram text,
 target_status text not null default 'research' check(target_status in
  ('research','contact_qualified','copy_approved','send_ready','suppressed','sent_receipted','reply_received','claim_started','closed')),
 contact_name text,
 contact_title text,
 contact_email text,
 email_evidence_url text,
 email_verified_at timestamptz,
 business_authority_checked boolean not null default false,
 contact_channel text default 'email' check(contact_channel in ('email','phone','website_form')),
 dnc_checked_at timestamptz,
 dnc_clear boolean not null default false,
 suppression_checked_at timestamptz,
 suppression_clear boolean not null default false,
 individualized_copy text,
 copy_approved_at timestamptz,
 approved_by uuid references auth.users(id) on delete restrict,
 verified_public_claim_url text,
 portal_link_tested_at timestamptz,
 auth_roundtrip_tested_at timestamptz,
 muse_send_approved_at timestamptz,
 provider_message_id text,
 provider_sent_at timestamptz,
 provider_receipt jsonb,
 last_outcome text,
 last_activity_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (char_length(coalesce(individualized_copy,''))<=8000),
 check (contact_email is null or contact_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
 check(target_status not in ('send_ready','sent_receipted') or (
  contact_email is not null
  and email_evidence_url is not null and length(email_evidence_url)>=10
  and email_verified_at is not null
  and business_authority_checked
  and dnc_clear and dnc_checked_at is not null
  and suppression_clear and suppression_checked_at is not null
  and individualized_copy is not null and char_length(btrim(individualized_copy))>=80
  and copy_approved_at is not null and approved_by is not null
  and verified_public_claim_url ~ '^https://'
  and portal_link_tested_at is not null and auth_roundtrip_tested_at is not null
  and muse_send_approved_at is not null
 )),
 check(target_status <> 'sent_receipted' or
  (provider_message_id is not null and provider_sent_at is not null and provider_receipt is not null))
);
create index if not exists gt_portal_outreach_status_idx on public.gt_portal_outreach_candidates(target_status,updated_at);
create index if not exists gt_portal_outreach_contact_idx on public.gt_portal_outreach_candidates(lower(contact_email))
where contact_email is not null;
alter table public.gt_portal_outreach_candidates enable row level security;
revoke all on public.gt_portal_outreach_candidates from public,anon,authenticated;
grant select,insert,update,delete on public.gt_portal_outreach_candidates to service_role;
comment on table public.gt_portal_outreach_candidates is 'GOOD TIMES ONLY. Atlanta venue research candidates, not consented/qualified email leads; all outreach/send gates fail closed. Muse sends externally and records actual provider receipt.';

insert into public.gt_portal_outreach_candidates
(venue_id,venue_name,public_website,public_phone,public_instagram,target_status)
select id,name,website,phone,instagram_handle,'research'
from public.gt_venues
where city_key='atlanta' and status='active' and is_verified=true
on conflict(venue_id) do nothing;

-- Explicitly separate a staff-readable shortlist from a send action.
create or replace function public.gt_portal_outreach_queue(p_limit integer default 50,p_state text default 'research')
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare n integer; v jsonb;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 n:=least(greatest(coalesce(p_limit,50),1),100);
 if p_state not in ('research','contact_qualified','copy_approved','send_ready','suppressed','sent_receipted','reply_received','claim_started','closed') then
  raise exception 'Unknown outreach state' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v
 from (select venue_id,venue_name,public_website,public_phone,public_instagram,target_status,
  contact_name,contact_title,contact_email,email_evidence_url,email_verified_at,business_authority_checked,
  dnc_checked_at,dnc_clear,suppression_checked_at,suppression_clear,
  copy_approved_at,verified_public_claim_url,portal_link_tested_at,auth_roundtrip_tested_at,
  muse_send_approved_at,provider_message_id,provider_sent_at,last_outcome,updated_at
  from public.gt_portal_outreach_candidates where target_status=p_state order by updated_at,venue_name limit n) s;
 return v;
end;$f$;
revoke all on function public.gt_portal_outreach_queue(integer,text) from public,anon;
grant execute on function public.gt_portal_outreach_queue(integer,text) to authenticated,service_role;
