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
)
select
  mentioned_handle,
  count(distinct post_url)::integer as post_count,
  count(distinct posting_handle)::integer as independent_posting_accounts,
  max(likes + comments)::integer as max_observed_engagement,
  max(views)::integer as max_observed_views,
  max(posted_at) as latest_post_at,
  array_agg(distinct posting_handle order by posting_handle) as posting_handles,
  array_agg(distinct hashtag order by hashtag) as hashtags,
  array_agg(distinct category order by category) as source_categories,
  max(post_url) as example_post_url
from unmatched
cross join lateral unnest(unmatched.hashtags) hashtag
cross join lateral unnest(unmatched.source_categories) category
group by mentioned_handle
having count(distinct post_url) >= 2
    or max(likes + comments) >= 50
    or max(views) >= 5000;

create or replace function public.gt_refresh_instagram_social_signals(
  p_city_key text default 'atlanta',
  p_limit integer default 5000,
  p_dry_run boolean default true
)
returns table (
  scanned_posts integer,
  matched_mentions integer,
  inserted_mentions integer,
  updated_mentions integer,
  source_candidates integer,
  unmatched_handle_candidates integer
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_city_key text := lower(trim(coalesce(p_city_key, 'atlanta')));
  v_watch_city text;
  v_scanned integer := 0;
  v_matched integer := 0;
  v_existing integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_source_candidates integer := 0;
  v_unmatched integer := 0;
begin
  if v_city_key = 'atl' then v_city_key := 'atlanta'; end if;
  if v_city_key <> 'atlanta' then
    raise exception 'Instagram social-signal processor is currently approved only for Atlanta';
  end if;

  p_limit := least(greatest(coalesce(p_limit, 5000), 1), 20000);
  v_watch_city := 'atl';

  drop table if exists pg_temp.tmp_gt_social_posts;
  drop table if exists pg_temp.tmp_gt_social_matches;

  create temporary table tmp_gt_social_posts on commit drop as
  select *
  from (
    select
      lower(coalesce(h.username, '')) as posting_handle,
      h.post_url,
      (array_agg(h.post_id order by h.scraped_at desc nulls last, h.id desc))[1] as source_post_id,
      (array_agg(h.caption order by h.scraped_at desc nulls last, h.id desc))[1] as caption,
      greatest(max(coalesce(h.like_count, 0)), 0)::integer as likes,
      greatest(max(coalesce(h.comment_count, 0)), 0)::integer as comments,
      greatest(max(coalesce(h.view_count, 0)), 0)::integer as views,
      max(h.posted_at) as posted_at,
      max(h.scraped_at) as scraped_at,
      array_agg(distinct lower(h.hashtag)) as hashtags,
      array_agg(distinct lower(w.category)) as source_categories
    from public.ig_hashtag_results h
    join public.ig_hashtag_watchlist w
      on lower(w.hashtag) = lower(h.hashtag)
    where w.is_active = true
      and lower(w.city) = v_watch_city
      and h.post_url is not null
      and h.caption like '%@%'
    group by lower(coalesce(h.username, '')), h.post_url
  ) deduplicated
  order by coalesce(posted_at, scraped_at) desc nulls last
  limit p_limit;

  get diagnostics v_scanned = row_count;

  create temporary table tmp_gt_social_matches on commit drop as
  with extracted as (
    select p.*, lower((mention)[1]) as mentioned_handle
    from tmp_gt_social_posts p
    cross join lateral regexp_matches(
      lower(coalesce(p.caption, '')),
      '@([a-z0-9_.]{2,30})',
      'g'
    ) mention
  ), canonical_venues as (
    select id, name, handle
    from (
      select
        v.id,
        v.name,
        lower(trim(both '@' from v.instagram_handle)) as handle,
        row_number() over (
          partition by lower(trim(both '@' from v.instagram_handle))
          order by
            coalesce(v.is_verified, false) desc,
            coalesce(v.quality_score, 0) desc,
            coalesce(v.culture_score, 0) desc,
            length(v.name),
            v.id
        ) as canonical_rank
      from public.gt_venues v
      where v.city_key = v_city_key
        and coalesce(trim(v.instagram_handle), '') <> ''
        and (v.status in ('active', 'verified', 'open') or v.status is null)
    ) ranked
    where canonical_rank = 1
  )
  select distinct on (e.post_url, v.id)
    v.id as venue_id,
    v.name as venue_name,
    v.handle as venue_handle,
    source.id as source_id,
    e.posting_handle as source_handle,
    e.post_url as mention_url,
    e.source_post_id,
    'instagram'::text as platform,
    'instagram_hashtag_exact_handle'::text as mention_type,
    left(e.caption, 1000) as caption_excerpt,
    'unknown'::text as sentiment,
    coalesce(
      source.authority_score,
      case
        when e.views >= 50000 or e.likes + e.comments >= 1000 then 70
        when e.views >= 10000 or e.likes + e.comments >= 250 then 60
        when e.views >= 5000 or e.likes + e.comments >= 50 then 50
        when e.likes + e.comments >= 10 then 35
        else 20
      end
    )::integer as authority_at_time,
    coalesce(e.posted_at, e.scraped_at, now()) as mentioned_at,
    e.likes as like_count,
    e.comments as comment_count,
    e.views as view_count,
    'exact_instagram_handle'::text as match_method,
    1.0000::numeric(5,4) as match_confidence,
    e.hashtags,
    e.source_categories,
    jsonb_build_object(
      'posting_handle', e.posting_handle,
      'venue_handle', v.handle,
      'scraped_at', e.scraped_at,
      'collector', 'khg_ig_scraper'
    ) as raw_signal
  from extracted e
  join canonical_venues v on v.handle = e.mentioned_handle
  left join lateral (
    select s.id, greatest(least(coalesce(s.authority_score, 50), 100), 0) as authority_score
    from public.gt_culture_sources s
    where s.city_key = v_city_key
      and s.is_active = true
      and lower(trim(both '@' from s.instagram_handle)) = e.posting_handle
    order by coalesce(s.authority_score, 50) desc, s.id
    limit 1
  ) source on true
  where e.posting_handle <> v.handle
  order by e.post_url, v.id;

  select count(*)::integer into v_matched from tmp_gt_social_matches;

  select count(*)::integer
  into v_existing
  from tmp_gt_social_matches m
  join public.gt_venue_mentions existing
    on existing.venue_id = m.venue_id
   and existing.mention_url = m.mention_url;

  select count(*)::integer
  into v_unmatched
  from public.v_gt_unmatched_instagram_handles_review;

  if not p_dry_run then
    insert into public.gt_venue_mentions (
      venue_id,
      venue_name_raw,
      source_id,
      source_handle,
      mention_url,
      mention_type,
      caption_excerpt,
      sentiment,
      authority_at_time,
      mentioned_at,
      platform,
      source_post_id,
      like_count,
      comment_count,
      view_count,
      match_method,
      match_confidence,
      hashtags,
      source_categories,
      raw_signal
    )
    select
      venue_id,
      venue_name,
      source_id,
      source_handle,
      mention_url,
      mention_type,
      caption_excerpt,
      sentiment,
      authority_at_time,
      mentioned_at,
      platform,
      source_post_id,
      like_count,
      comment_count,
      view_count,
      match_method,
      match_confidence,
      hashtags,
      source_categories,
      raw_signal
    from tmp_gt_social_matches
    on conflict (venue_id, mention_url)
      where venue_id is not null and mention_url is not null
    do update set
      source_id = excluded.source_id,
      source_handle = excluded.source_handle,
      mention_type = excluded.mention_type,
      caption_excerpt = excluded.caption_excerpt,
      authority_at_time = excluded.authority_at_time,
      mentioned_at = excluded.mentioned_at,
      platform = excluded.platform,
      source_post_id = excluded.source_post_id,
      like_count = excluded.like_count,
      comment_count = excluded.comment_count,
      view_count = excluded.view_count,
      match_method = excluded.match_method,
      match_confidence = excluded.match_confidence,
      hashtags = excluded.hashtags,
      source_categories = excluded.source_categories,
      raw_signal = excluded.raw_signal;

    v_inserted := greatest(v_matched - v_existing, 0);
    v_updated := least(v_existing, v_matched);

    with candidates as (
      select
        m.source_handle,
        count(distinct m.mention_url)::integer as post_count,
        count(distinct m.venue_id)::integer as venue_count,
        max(m.like_count + m.comment_count)::integer as max_engagement,
        max(m.view_count)::integer as max_views,
        bool_or(m.source_categories && array['city','events','event']) as posts_events,
        bool_or(m.source_categories && array['nightlife','social']) as posts_nightlife,
        bool_or(m.source_categories && array['food','industry']) as posts_food,
        bool_or(m.source_categories && array['culture','art','fashion','tourism']) as posts_culture,
        array(
          select distinct focus
          from unnest(array_cat_agg(m.source_categories)) focus
          where focus is not null and focus <> ''
          order by focus
        ) as content_focus
      from tmp_gt_social_matches m
      where m.source_id is null
        and coalesce(m.source_handle, '') <> ''
      group by m.source_handle
      having count(distinct m.mention_url) >= 2
          or max(m.like_count + m.comment_count) >= 50
          or max(m.view_count) >= 5000
    )
    insert into public.gt_source_discoveries (
      discovered_by,
      platform,
      handle_or_url,
      display_name,
      city,
      follower_count,
      posts_events,
      posts_nightlife,
      posts_food,
      posts_culture,
      content_focus,
      discovery_reason,
      status,
      integrated_to_sources,
      dedup_key,
      updated_at
    )
    select
      'gt_instagram_signal_processor',
      'instagram',
      'https://www.instagram.com/' || c.source_handle || '/',
      '@' || c.source_handle,
      'Atlanta',
      (
        select p.follower_count
        from public.ig_profile_snapshots p
        where lower(p.username) = c.source_handle
        order by p.snapshot_date desc, p.id desc
        limit 1
      ),
      c.posts_events,
      c.posts_nightlife,
      c.posts_food,
      c.posts_culture,
      c.content_focus,
      format(
        'Matched %s independent Instagram post(s) across %s GOOD TIMES venue(s); max engagement %s, max views %s.',
        c.post_count,
        c.venue_count,
        c.max_engagement,
        c.max_views
      ),
      'discovered',
      false,
      'instagram:' || v_city_key || ':' || c.source_handle,
      now()
    from candidates c
    on conflict (dedup_key) do update set
      handle_or_url = excluded.handle_or_url,
      display_name = excluded.display_name,
      follower_count = coalesce(excluded.follower_count, gt_source_discoveries.follower_count),
      posts_events = excluded.posts_events,
      posts_nightlife = excluded.posts_nightlife,
      posts_food = excluded.posts_food,
      posts_culture = excluded.posts_culture,
      content_focus = excluded.content_focus,
      discovery_reason = excluded.discovery_reason,
      updated_at = now();

    get diagnostics v_source_candidates = row_count;
  end if;

  return query select
    v_scanned,
    v_matched,
    v_inserted,
    v_updated,
    v_source_candidates,
    v_unmatched;
end;
$$;

comment on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
is 'Processes exact external Instagram venue-handle mentions into a private evidence ledger. It never publishes or activates venues.';

revoke all on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
from public, anon, authenticated;
grant execute on function public.gt_refresh_instagram_social_signals(text, integer, boolean)
to service_role, postgres;

revoke all privileges on table public.gt_venue_mentions from anon, authenticated;
revoke all privileges on table public.gt_source_discoveries from anon, authenticated;
revoke all privileges on table public.gt_culture_sources from anon, authenticated;
revoke all privileges on table public.gt_culture_intake_queue from anon, authenticated;

-- Keep the legacy collector's normal read/insert/update path temporarily available
-- while the authenticated ingestion endpoint is rolled out, but remove destructive
-- privileges that no collector should need.
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

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'gt-instagram-social-signals'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end $$;

select cron.schedule(
  'gt-instagram-social-signals',
  '10 */6 * * *',
  $$select * from public.gt_refresh_instagram_social_signals('atlanta', 5000, false);$$
);

commit;