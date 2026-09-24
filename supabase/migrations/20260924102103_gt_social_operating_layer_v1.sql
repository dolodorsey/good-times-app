-- GOOD TIMES Instagram growth operating layer. GOOD TIMES only; public funnel Atlanta only.
-- Applied to project czocqfaovfpjweayniuw on 2026-09-24 as version 20260924102103.
-- Related change on the KHG content project (dzlmtvodpyhetvektfuo), applied the same day:
--   migration gt_growth_events_allow_signup_and_first_action adds 'signup_complete' and 'first_action'
--   to the gt_growth_events event_name check constraint and public insert policy.
create table public.gt_social_channels (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null unique check (channel_key ~ '^[a-z0-9_]+$'),
  platform text not null check (platform in ('instagram','tiktok','threads','x','facebook','youtube')),
  handle text not null,
  city_slug text not null default 'atlanta' check (city_slug = 'atlanta'), -- widen only when GOOD TIMES publicly expands
  status text not null default 'active' check (status in ('active','paused','archived')),
  conversion_goal text not null default 'app_install',
  bio_destination_url text,
  default_campaign text not null default 'atl_always_on',
  posting_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gt_social_cta_links (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null references public.gt_social_channels(channel_key) on update cascade,
  placement text not null check (placement in ('bio','feed','reel','story','highlight','pinned','dm','partner','qr')),
  label text,
  destination_url text not null default 'https://thegoodtimesworldwide.com/',
  utm_source text not null default 'instagram' check (utm_source ~ '^[a-z0-9_-]+$'),
  utm_medium text not null check (utm_medium ~ '^[a-z0-9_-]+$'),
  utm_campaign text not null check (utm_campaign ~ '^[a-z0-9_-]+$'),
  utm_content text not null default '' check (utm_content ~ '^[a-z0-9_-]*$'),
  tracked_url text generated always as (
    destination_url || '?utm_source=' || utm_source || '&utm_medium=' || utm_medium || '&utm_campaign=' || utm_campaign
    || case when utm_content <> '' then '&utm_content=' || utm_content else '' end
  ) stored,
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_key, placement, utm_campaign, utm_content)
);

create table public.gt_social_post_ledger (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null references public.gt_social_channels(channel_key) on update cascade,
  post_type text not null check (post_type in ('repost','carousel','reel','story','original','weekly_roundup','monthly_lineup')),
  source_post_id bigint references public.source_posts(id) on delete set null,
  source_handle text,
  source_post_url text,
  source_event_name text,
  source_venue_name text,
  source_promoter_name text,
  tagged_handles text[] not null default '{}',
  caption text,
  cta_level text check (cta_level in ('soft','medium','hard')),
  cta_text text,
  cta_link_id uuid references public.gt_social_cta_links(id) on delete set null,
  status text not null default 'candidate' check (status in ('candidate','approved','scheduled','posted','rejected','archived')),
  scheduled_for timestamptz,
  posted_at timestamptz,
  instagram_post_url text,
  tags text[] not null default '{}',
  score numeric(5,2),
  metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index gt_social_post_ledger_source_dedupe on public.gt_social_post_ledger (channel_key, post_type, source_post_url) where source_post_url is not null;
create index gt_social_post_ledger_status_sched on public.gt_social_post_ledger (status, scheduled_for);
create index gt_social_post_ledger_source_handle on public.gt_social_post_ledger (source_handle);
create index gt_social_post_ledger_cta_link on public.gt_social_post_ledger (cta_link_id);
create index gt_social_post_ledger_source_post on public.gt_social_post_ledger (source_post_id);

create table public.gt_social_engagement_queue (
  id uuid primary key default gen_random_uuid(),
  channel_key text not null references public.gt_social_channels(channel_key) on update cascade,
  target_handle text not null,
  target_type text not null default 'other' check (target_type in ('venue','promoter','artist','restaurant','creator','fitness','sports','community','media','other')),
  relationship_type text,
  source_post_url text,
  ledger_id uuid references public.gt_social_post_ledger(id) on delete set null,
  action text not null check (action in ('like','comment','story_reply','repost','mention','dm','follow','save')),
  suggested_copy text,
  priority smallint not null default 50 check (priority between 1 and 100),
  due_at timestamptz,
  status text not null default 'queued' check (status in ('queued','in_progress','done','skipped','failed')),
  completed_at timestamptz,
  completed_by text,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gt_social_engagement_queue_status_due on public.gt_social_engagement_queue (status, due_at, priority desc);
create index gt_social_engagement_queue_target on public.gt_social_engagement_queue (target_handle);
create index gt_social_engagement_queue_ledger on public.gt_social_engagement_queue (ledger_id);
create index gt_social_engagement_queue_channel on public.gt_social_engagement_queue (channel_key);
create index gt_social_cta_links_channel on public.gt_social_cta_links (channel_key);
create index gt_social_post_ledger_channel on public.gt_social_post_ledger (channel_key);
create index source_posts_unprocessed on public.source_posts (fetched_at desc) where processed = false;

do $$ declare t text; begin
  foreach t in array array['gt_social_channels','gt_social_cta_links','gt_social_post_ledger','gt_social_engagement_queue'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t||'_service_role_only', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t||'_set_updated_at', t);
  end loop;
end $$;

-- source_posts -> repost candidates not yet in the ledger (service_role only)
create view public.gt_social_repost_candidates with (security_invoker = true) as
select sp.id as source_post_id, sp.handle, sp.post_url, sp.posted_at, sp.caption, sp.media_type, sp.fetched_at
from public.source_posts sp
where sp.processed = false and sp.platform = 'instagram'
  and not exists (select 1 from public.gt_social_post_ledger l where l.source_post_id = sp.id or l.source_post_url = sp.post_url);
revoke all on public.gt_social_repost_candidates from anon, authenticated;

insert into public.gt_social_channels (channel_key, platform, handle, bio_destination_url, posting_rules)
values ('good_times_instagram','instagram','@GOODTIMESWORLDWIDE',
  'https://thegoodtimesworldwide.com/?utm_source=instagram&utm_medium=bio&utm_campaign=atl_always_on',
  '{"stories_per_day":[8,15],"feed_posts_per_day":[3,6],"tag_all_relevant_accounts":true,"no_filler":true,"markets_public":["atlanta"]}');

insert into public.gt_social_cta_links (channel_key, placement, label, utm_medium, utm_campaign) values
 ('good_times_instagram','bio','Instagram bio link','bio','atl_always_on'),
 ('good_times_instagram','feed','Feed caption link','feed','atl_always_on'),
 ('good_times_instagram','reel','Reel caption link','reel','atl_always_on'),
 ('good_times_instagram','story','Story link sticker','story','atl_always_on'),
 ('good_times_instagram','highlight','GET APP highlight','highlight','atl_always_on'),
 ('good_times_instagram','pinned','Pinned posts','pinned','atl_always_on'),
 ('good_times_instagram','dm','DM replies','dm','atl_always_on');
