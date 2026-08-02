-- MCP Gateway / GOOD TIMES analytics hardening.
-- Preserve pseudonymous session analytics, but reject or remove untrusted
-- client-supplied user UUIDs.

create or replace function public.gt_sanitize_banner_event_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_uid uuid := (select auth.uid());
begin
  if v_auth_uid is null then
    new.user_id := null;
  elsif new.user_id is null then
    new.user_id := v_auth_uid;
  elsif new.user_id <> v_auth_uid then
    raise exception 'banner event user_id does not match authenticated user';
  end if;
  return new;
end;
$$;

revoke all on function public.gt_sanitize_banner_event_identity() from public, anon, authenticated;

drop trigger if exists gt_banner_events_sanitize_identity on public.gt_banner_events;
create trigger gt_banner_events_sanitize_identity
before insert or update of user_id on public.gt_banner_events
for each row
execute function public.gt_sanitize_banner_event_identity();
