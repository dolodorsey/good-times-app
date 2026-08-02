begin;

alter table public.gt_venue_mentions
  add column if not exists platform text,
  add column if not exists source_post_id text,
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists view_count integer not null default 0,
  add column if not exists match_method text,
  add column if not exists match_confidence numeric(5,4),
  add column if not exists hashtags text[],
  add column if not exists source_categories text[],
  add column if not exists raw_signal jsonb;

create unique index if not exists idx_gt_venue_mentions_venue_url_unique
  on public.gt_venue_mentions (venue_id, mention_url)
  where venue_id is not null and mention_url is not null;

create index if not exists idx_gt_venues_instagram_handle_normalized
  on public.gt_venues ((lower(trim(both '@' from instagram_handle))))
  where instagram_handle is not null and trim(instagram_handle) <> '';

create index if not exists idx_gt_culture_sources_handle_normalized
  on public.gt_culture_sources ((lower(trim(both '@' from instagram_handle))))
  where instagram_handle is not null and trim(instagram_handle) <> '';

create or replace view public.v_gt_venue_social_signal
with (security_invoker = true)
as
with aggregates as (
  select
    m.venue_id,
    count(*)::integer as mention_count,
    count(distinct nullif(lower(m.source_handle), ''))::integer as source_breadth,
    count(*) filter (where m.source_id is not null)::integer as tracked_source_mentions,
    coalesce(sum(greatest(coalesce(m.authority_at_time, 0), 0)), 0)::numeric as authority_total,
    coalesce(sum(
      greatest(coalesce(m.like_count, 0), 0)
      + greatest(coalesce(m.comment_count, 0), 0) * 2
      + floor(greatest(coalesce(m.view_count, 0), 0) / 100.0)
    ), 0)::numeric as engagement_total,
    max(m.mentioned_at) as latest_mention_at
  from public.gt_venue_mentions m
  where m.platform = 'instagram'
    and m.venue_id is not null
  group by m.venue_id
), components as (
  select
    a.*,
    least(35, a.source_breadth * 7)::integer as source_breadth_points,
    least(30, floor(a.authority_total / 10.0))::integer as source_authority_points,
    least(20, floor(ln(1 + a.engagement_total) * 4.0))::integer as engagement_points,
    case
      when a.latest_mention_at >= now() - interval '7 days' then 15
      when a.latest_mention_at >= now() - interval '30 days' then 12
      when a.latest_mention_at >= now() - interval '90 days' then 8
      when a.latest_mention_at >= now() - interval '180 days' then 4
      else 0
    end::integer as freshness_points
  from aggregates a
)
select
  v.id as venue_id,
  v.city_key,
  v.name as venue_name,
  v.instagram_handle,
  c.mention_count,
  c.source_breadth,
  c.tracked_source_mentions,
  c.authority_total,
  c.engagement_total,
  c.latest_mention_at,
  c.source_breadth_points,
  c.source_authority_points,
  c.engagement_points,
  c.freshness_points,
  least(100,
    c.source_breadth_points
    + c.source_authority_points
    + c.engagement_points
    + c.freshness_points
  )::integer as social_signal_score
from components c
join public.gt_venues v on v.id = c.venue_id;

