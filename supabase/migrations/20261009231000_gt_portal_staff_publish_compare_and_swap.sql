-- Prevent a claimant from changing draft fields between staff review and publication.
-- Legacy three-argument definer remains callable ONLY by service_role, never a browser.
revoke all on function public.gt_portal_staff_publish(uuid,text[],text) from public,anon,authenticated;
grant execute on function public.gt_portal_staff_publish(uuid,text[],text) to service_role;
create or replace function public.gt_portal_staff_publish_checked(
 p_claim_id uuid,p_fields text[],p_evidence_ref text,p_expected_draft jsonb
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare v_draft jsonb;
begin
 if not (select public.gt_portal_is_staff()) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if p_expected_draft is null or jsonb_typeof(p_expected_draft)<>'object' then
  raise exception 'Reviewed draft snapshot is required' using errcode='22023';
 end if;
 select c.profile_draft into v_draft from public.gt_portal_claims c
  where c.id=p_claim_id for update;
 if not found then raise exception 'Claim not found' using errcode='P0002';end if;
 if v_draft is distinct from p_expected_draft then
  raise exception 'Venue draft changed since review; reload before publishing' using errcode='40001';
 end if;
 return public.gt_portal_staff_publish(p_claim_id,p_fields,p_evidence_ref);
end;$f$;
revoke all on function public.gt_portal_staff_publish_checked(uuid,text[],text,jsonb) from public,anon;
grant execute on function public.gt_portal_staff_publish_checked(uuid,text[],text,jsonb) to authenticated,service_role;
