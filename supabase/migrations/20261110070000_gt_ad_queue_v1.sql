-- GOOD TIMES · Ad spaces (2026-11-10)
-- Owner: "add our ad spaces throughout the app so we can advertise things — I'll tell you what goes in the queue;
-- start with our non profit stuff: Sole Exchange, Give a Gobble, Santa in Atlanta."
-- Every placement carries an honest disclosure label (Community for nonprofit/house, Sponsored for paid).
-- Only status='active' rows inside their window are public; the queue is managed from the admin console.
-- Named gt_ad_queue: public.gt_ad_placements in this project already holds the ad rate card (left untouched).

create table if not exists public.gt_ad_queue (
  id uuid primary key default gen_random_uuid(),
  city_key text not null default 'atlanta',
  advertiser text not null,
  kind text not null default 'house' check (kind in ('nonprofit','house','partner','sponsor')),
  disclosure_label text not null default 'Sponsored' check (disclosure_label in ('Community','Sponsored','Partner','GOOD TIMES')),
  kicker text,
  title text not null check (char_length(title) between 2 and 80),
  subtitle text check (subtitle is null or char_length(subtitle) <= 160),
  image_url text check (image_url is null or image_url ~* '^https://'),
  cta_label text not null default 'Learn More',
  cta_url text not null check (cta_url ~* '^https://'),
  placements text[] not null default array['home','places','entertainment','free','plan','profile'],
  priority integer not null default 100,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'queued' check (status in ('queued','active','paused','ended')),
  approved_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gt_ad_window check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint gt_ad_disclosure check (kind not in ('partner','sponsor') or disclosure_label in ('Sponsored','Partner'))
);
create index if not exists gt_ad_queue_live_idx on public.gt_ad_queue(city_key, status, priority);
alter table public.gt_ad_queue enable row level security;
drop policy if exists gt_ad_queue_public_read on public.gt_ad_queue;
create policy gt_ad_queue_public_read on public.gt_ad_queue for select to anon, authenticated
  using (status='active' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
grant select on public.gt_ad_queue to anon, authenticated;

create table if not exists public.gt_ad_queue_events (
  id bigint generated always as identity primary key,
  ad_id uuid references public.gt_ad_queue(id) on delete set null,
  placement text,
  event_type text not null check (event_type in ('impression','click')),
  anon_id text,
  utm_source text,
  created_at timestamptz not null default now()
);
alter table public.gt_ad_queue_events enable row level security;
revoke all on public.gt_ad_queue_events from anon, authenticated;

create or replace function public.gt_track_ad_event(p jsonb)
returns void language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
begin
  if coalesce(p->>'event_type','') not in ('impression','click') then return; end if;
  insert into public.gt_ad_queue_events(ad_id, placement, event_type, anon_id, utm_source)
  values (case when (p->>'ad_id') ~ '^[0-9a-f-]{36}$' and exists(select 1 from public.gt_ad_queue a where a.id=(p->>'ad_id')::uuid) then (p->>'ad_id')::uuid end,
          left(p->>'placement',40), p->>'event_type', left(p->>'anon_id',64), left(p->>'utm_source',80));
end $fn$;
revoke all on function public.gt_track_ad_event(jsonb) from public;
grant execute on function public.gt_track_ad_event(jsonb) to anon, authenticated;

create or replace view public.v_gt_ad_queue_metrics with (security_invoker = true) as
  select a.id, a.advertiser, a.title, a.status, a.priority,
    count(e.*) filter (where e.event_type='impression') impressions,
    count(e.*) filter (where e.event_type='click') clicks
  from public.gt_ad_queue a left join public.gt_ad_queue_events e on e.ad_id=a.id group by a.id;
revoke all on public.v_gt_ad_queue_metrics from anon, authenticated;

create or replace function public.gt_ad_queue_touch() returns trigger language plpgsql set search_path to 'public','pg_temp' as $fn$
begin new.updated_at := now(); return new; end $fn$;
drop trigger if exists gt_ad_queue_touch_trg on public.gt_ad_queue;
create trigger gt_ad_queue_touch_trg before update on public.gt_ad_queue for each row execute function public.gt_ad_queue_touch();

-- First queue (owner, 2026-11-10): Kollective nonprofit work. Facts from the official Eventbrite listings / site.
insert into public.gt_ad_queue(city_key, advertiser, kind, disclosure_label, kicker, title, subtitle, image_url, cta_label, cta_url, priority, starts_at, ends_at, status, approved_by, notes)
select * from (values
 ('atlanta','The Kollective Hospitality Group','nonprofit','Community','COMMUNITY · SAT, NOV 21 · 11 AM','Give a Gobble',
  'Free community turkey giveaway in Atlanta — helping families gather around the table this Thanksgiving.',
  'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914878%2F2574990468831%2F1%2Foriginal.20261030-085051?auto=format%2Ccompress&q=75&sharp=10&s=934d9ffb280c780ea34bc07e275c3355',
  'Free RSVP','https://www.eventbrite.com/e/give-a-gobble-turkey-drive-giveaway-tickets-2004110761236', 10, null::timestamptz, '2026-11-22 04:59:00+00'::timestamptz, 'active','owner 2026-11-10','Atlanta date (DC date is Nov 17)'),
 ('atlanta','The Kollective Hospitality Group','nonprofit','Community','COMMUNITY · TUE, DEC 22 · DOORS 8 PM','Santa in Atlanta',
  'Christmas concert + toy drive. Free with RSVP — bring a new, unwrapped toy for Atlanta kids.',
  'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914904%2F2574990468831%2F1%2Foriginal.20261030-085135?auto=format%2Ccompress&q=75&sharp=10&s=dc213d3caaf17eef600938afba923ce6',
  'Free RSVP','https://www.eventbrite.com/e/santa-in-atlanta-tickets-2004110817404', 20, null, '2026-12-23 04:59:00+00', 'active','owner 2026-11-10','Toys distributed Christmas Eve'),
 ('atlanta','Sole Exchange','nonprofit','Community','COMMUNITY · SHOE DRIVE','Sole Exchange',
  'Ongoing community shoe drive from The Kollective.',
  'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/websites/graphics/SOLE_EXCHANGE_WEBSITE/ChatGPT_Image_Jul_30_2026_02_35_07_AM_1_.png',
  'Learn More','https://soleexchangeworldwide.com', 30, null, null, 'active','owner 2026-11-10',null)
) v(city_key, advertiser, kind, disclosure_label, kicker, title, subtitle, image_url, cta_label, cta_url, priority, starts_at, ends_at, status, approved_by, notes)
where not exists (select 1 from public.gt_ad_queue a where a.title=v.title and a.city_key=v.city_key);
