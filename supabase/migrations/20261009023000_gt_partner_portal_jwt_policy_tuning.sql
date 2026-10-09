-- GOOD TIMES Gateway: cache the non-user-controlled auth.jwt() lookup in RLS.
drop policy if exists "gt_portal_claim_self_create" on public.gt_portal_claims;
create policy "gt_portal_claim_self_create" on public.gt_portal_claims
for insert to authenticated
with check(
  auth_user_id=(select auth.uid())
  and status='pending_review'
  and reviewed_by is null and reviewed_at is null and review_reason is null
  and terms_accepted is true
  and lower(contact_email)=lower(((select auth.jwt())->>'email'))
  and (venue_id is null or exists (
    select 1 from public.gt_venues v
    where v.id=venue_id and v.city_key='atlanta' and v.status='active' and v.is_verified is true
  ))
);