create or replace view public.v_gt_unmatched_instagram_handles_review
with (security_invoker = true)
as
with atl_posts as (
  select
    lower(coalesce(h.username, '')) as posting_handle,
    h.post_url,
    (array_agg(h.caption order by h.scraped_at desc nulls last, h.id desc))[1] as caption,
    greatest(max(coalesce(h.like_count, 0)), 0)::integer as likes,
    greatest(max(coalesce(h.comment_count, 0)), 0)::integer as comments,
    greatest(max(coalesce(h.view_count, 0)), 0)::integer as views,
    max(h.posted_at) as posted_at,
    array_agg(distinct lower(h.hashtag)) as hashtags,
    array_agg(distinct lower(w.category)) as source_categories
  from public.ig_hashtag_results h
  join public.ig_hashtag_watchlist w
    on lower(w.hashtag) = lower(h.hashtag)
  where w.is_active = true
    and lower(w.city) = 'atl'
    and h.post_url is not null
    and h.caption like '%@%'
  group by lower(coalesce(h.username, '')), h.post_url
), extracted as (
  select p.*, lower((mention)[1]) as mentioned_handle
  from atl_posts p
  cross join lateral regexp_matches(
    lower(coalesce(p.caption, '')),
    '@([a-z0-9_.]{2,30})',
    'g'
  ) mention
), unmatched as (
  select e.*
  from extracted e
  where e.mentioned_handle <> e.posting_handle
    and not exists (
      select 1
      from public.gt_venues v
      where v.city_key = 'atlanta'
        and lower(trim(both '@' from coalesce(v.instagram_handle, ''))) = e.mentioned_handle
    )
    and not exists (
      select 1
      from public.gt_culture_sources s
      where s.city_key = 'atlanta'
        and lower(trim(both '@' from coalesce(s.instagram_handle, ''))) = e.mentioned_handle
    )
), summarized as (
  select
    mentioned_handle,
    count(distinct post_url)::integer as post_count,
    count(distinct posting_handle)::integer as independent_posting_accounts,
    max(likes + comments)::integer as max_observed_engagement,
    max(views)::integer as max_observed_views,
    max(posted_at) as latest_post_at,
    array_agg(distinct posting_handle order by posting_handle) as posting_handles,
    max(post_url) as example_post_url
  from unmatched
  group by mentioned_handle
  having count(distinct post_url) >= 2
      or max(likes + comments) >= 50
      or max(views) >= 5000
), hashtag_rollup as (
  select u.mentioned_handle,
         array_agg(distinct hashtag order by hashtag) as hashtags
  from unmatched u
  cross join lateral unnest(u.hashtags) hashtag
  group by u.mentioned_handle
), category_rollup as (
  select u.mentioned_handle,
         array_agg(distinct category order by category) as source_categories
  from unmatched u
  cross join lateral unnest(u.source_categories) category
  group by u.mentioned_handle
)
select
  s.mentioned_handle,
  s.post_count,
  s.independent_posting_accounts,
  s.max_observed_engagement,
  s.max_observed_views,
  s.latest_post_at,
  s.posting_handles,
  h.hashtags,
  c.source_categories,
  s.example_post_url
from summarized s
left join hashtag_rollup h using (mentioned_handle)
left join category_rollup c using (mentioned_handle);

alter table public.gt_venue_mentions enable row level security;
alter table public.gt_source_discoveries enable row level security;
alter table public.gt_culture_sources enable row level security;
alter table public.gt_culture_intake_queue enable row level security;

revoke all privileges on table public.gt_venue_mentions from anon, authenticated;
revoke all privileges on table public.gt_source_discoveries from anon, authenticated;
revoke all privileges on table public.gt_culture_sources from anon, authenticated;
revoke all privileges on table public.gt_culture_intake_queue from anon, authenticated;

-- The legacy Mac collector never needs destructive table capabilities. Normal
-- ingestion access is removed after the authenticated endpoint is verified.
revoke delete, truncate, references, trigger
on table public.ig_profile_snapshots,
         public.ig_post_metadata,
         public.ig_hashtag_results,
         public.ig_location_results,
         public.ig_scrape_jobs
from anon, authenticated;

revoke all on table public.v_gt_venue_social_signal from public, anon, authenticated;
revoke all on table public.v_gt_unmatched_instagram_handles_review from public, anon, authenticated;
grant select on table public.v_gt_venue_social_signal to service_role, postgres;
grant select on table public.v_gt_unmatched_instagram_handles_review to service_role, postgres;

comment on view public.v_gt_venue_social_signal is
'Evidence-only GOOD TIMES social score. It is not wired to live venue publication or live ranking.';

comment on view public.v_gt_unmatched_instagram_handles_review is
'Private review queue of frequently or strongly mentioned Instagram handles that do not exactly match a known Atlanta venue or approved culture source.';

commit;