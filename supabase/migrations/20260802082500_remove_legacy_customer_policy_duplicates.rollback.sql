create policy "Service role full access gt saved"
on public.gt_saved_items for all
using (auth.role() = 'service_role');

create policy "Users manage own saved items"
on public.gt_saved_items for all
using (
  user_id = (
    select id from public.gt_user_profiles where auth_id = auth.uid()
  )
);

create policy "Service role full access gt profiles"
on public.gt_user_profiles for all
using (auth.role() = 'service_role');

create policy "Users read own gt profile"
on public.gt_user_profiles for select
using (auth.uid() = auth_id);

create policy "Users update own gt profile"
on public.gt_user_profiles for update
using (auth.uid() = auth_id);
