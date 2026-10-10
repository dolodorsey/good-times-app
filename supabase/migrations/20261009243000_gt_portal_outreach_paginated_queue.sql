create or replace function public.gt_portal_outreach_page(p_state text default 'research',p_limit integer default 35,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare n integer; off integer;total integer;items jsonb;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_state not in ('research','contact_qualified','copy_approved','send_ready','suppressed','sent_receipted','reply_received','claim_started','closed') then
  raise exception 'Unknown outreach state' using errcode='22023';end if;
 n:=least(greatest(coalesce(p_limit,35),1),75);
 off:=least(greatest(coalesce(p_offset,0),0),100000);
 select count(*) into total from public.gt_portal_outreach_candidates where target_status=p_state;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into items from(
 select venue_id,venue_name,public_website,public_phone,public_instagram,
  target_status,contact_name,contact_title,contact_email,email_evidence_url,email_verified_at,
  contact_reviewer_note,individualized_copy,copy_reviewer_note,copy_approved_at,
  dnc_clear,suppression_clear,portal_link_tested_at,auth_roundtrip_tested_at,
  muse_send_approved_at,last_outcome
 from public.gt_portal_outreach_candidates
 where target_status=p_state order by updated_at asc,venue_name asc
 limit n offset off) t;
 return jsonb_build_object('status',p_state,'total',total,'offset',off,'limit',n,'items',items);
end;$f$;
revoke all on function public.gt_portal_outreach_page(text,integer,integer) from public,anon;
grant execute on function public.gt_portal_outreach_page(text,integer,integer) to authenticated,service_role;
