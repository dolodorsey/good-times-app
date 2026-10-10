-- GOOD TIMES Muse internal prepared-draft alert only. No email triggers or external webhook calls.
alter table public.gt_portal_muse_outbox drop constraint if exists gt_portal_muse_outbox_event_type_check;
alter table public.gt_portal_muse_outbox add constraint gt_portal_muse_outbox_event_type_check
check(event_type in ('claim_submitted','claim_verified','claim_followup_needed','claim_rejected',
'asset_submitted','asset_approved','growth_inquiry','growth_qualified','proposal_requested','invite_draft_prepared'));

create or replace function public.gt_portal_outreach_muse_event()
returns trigger language plpgsql security definer set search_path=''
as $f$
begin
 if NEW.target_status='copy_approved' and OLD.target_status is distinct from NEW.target_status then
 insert into public.gt_portal_muse_outbox(event_key,venue_id,event_type,payload)
 values('venue_invite:'||NEW.venue_id::text||':copy_prepared',NEW.venue_id,'invite_draft_prepared',
  jsonb_build_object('venue_id',NEW.venue_id,'status','COPY PREPARED ONLY','send_permitted',false,'brand','GOOD_TIMES'))
 on conflict(event_key) do nothing;
 end if;
 return NEW;
end;$f$;
revoke all on function public.gt_portal_outreach_muse_event() from public,anon,authenticated;
drop trigger if exists gt_portal_outreach_muse_event on public.gt_portal_outreach_candidates;
create trigger gt_portal_outreach_muse_event
 after update of target_status on public.gt_portal_outreach_candidates
 for each row execute function public.gt_portal_outreach_muse_event();
