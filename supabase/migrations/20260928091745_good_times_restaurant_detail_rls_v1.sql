-- Applied to GOOD TIMES content project dzlmtvodpyhetvektfuo.
-- Public attributes inherit canonical venue visibility. No inventory deletion or scheduler activation.
alter table public.gt_restaurant_profiles enable row level security;
revoke all on table public.gt_restaurant_profiles from public, anon, authenticated;
grant select on table public.gt_restaurant_profiles to anon, authenticated;
grant all on table public.gt_restaurant_profiles to service_role;

create policy gt_restaurant_profiles_current_atlanta_read
on public.gt_restaurant_profiles for select to anon, authenticated
using (exists (
  select 1 from public.gt_venues v
  where v.id = gt_restaurant_profiles.entity_id
    and v.city_key = 'atlanta'
    and v.status = 'active'
    and v.is_verified is true
    and v.verification_status = 'verified_current'
    and v.freshness_expires_at > now()
));

alter view public.v_gt_restaurant_entities set (security_invoker = true);
alter view public.v_gt_restaurant_enrichment_queue set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger
on public.v_gt_restaurant_entities, public.v_gt_restaurant_enrichment_queue
from public, anon, authenticated;

comment on policy gt_restaurant_profiles_current_atlanta_read on public.gt_restaurant_profiles
is 'Read-only attributes for currently verified Atlanta venues; gt_venues RLS remains authoritative. Backend service_role maintains enrichment.';
