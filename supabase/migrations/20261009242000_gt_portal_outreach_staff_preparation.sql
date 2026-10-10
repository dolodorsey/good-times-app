-- GOOD TIMES: manual recipient verification and individualized copy preparation.
-- This migration cannot cause sends or set send_ready. External execution is Muse-only.
alter table public.gt_portal_outreach_candidates
 add column if not exists contact_reviewer_note text,
 add column if not exists copy_reviewer_note text;
create or replace function public.gt_portal_outreach_record_contact(
 p_venue_id uuid,p_contact_name text,p_contact_title text,p_contact_email text,p_source_url text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare c public.gt_portal_outreach_candidates%rowtype; actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Staff only' using errcode='42501';end if;
 actor:=(select auth.uid());
 if length(btrim(coalesce(p_contact_name,'')))<2 or length(btrim(coalesce(p_contact_title,'')))<2
  or p_contact_email !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  or length(btrim(coalesce(p_source_url,'')))<12
  or length(btrim(coalesce(p_note,'')))<20
 then raise exception 'Full name/title, verified business email, evidence URL and reviewer note required' using errcode='22023';end if;
 if p_source_url !~ '^https://[^ ]+' then raise exception 'Use an HTTPS source evidence link' using errcode='22023';end if;
 select * into c from public.gt_portal_outreach_candidates where venue_id=p_venue_id for update;
 if not found then raise exception 'Unknown canonical Atlanta venue' using errcode='P0002';end if;
 if c.target_status not in ('research','contact_qualified','copy_approved') then raise exception 'Record locked by later stage' using errcode='23514';end if;
 update public.gt_portal_outreach_candidates set contact_name=left(trim(p_contact_name),160),
 contact_title=left(trim(p_contact_title),160),contact_email=lower(trim(p_contact_email)),
 email_evidence_url=left(trim(p_source_url),1500),email_verified_at=now(),
 business_authority_checked=false,
 target_status='contact_qualified',
 copy_approved_at=null,approved_by=null,
 individualized_copy=null,
 dnc_clear=false,dnc_checked_at=null,suppression_clear=false,suppression_checked_at=null,
 verified_public_claim_url=null,portal_link_tested_at=null,auth_roundtrip_tested_at=null,
 muse_send_approved_at=null,
 contact_reviewer_note=left(trim(p_note),2000),updated_at=now()
 where venue_id=p_venue_id;
 insert into public.gt_portal_audit(actor_user_id,action,venue_id,evidence_ref,detail)
 values(actor,'venue_outreach_contact_qualified',p_venue_id,p_source_url,
 jsonb_build_object('source_kind','staff_verified_public_business_contact','reviewer_note',p_note,'recipient_email',lower(trim(p_contact_email))));
 return jsonb_build_object('ok',true,'status','contact_qualified','venue_id',p_venue_id);
end;$f$;
revoke all on function public.gt_portal_outreach_record_contact(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.gt_portal_outreach_record_contact(uuid,text,text,text,text,text) to authenticated,service_role;

create or replace function public.gt_portal_outreach_prepare_copy(
 p_venue_id uuid,p_copy text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare c public.gt_portal_outreach_candidates%rowtype;actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Staff only' using errcode='42501';end if;
 actor:=(select auth.uid());
 select * into c from public.gt_portal_outreach_candidates where venue_id=p_venue_id for update;
 if not found or c.target_status not in ('contact_qualified','copy_approved') or c.contact_email is null then
  raise exception 'Qualified verified contact required' using errcode='23514';end if;
 if length(btrim(coalesce(p_copy,'')))<80 or length(p_copy)>4000 or length(btrim(coalesce(p_note,'')))<15 then
  raise exception 'Custom email text 80–4000 chars and approval note required' using errcode='22023';end if;
 if strpos(lower(p_copy),lower(c.venue_name))=0 then raise exception 'Include the exact venue name for personalization' using errcode='22023';end if;
 update public.gt_portal_outreach_candidates set individualized_copy=p_copy,
 copy_approved_at=now(),approved_by=actor,copy_reviewer_note=p_note,
 target_status='copy_approved',updated_at=now()
 where venue_id=p_venue_id;
 insert into public.gt_portal_audit(actor_user_id,action,venue_id,detail)
 values(actor,'venue_outreach_copy_prepared',p_venue_id,
 jsonb_build_object('copy_length',length(p_copy),'note',p_note,'no_send_executed',true));
 return jsonb_build_object('ok',true,'status','copy_approved','venue_id',p_venue_id);
end;$f$;
revoke all on function public.gt_portal_outreach_prepare_copy(uuid,text,text) from public,anon;
grant execute on function public.gt_portal_outreach_prepare_copy(uuid,text,text) to authenticated,service_role;

create or replace function public.gt_portal_outreach_counts()
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare counts jsonb;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Staff only' using errcode='42501';end if;
 select jsonb_object_agg(status,n) into counts from
 (select target_status status,count(*) n from public.gt_portal_outreach_candidates group by target_status) q;
 return coalesce(counts,'{}'::jsonb);
end;$f$;
revoke all on function public.gt_portal_outreach_counts() from public,anon;
grant execute on function public.gt_portal_outreach_counts() to authenticated,service_role;
