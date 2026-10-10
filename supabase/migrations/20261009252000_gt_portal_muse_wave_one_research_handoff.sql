-- GOOD TIMES internal Muse research assignment. NO email dispatch, zero send-approval evidence.
alter table public.gt_portal_muse_outbox drop constraint if exists gt_portal_muse_outbox_event_type_check;
alter table public.gt_portal_muse_outbox add constraint gt_portal_muse_outbox_event_type_check
check(event_type in ('claim_submitted','claim_verified','claim_followup_needed','claim_rejected',
'asset_submitted','asset_approved','growth_inquiry','growth_qualified','proposal_requested',
'invite_draft_prepared','venue_research_wave_ready'));
insert into public.gt_portal_muse_outbox(event_key,event_type,payload,queue_status)
select 'venue_research:atlanta:wave_1:2026-10-09','venue_research_wave_ready',
 jsonb_build_object(
 'wave',1,'brand','GOOD_TIMES','market','atlanta',
 'total_targets',count(*),
 'public_lookup_eligible',count(*) filter(where claim_lookup_eligible),
 'verified_contacts',count(*) filter(where contact_email is not null and email_verified_at is not null),
 'source_table','public.gt_portal_outreach_candidates',
 'required_actions',jsonb_build_array('Verify official business decision-maker and email using first-party sources','Record exact email source evidence, title and contact','Check DNC/suppression and dedupe','Draft individual factual copy','Do not send until canonical /venues route and live auth are verified'),
 'authorized_to_send',false,'send_receipts',0
 ),'pending_muse_review'
from public.gt_portal_outreach_candidates where priority_wave=1
on conflict(event_key) do nothing;
