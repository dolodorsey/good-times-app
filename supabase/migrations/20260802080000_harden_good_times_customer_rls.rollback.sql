-- Emergency rollback for 20260802080000_harden_good_times_customer_rls.sql.
-- Restores the exact prior policy shape for compatibility only.

begin;

drop policy if exists "Users can view own profile" on public.gt_user_profiles;
drop policy if exists "Users can update own profile" on public.gt_user_profiles;
drop policy if exists "Users can view saved items" on public.gt_saved_items;
drop policy if exists "Users can insert saved items" on public.gt_saved_items;
drop policy if exists "Users can delete saved items" on public.gt_saved_items;

create policy "Users can view own profile"
on public.gt_user_profiles for select
using (auth.uid() = auth_id);

create policy "Users can update own profile"
on public.gt_user_profiles for update
using (auth.uid() = auth_id)
with check (auth.uid() = auth_id);

create policy "Service role full access user profiles"
on public.gt_user_profiles for all
using (auth.role() = 'service_role');

create policy "Users can view saved items"
on public.gt_saved_items for select
using (user_id in (select id from public.gt_user_profiles where auth_id = auth.uid()));

create policy "Users can insert saved items"
on public.gt_saved_items for insert
with check (user_id in (select id from public.gt_user_profiles where auth_id = auth.uid()));

create policy "Users can delete saved items"
on public.gt_saved_items for delete
using (user_id in (select id from public.gt_user_profiles where auth_id = auth.uid()));

create policy "Service role full access saved items"
on public.gt_saved_items for all
using (auth.role() = 'service_role');

commit;
