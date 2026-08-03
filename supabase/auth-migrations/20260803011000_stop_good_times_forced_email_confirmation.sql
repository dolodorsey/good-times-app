begin;

-- GOOD TIMES Auth project only: czocqfaovfpjweayniuw.
-- Keep profile provisioning, but never bypass Supabase Auth email verification.
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
  )
  on conflict (auth_id) do update
  set email = excluded.email,
      full_name = case
        when nullif(trim(excluded.full_name), '') is not null then excluded.full_name
        else public.gt_user_profiles.full_name
      end,
      home_city = coalesce(nullif(trim(excluded.home_city), ''), public.gt_user_profiles.home_city),
      updated_at = now();

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

comment on function public.gt_handle_new_user() is
'Creates or refreshes the GOOD TIMES user profile after auth signup. It does not alter email confirmation state; verification remains controlled by Supabase Auth configuration.';

commit;
