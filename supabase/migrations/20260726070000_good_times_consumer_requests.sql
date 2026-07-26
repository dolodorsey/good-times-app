create table if not exists public.good_times_consumer_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('join','concierge-request','trip','group')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone text check (phone is null or char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15),
  city text,
  details jsonb not null default '{}'::jsonb,
  sms_consent boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','contacted','completed','closed')),
  source text not null default 'good-times-direct-route',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.good_times_consumer_requests enable row level security;
revoke all on table public.good_times_consumer_requests from anon, authenticated;
grant insert on table public.good_times_consumer_requests to anon, authenticated;
grant select, insert, update, delete on table public.good_times_consumer_requests to service_role;

create policy good_times_public_direct_request_insert
  on public.good_times_consumer_requests
  for insert to anon, authenticated
  with check (status = 'new' and source = 'good-times-direct-route');

create index if not exists good_times_requests_type_created_idx
  on public.good_times_consumer_requests (request_type, created_at desc);
create index if not exists good_times_requests_email_idx
  on public.good_times_consumer_requests (lower(email));

create or replace function public.notify_good_times_consumer_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_request_label text := regexp_replace(replace(new.request_type, '-', ' '), ' request$', '');
begin
  select id into v_organization_id
  from public.organizations
  where organization_key = 'khg' and status = 'active'
  limit 1;

  if v_organization_id is not null then
    insert into public.khg_notifications (
      organization_id, notification_type, title, body, entity_table,
      entity_id, brand_key, channel, status, metadata
    ) values (
      v_organization_id,
      'good_times_consumer_request',
      'Good Times: new ' || v_request_label || ' request',
      new.full_name || ' · ' || new.email || coalesce(' · ' || new.city, ''),
      'good_times_consumer_requests',
      new.id::text,
      'good-times',
      'in_app',
      'unread',
      jsonb_build_object(
        'request_type', new.request_type,
        'email', new.email,
        'phone', new.phone,
        'city', new.city,
        'source', new.source
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_good_times_consumer_request() from public, anon, authenticated;
grant execute on function public.notify_good_times_consumer_request() to postgres, service_role;

drop trigger if exists trg_notify_good_times_consumer_request on public.good_times_consumer_requests;
create trigger trg_notify_good_times_consumer_request
  after insert on public.good_times_consumer_requests
  for each row execute function public.notify_good_times_consumer_request();
