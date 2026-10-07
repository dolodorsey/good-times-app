-- Restrict two internal GOOD TIMES contact-audience views identified by the live advisor review.
-- Preserve view definitions, owner, suppression logic, and server-reader access.
begin;

do $$
declare view_name text; target oid;
begin
  foreach view_name in array array[
    'v_good_times_founder_authorized_email_audience_v1',
    'v_good_times_founder_authorized_email_batch_v1'
  ] loop
    select c.oid into target from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=view_name and c.relkind='v';
    if target is null then raise exception 'Expected public view is missing: %',view_name; end if;
    if not exists(select 1 from pg_attribute a where a.attrelid=target
      and a.attname='email' and a.atttypid='text'::regtype and a.attnum>0 and not a.attisdropped) then
      raise exception 'Expected email-view signature changed: %',view_name;
    end if;
  end loop;
end $$;

revoke all privileges on table
  public.v_good_times_founder_authorized_email_audience_v1,
  public.v_good_times_founder_authorized_email_batch_v1
from public,anon,authenticated;

grant select on table
  public.v_good_times_founder_authorized_email_audience_v1,
  public.v_good_times_founder_authorized_email_batch_v1
to service_role;

do $$
declare view_name text; target oid; browser_role text;
begin
  foreach view_name in array array[
    'v_good_times_founder_authorized_email_audience_v1',
    'v_good_times_founder_authorized_email_batch_v1'
  ] loop
    target:=format('public.%I',view_name)::regclass;
    foreach browser_role in array array['anon','authenticated'] loop
      if has_table_privilege(browser_role,target,'SELECT') or exists(
        select 1 from pg_attribute a where a.attrelid=target and a.attnum>0 and not a.attisdropped
          and has_column_privilege(browser_role,target,a.attnum,'SELECT')) then
        raise exception 'Client SELECT remains on %.% for %','public',view_name,browser_role;
      end if;
    end loop;
    if not has_table_privilege('service_role',target,'SELECT') then
      raise exception 'Server SELECT missing on public.%',view_name;
    end if;
  end loop;
end $$;

commit;
