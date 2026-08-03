begin;

-- Security rollback: restore the earlier simple profile insert behavior without
-- reintroducing the unsafe auth.users email-confirmation update.
create or replace function public.gt_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  insert into public.gt_user_profiles (auth_id, email, full_name, home_city)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'home_city', 'atlanta')
  );

  return new;
exception when others then
  raise warning 'gt_handle_new_user profile creation failed for auth user %: % [%]', new.id, sqlerrm, sqlstate;
  return new;
end;
$$;

revoke all on function public.gt_handle_new_user()
from public, anon, authenticated;
grant execute on function public.gt_handle_new_user()
to service_role, postgres, supabase_auth_admin;

commit;
