-- Verified venues may propose new profile changes but cannot publish or change approval status.
drop policy if exists "gt_portal_claim_own_pending_update" on public.gt_portal_claims;
create policy "gt_portal_claim_own_pending_update" on public.gt_portal_claims
 for update to authenticated
 using (auth_user_id=(select auth.uid()) and status in ('pending_review','more_info','verified'))
 with check (auth_user_id=(select auth.uid()) and status in ('pending_review','more_info','verified'));
-- Column-level GRANT remains restricted to profile_draft, contact_name, contact_phone, relationship, updated_at.
