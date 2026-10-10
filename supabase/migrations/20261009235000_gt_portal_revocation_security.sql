-- GOOD TIMES secure owner lifecycle: verified-but-revoked users lose draft/media rights.
drop policy if exists "gt_portal_claim_own_pending_update" on public.gt_portal_claims;
create policy "gt_portal_claim_own_pending_update" on public.gt_portal_claims
for update to authenticated
using (
 auth_user_id=(select auth.uid())
 and (status in ('pending_review','more_info') or (status='verified' and exists (
  select 1 from public.gt_portal_memberships m
  where m.claim_id=id and m.auth_user_id=(select auth.uid()) and m.is_active and m.revoked_at is null
 )))
)
with check (
 auth_user_id=(select auth.uid())
 and (status in ('pending_review','more_info') or (status='verified' and exists (
  select 1 from public.gt_portal_memberships m
  where m.claim_id=id and m.auth_user_id=(select auth.uid()) and m.is_active and m.revoked_at is null
 )))
);
drop policy if exists "gt_portal_media_self_insert" on public.gt_portal_media;
create policy "gt_portal_media_self_insert" on public.gt_portal_media for insert to authenticated
with check(
 auth_user_id=(select auth.uid()) and review_status='pending' and reviewer_note is null and reviewed_at is null
 and exists(select 1 from public.gt_portal_claims c where c.id=claim_id and c.auth_user_id=(select auth.uid())
  and (c.status in ('pending_review','more_info') or (c.status='verified' and exists(
   select 1 from public.gt_portal_memberships m where m.claim_id=c.id and m.auth_user_id=(select auth.uid())
   and m.is_active and m.revoked_at is null))))
);
drop policy if exists "gt_portal_storage_owner_upload" on storage.objects;
create policy "gt_portal_storage_owner_upload" on storage.objects for insert to authenticated
with check(bucket_id='gt-partner-pending' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.gt_portal_claims c where c.id::text=(storage.foldername(name))[2] and c.auth_user_id=(select auth.uid())
  and (c.status in ('pending_review','more_info') or (c.status='verified' and exists(
    select 1 from public.gt_portal_memberships m where m.claim_id=c.id and m.auth_user_id=(select auth.uid())
    and m.is_active and m.revoked_at is null)))));

create or replace function public.gt_portal_staff_revoke_claim(
 p_claim_id uuid,p_evidence_ref text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare c public.gt_portal_claims%rowtype;actor uuid;
begin
 actor:=(select auth.uid());
 if actor is null or not exists (select 1 from public.gt_portal_staff s where s.auth_user_id=actor and s.is_active and s.role='supervisor') then
  raise exception 'Only a designated supervisor may revoke access' using errcode='42501';end if;
 if length(btrim(coalesce(p_evidence_ref,'')))<18 or length(btrim(coalesce(p_note,'')))<20 then
  raise exception 'Provide evidence and a reason for revocation' using errcode='22023';end if;
 select * into c from public.gt_portal_claims where id=p_claim_id for update;
 if not found or c.status<>'verified' then raise exception 'Active verified claim required' using errcode='23514';end if;
 update public.gt_portal_memberships set is_active=false,revoked_at=now()
 where claim_id=c.id and is_active=true;
 if not found then raise exception 'No active membership to revoke' using errcode='23514';end if;
 update public.gt_portal_claims set status='disputed',reviewed_by=actor,reviewed_at=now(),
  review_reason=left(p_note,2000),updated_at=now() where id=c.id;
 insert into public.gt_portal_audit(actor_user_id,action,claim_id,venue_id,evidence_ref,detail)
 values(actor,'verified_claim_revoked',c.id,c.venue_id,left(p_evidence_ref,1500),
  jsonb_build_object('reason',left(p_note,2000),'prior_status',c.status));
 return jsonb_build_object('ok',true,'claim_id',p_claim_id,'status','disputed','membership_active',false);
end;$f$;
revoke all on function public.gt_portal_staff_revoke_claim(uuid,text,text) from public,anon;
grant execute on function public.gt_portal_staff_revoke_claim(uuid,text,text) to authenticated,service_role;
