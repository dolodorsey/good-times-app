-- This migration targets the dedicated GOOD TIMES auth project.
-- It is idempotent and repairs accounts created before profile provisioning existed.
insert into public.gt_user_profiles (auth_id, email, full_name, home_city)
select
  user_row.id,
  user_row.email,
  coalesce(user_row.raw_user_meta_data->>'full_name', ''),
  coalesce(nullif(trim(user_row.raw_user_meta_data->>'home_city'), ''), 'atlanta')
from auth.users as user_row
where not exists (
  select 1
  from public.gt_user_profiles as profile
  where profile.auth_id = user_row.id
)
on conflict (auth_id) do nothing;
