-- GOOD TIMES only: internal event outbox for Muse-approved CRM work. NEVER auto-send.
create table if not exists public.gt_portal_muse_outbox (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 brand_key text not null default 'GOOD_TIMES' check(brand_key='GOOD_TIMES'),
 venue_id uuid references public.gt_venues(id) on delete restrict,
 claim_id uuid references public.gt_portal_claims(id) on delete restrict,
 interest_id uuid references public.gt_portal_interests(id) on delete restrict,
 event_type text not null check(event_type in ('claim_submitted','claim_verified','claim_followup_needed','claim_rejected','asset_submitted','asset_approved','growth_inquiry','growth_qualified','proposal_requested')),
 queue_status text not null default 'pending_muse_review' check(queue_status in ('pending_muse_review','approved_for_sync','synced_receipted','suppressed','failed')),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists gt_portal_muse_queue_status_idx on public.gt_portal_muse_outbox(queue_status,created_at);
alter table public.gt_portal_muse_outbox enable row level security;
revoke all on public.gt_portal_muse_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.gt_portal_muse_outbox to service_role;
comment on table public.gt_portal_muse_outbox is 'GOOD TIMES internal event queue, NOT an email send request. Muse reviews and executes only with owner-approved campaign, suppression checks, provider receipts.';

create or replace function public.gt_portal_claim_event_enqueue()
returns trigger language plpgsql volatile security definer set search_path=''
as $f$
declare typ text;
begin
 if TG_OP='INSERT' then typ:='claim_submitted';
 elsif NEW.status is distinct from OLD.status then
  typ:=case NEW.status when 'verified' then 'claim_verified'
   when 'more_info' then 'claim_followup_needed'
   when 'rejected' then 'claim_rejected' else null end;
 else return NEW; end if;
 if typ is not null then
  insert into public.gt_portal_muse_outbox(event_key,venue_id,claim_id,event_type,payload)
  values ('claim:'||NEW.id::text||':'||typ,NEW.venue_id,NEW.id,typ,
  jsonb_build_object('claim_status',NEW.status,'request_source','partner_portal'))
  on conflict(event_key) do nothing;
 end if;
 return NEW;
end;$f$;
revoke all on function public.gt_portal_claim_event_enqueue() from public,anon,authenticated;
drop trigger if exists gt_portal_claim_outbox on public.gt_portal_claims;
create trigger gt_portal_claim_outbox after insert or update of status on public.gt_portal_claims
for each row execute function public.gt_portal_claim_event_enqueue();

create or replace function public.gt_portal_interest_event_enqueue()
returns trigger language plpgsql volatile security definer set search_path=''
as $f$
declare typ text;
begin
 if TG_OP='INSERT' then typ:='growth_inquiry';
 elsif NEW.status is distinct from OLD.status then
   typ:=case NEW.status when 'qualified' then 'growth_qualified' when 'proposal' then 'proposal_requested' else null end;
 else return NEW;end if;
 if typ is not null then
  insert into public.gt_portal_muse_outbox(event_key,claim_id,interest_id,venue_id,event_type,payload)
  select 'interest:'||NEW.id::text||':'||typ,NEW.claim_id,NEW.id,c.venue_id,typ,
   jsonb_build_object('category',NEW.category,'budget_band',NEW.budget_band,'source','venue_partner_portal')
  from public.gt_portal_claims c where c.id=NEW.claim_id
  on conflict(event_key) do nothing;
 end if;
 return NEW;
end;$f$;
revoke all on function public.gt_portal_interest_event_enqueue() from public,anon,authenticated;
drop trigger if exists gt_portal_interest_outbox on public.gt_portal_interests;
create trigger gt_portal_interest_outbox after insert or update of status on public.gt_portal_interests
for each row execute function public.gt_portal_interest_event_enqueue();

create or replace function public.gt_portal_media_event_enqueue()
returns trigger language plpgsql volatile security definer set search_path=''
as $f$
declare typ text;
begin
 if TG_OP='INSERT' then typ:='asset_submitted';
 elsif NEW.review_status is distinct from OLD.review_status then typ:=case NEW.review_status when 'approved' then 'asset_approved' else null end;
 else return NEW;end if;
 if typ is not null then
  insert into public.gt_portal_muse_outbox(event_key,claim_id,venue_id,event_type,payload)
  select 'media:'||NEW.id::text||':'||typ,NEW.claim_id,c.venue_id,typ,
    jsonb_build_object('asset_type',NEW.asset_type,'review_status',NEW.review_status)
  from public.gt_portal_claims c where c.id=NEW.claim_id
  on conflict(event_key) do nothing;
 end if;
 return NEW;
end;$f$;
revoke all on function public.gt_portal_media_event_enqueue() from public,anon,authenticated;
drop trigger if exists gt_portal_media_outbox on public.gt_portal_media;
create trigger gt_portal_media_outbox after insert or update of review_status on public.gt_portal_media
for each row execute function public.gt_portal_media_event_enqueue();

create or replace function public.gt_portal_staff_interest_decision(
 p_interest_id uuid,p_decision text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare i public.gt_portal_interests%rowtype; v_actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_decision not in ('qualified','proposal','declined') then raise exception 'Invalid status' using errcode='22023';end if;
 if length(btrim(coalesce(p_note,'')))<15 then raise exception 'Explain the qualification decision' using errcode='22023';end if;
 v_actor:=(select auth.uid());
 select * into i from public.gt_portal_interests where id=p_interest_id for update;
 if not found then raise exception 'Inquiry not found' using errcode='P0002';end if;
 if i.status in ('closed','declined') then raise exception 'Inquiry is closed for review' using errcode='23514';end if;
 update public.gt_portal_interests set status=p_decision where id=i.id;
 insert into public.gt_portal_audit(actor_user_id,action,claim_id,resource_id,detail)
 values(v_actor,'growth_'||p_decision,i.claim_id,i.id,jsonb_build_object('previous_status',i.status,'note',p_note));
 return jsonb_build_object('ok',true,'status',p_decision);
end;$f$;
revoke all on function public.gt_portal_staff_interest_decision(uuid,text,text) from public,anon;
grant execute on function public.gt_portal_staff_interest_decision(uuid,text,text) to authenticated,service_role;
