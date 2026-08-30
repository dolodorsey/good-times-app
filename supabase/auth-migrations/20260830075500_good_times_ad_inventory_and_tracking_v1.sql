-- GOOD TIMES customer/auth database monetization inventory.
create table if not exists public.gt_ad_placements (
  placement_key text primary key,label text not null,surface text not null,format text not null default 'native_card',
  min_width integer,min_height integer,is_active boolean not null default true,sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
insert into public.gt_ad_placements(placement_key,label,surface,format,min_width,min_height,sort_order)
values
 ('home_radar_strip','Home / Radar Sponsor Strip','home','native_strip',300,92,10),
 ('home_feed_1','Home Feed Partner Card','home','native_card',300,160,20),
 ('discover_inline','Discover Inline Partner Card','discover','native_card',300,160,30),
 ('concierge_inline','Concierge Partner Card','concierge','native_card',300,140,40),
 ('saved_partner','Saved / Loyalty Partner Card','saved','native_strip',300,100,50)
on conflict (placement_key) do update set label=excluded.label,surface=excluded.surface,format=excluded.format,min_width=excluded.min_width,min_height=excluded.min_height,is_active=true,sort_order=excluded.sort_order,updated_at=now();

create table if not exists public.gt_ad_campaigns (
  id uuid primary key default gen_random_uuid(),advertiser_name text not null,campaign_name text not null,
  status text not null default 'draft' check(status in ('draft','active','paused','ended')),
  starts_at timestamptz,ends_at timestamptz,city_slugs text[] not null default '{}'::text[],placement_keys text[] not null default '{}'::text[],
  priority integer not null default 100,daily_impression_cap integer,total_impression_cap integer,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.gt_ad_creatives (
  id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.gt_ad_campaigns(id) on delete cascade,
  status text not null default 'draft' check(status in ('draft','approved','paused','retired')),format text not null default 'native_card',
  headline text not null,body text,image_url text,advertiser_logo_url text,cta_text text,cta_url text,alt_text text,
  metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.gt_ad_events (
  id uuid primary key default gen_random_uuid(),campaign_id uuid references public.gt_ad_campaigns(id) on delete set null,
  creative_id uuid references public.gt_ad_creatives(id) on delete set null,placement_key text not null references public.gt_ad_placements(placement_key),
  city_slug text,event_type text not null check(event_type in ('impression','click')),auth_id uuid,session_key text,
  metadata jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default now()
);
create index if not exists gt_ad_campaigns_delivery_idx on public.gt_ad_campaigns(status,starts_at,ends_at,priority);
create index if not exists gt_ad_creatives_campaign_idx on public.gt_ad_creatives(campaign_id,status);
create index if not exists gt_ad_events_reporting_idx on public.gt_ad_events(placement_key,event_type,occurred_at desc);
create index if not exists gt_ad_events_campaign_idx on public.gt_ad_events(campaign_id,occurred_at desc);

create or replace view public.v_gt_active_ads as
select p.placement_key,p.surface,p.format placement_format,p.min_width,p.min_height,c.id campaign_id,c.advertiser_name,c.campaign_name,c.priority,c.city_slugs,
       cr.id creative_id,cr.format,cr.headline,cr.body,cr.image_url,cr.advertiser_logo_url,cr.cta_text,cr.cta_url,cr.alt_text,c.starts_at,c.ends_at
from public.gt_ad_placements p
join public.gt_ad_campaigns c on p.placement_key=any(c.placement_keys)
join public.gt_ad_creatives cr on cr.campaign_id=c.id and cr.status='approved'
where p.is_active=true and c.status='active' and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now());

alter table public.gt_ad_placements enable row level security;
alter table public.gt_ad_campaigns enable row level security;
alter table public.gt_ad_creatives enable row level security;
alter table public.gt_ad_events enable row level security;
drop policy if exists gt_ad_placements_public_read on public.gt_ad_placements;
create policy gt_ad_placements_public_read on public.gt_ad_placements for select using(is_active=true);
drop policy if exists gt_ad_campaigns_public_active_read on public.gt_ad_campaigns;
create policy gt_ad_campaigns_public_active_read on public.gt_ad_campaigns for select using(status='active' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
drop policy if exists gt_ad_creatives_public_approved_read on public.gt_ad_creatives;
create policy gt_ad_creatives_public_approved_read on public.gt_ad_creatives for select using(status='approved');
drop policy if exists gt_ad_events_public_insert on public.gt_ad_events;
create policy gt_ad_events_public_insert on public.gt_ad_events for insert with check(event_type in ('impression','click'));
grant select on public.gt_ad_placements,public.gt_ad_campaigns,public.gt_ad_creatives,public.v_gt_active_ads to anon,authenticated;
grant insert on public.gt_ad_events to anon,authenticated;
