-- Explicitly bind membership to the OUTER claim row (never accidentally to membership.id).
drop policy if exists "gt_portal_claim_own_pending_update" on public.gt_portal_claims;
create policy "gt_portal_claim_own_pending_update" on public.gt_portal_claims
for update to authenticated
using (
 auth_user_id=(select auth.uid())
 and (status in ('pending_review','more_info') or (status='verified' and exists (
  select 1 from public.gt_portal_memberships m
  where m.claim_id=gt_portal_claims.id and m.auth_user_id=(select auth.uid()) and m.is_active and m.revoked_at is null
 )))
)
with check (
 auth_user_id=(select auth.uid())
 and (status in ('pending_review','more_info') or (status='verified' and exists (
  select 1 from public.gt_portal_memberships m
  where m.claim_id=gt_portal_claims.id and m.auth_user_id=(select auth.uid()) and m.is_active and m.revoked_at is null
 )))
);
