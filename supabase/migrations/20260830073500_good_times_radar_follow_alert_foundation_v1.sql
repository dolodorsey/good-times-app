create table if not exists public.gt_user_follows (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null,
  entity_type text not null check (entity_type in ('artist','venue','organizer','category','series','place','event','neighborhood')),
  entity_id text not null,
  city_slug text,
  alert_level text not null default 'normal' check (alert_level in ('quiet','normal','never_miss')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auth_id,entity_type,entity_id)
);

create table if not exists public.gt_alert_preferences (
  auth_id uuid primary key,
  intensity text not null default 'normal' check (intensity in ('quiet','normal','never_miss')),
  just_announced boolean not null default true,
  presale boolean not null default true,
  on_sale boolean not null default true,
  selling_fast boolean not null default true,
  saved_reminders boolean not null default true,
  event_changes boolean not null default true,
  city_alerts boolean not null default true,
  weekend_brief boolean not null default true,
  nearby boolean not null default false,
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'America/New_York',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gt_alert_queue (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null,
  alert_type text not null check (alert_type in ('just_announced','presale','on_sale','selling_fast','saved_reminder','event_change','city_alert','weekend_brief','nearby')),
  object_type text,
  object_id text,
  city_slug text,
  title text not null,
  body text,
  action_url text,
  scheduled_for timestamptz not null default now(),
  delivered_at timestamptz,
  status text not null default 'queued' check (status in ('queued','processing','sent','suppressed','failed')),
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists gt_alert_queue_dedupe_key_uidx on public.gt_alert_queue(dedupe_key) where dedupe_key is not null;
create index if not exists gt_user_follows_auth_active_idx on public.gt_user_follows(auth_id,is_active);
create index if not exists gt_user_follows_entity_idx on public.gt_user_follows(entity_type,entity_id,is_active);
create index if not exists gt_alert_queue_delivery_idx on public.gt_alert_queue(status,scheduled_for);
create index if not exists gt_alert_queue_auth_idx on public.gt_alert_queue(auth_id,created_at desc);

alter table public.gt_user_follows enable row level security;
alter table public.gt_alert_preferences enable row level security;
alter table public.gt_alert_queue enable row level security;

drop policy if exists gt_user_follows_select_own on public.gt_user_follows;
create policy gt_user_follows_select_own on public.gt_user_follows for select using (auth.uid() = auth_id);
drop policy if exists gt_user_follows_insert_own on public.gt_user_follows;
create policy gt_user_follows_insert_own on public.gt_user_follows for insert with check (auth.uid() = auth_id);
drop policy if exists gt_user_follows_update_own on public.gt_user_follows;
create policy gt_user_follows_update_own on public.gt_user_follows for update using (auth.uid() = auth_id) with check (auth.uid() = auth_id);
drop policy if exists gt_user_follows_delete_own on public.gt_user_follows;
create policy gt_user_follows_delete_own on public.gt_user_follows for delete using (auth.uid() = auth_id);

drop policy if exists gt_alert_preferences_select_own on public.gt_alert_preferences;
create policy gt_alert_preferences_select_own on public.gt_alert_preferences for select using (auth.uid() = auth_id);
drop policy if exists gt_alert_preferences_insert_own on public.gt_alert_preferences;
create policy gt_alert_preferences_insert_own on public.gt_alert_preferences for insert with check (auth.uid() = auth_id);
drop policy if exists gt_alert_preferences_update_own on public.gt_alert_preferences;
create policy gt_alert_preferences_update_own on public.gt_alert_preferences for update using (auth.uid() = auth_id) with check (auth.uid() = auth_id);

drop policy if exists gt_alert_queue_select_own on public.gt_alert_queue;
create policy gt_alert_queue_select_own on public.gt_alert_queue for select using (auth.uid() = auth_id);

comment on table public.gt_user_follows is 'GOOD TIMES Follow Graph for artists, venues, organizers, categories, series and city entities.';
comment on table public.gt_alert_preferences is 'User-controlled GOOD TIMES Radar notification intensity and alert-type preferences.';
comment on table public.gt_alert_queue is 'Server-managed alert delivery queue for proactive GOOD TIMES Radar notifications.';
