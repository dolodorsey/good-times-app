-- GOOD TIMES customer-data RLS hardening.
-- Authenticated users retain access to only their own rows.
-- service_role bypasses RLS natively and does not require a policy.

begin;

alter table public.gt_user_profiles enable row level security;
alter table public.gt_saved_items enable row level security;

drop policy if exists "Service role full access user profiles" on public.gt_user_profiles;
drop policy if exists "Service role full access saved items" on public.gt_saved_items;

drop policy if exists "Users can view own profile" on public.gt_user_profiles;
create policy "Users can view own profile"
on public.gt_user_profiles
for select
to authenticated
using ((select auth.uid()) = auth_id);

drop policy if exists "Users can update own profile" on public.gt_user_profiles;
create policy "Users can update own profile"
on public.gt_user_profiles
for update
to authenticated
using ((select auth.uid()) = auth_id)
with check ((select auth.uid()) = auth_id);

drop policy if exists "Users can view saved items" on public.gt_saved_items;
create policy "Users can view saved items"
on public.gt_saved_items
for select
to authenticated
using (
  user_id in (
    select profile.id
    from public.gt_user_profiles as profile
    where profile.auth_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert saved items" on public.gt_saved_items;
create policy "Users can insert saved items"
on public.gt_saved_items
for insert
to authenticated
with check (
  user_id in (
    select profile.id
    from public.gt_user_profiles as profile
    where profile.auth_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete saved items" on public.gt_saved_items;
create policy "Users can delete saved items"
on public.gt_saved_items
for delete
to authenticated
using (
  user_id in (
    select profile.id
    from public.gt_user_profiles as profile
    where profile.auth_id = (select auth.uid())
  )
);

commit;
