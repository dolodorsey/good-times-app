-- GOOD TIMES production reconciliation.
-- Applied to content project dzlmtvodpyhetvektfuo as migration 20260928091745.
-- Makes restaurant detail facets readable only through current verified Atlanta venue records.

alter table public.gt_restaurant_profiles enable row level security;

drop policy if exists gt_restaurant_profiles_current_atlanta_read
  on public.gt_restaurant_profiles;

create policy gt_restaurant_profiles_current_atlanta_read
  on public.gt_restaurant_profiles
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.gt_venues v
      where v.id = gt_restaurant_profiles.entity_id
        and v.city_key = 'atlanta'
        and v.status = 'active'
        and v.is_verified is true
        and v.verification_status = 'verified_current'
        and v.freshness_expires_at > now()
    )
  );

alter view public.v_gt_restaurant_entities
  set (security_invoker = true);

revoke all on table public.gt_restaurant_profiles from anon, authenticated;
grant select on table public.gt_restaurant_profiles to anon, authenticated;

revoke all on table public.v_gt_restaurant_entities from anon, authenticated;
grant select on table public.v_gt_restaurant_entities to anon, authenticated;
