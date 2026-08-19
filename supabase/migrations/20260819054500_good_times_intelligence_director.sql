-- GOOD TIMES Intelligence Director v2
-- Culture-first ranking, source trust, independent visual research, and canonical agent registration.
-- This migration preserves evidence and leaves publication behind existing review/verification gates.

create table if not exists public.gt_media_candidates (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('venue','event')),
  subject_id text not null,
  url text not null,
  source_type text not null default 'unknown',
  source_name text,
  source_url text,
  image_width integer,
  image_height integer,
  captured_at timestamptz,
  rights_status text not null default 'unknown',
  subject_verified boolean not null default false,
  is_official boolean not null default false,
  is_editorial boolean not null default false,
  is_press boolean not null default false,
  is_creator boolean not null default false,
  is_curator_submission boolean not null default false,
  is_stock boolean not null default false,
  is_logo boolean not null default false,
  has_watermark boolean not null default false,
  text_heavy boolean not null default false,
  is_duplicate boolean not null default false,
  mobile_crop_safe boolean not null default false,
  composition_score numeric(5,2),
  status text not null default 'candidate' check (status in ('candidate','approved','rejected','quarantined')),
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_gt_media_candidates_subject_url
  on public.gt_media_candidates(subject_type,subject_id,md5(url));
create index if not exists idx_gt_media_candidates_subject
  on public.gt_media_candidates(subject_type,subject_id,status);
create index if not exists idx_gt_media_candidates_source
  on public.gt_media_candidates(source_type,status);

alter table public.gt_media_candidates enable row level security;
revoke all on public.gt_media_candidates from anon,authenticated;

comment on table public.gt_media_candidates is
  'Internal GOOD TIMES visual candidate ledger. Candidates are compared independently from entity quality/ranking.';

create or replace view public.v_gt_media_candidates_scored
with (security_invoker=true) as
select
  c.*,
  least(100,greatest(-100,
    case
      when c.is_official or lower(c.source_type) ~ '(official|venue_owned|venue-owned|organizer|artist_owned|team_owned)' then 25
      when c.is_editorial or lower(c.source_type) ~ '(editorial|magazine|newspaper|press_photo|photojournal)' then 24
      when c.is_press or lower(c.source_type) ~ '(press|publicity)' then 22
      when lower(c.source_type) ~ '(ticketing|eventbrite|ticketmaster|axs|dice)' then 19
      when c.is_creator or lower(c.source_type) ~ '(creator|photographer|social)' then 15
      when c.is_curator_submission or lower(c.source_type) ~ '(curator|submission)' then 9
      when c.is_stock or lower(c.source_type) ~ '(stock|unsplash|pexels|fallback|category)' then 1
      when lower(c.source_type) ~ '(current_record|current)' then 7
      else 5
    end
    + case when c.subject_verified then 20 when c.is_official then 16 else 0 end
    + case
        when c.image_width >= 1600 then 20
        when c.image_width >= 1200 then 17
        when c.image_width >= 800 then 12
        when c.image_width >= 600 then 8
        when c.image_width is not null then -8
        else 0
      end
    + case
        when c.image_width > 0 and c.image_height > 0 and c.image_width::numeric/c.image_height between 1.45 and 1.90 then 10
        when c.image_width > 0 and c.image_height > 0 and c.image_width::numeric/c.image_height between 1.20 and 2.10 then 7
        else 0
      end
    + case
        when c.captured_at >= now()-interval '90 days' then 10
        when c.captured_at >= now()-interval '365 days' then 7
        when c.captured_at >= now()-interval '730 days' then 3
        when c.captured_at is null then 3
        else 0
      end
    + case when c.mobile_crop_safe then 5 else 0 end
    + case when lower(c.rights_status) ~ '(approved|owned|licensed|permission|public_domain)' then 10 else 0 end
    + least(10,greatest(0,coalesce(c.composition_score,0)/10))
    - case when c.is_logo or lower(c.url) ~ '(^|[/_.-])(logo|wordmark|brandmark)([/_.-]|$)' then 40 else 0 end
    - case when c.has_watermark then 28 else 0 end
    - case when c.is_stock or lower(c.source_type) ~ '(stock|unsplash|pexels)' then 30 else 0 end
    - case when c.text_heavy and c.subject_type='venue' then 25 when c.text_heavy then 7 else 0 end
    - case when c.is_duplicate then 20 else 0 end
    - case when lower(c.source_type) ~ '(fallback|category)' then 25 else 0 end
  ))::numeric(6,2) as visual_score
from public.gt_media_candidates c;
revoke all on public.v_gt_media_candidates_scored from anon,authenticated;

create or replace view public.v_gt_best_media_candidate
with (security_invoker=true) as
select * from (
  select s.*,
    row_number() over (
      partition by s.subject_type,s.subject_id
      order by (s.status='approved') desc,s.visual_score desc,s.subject_verified desc,s.updated_at desc
    ) as candidate_rank
  from public.v_gt_media_candidates_scored s
  where s.status in ('candidate','approved')
    and lower(s.rights_status) not in ('blocked','rejected','copyright_denied','do_not_use')
) ranked
where candidate_rank=1;
revoke all on public.v_gt_best_media_candidate from anon,authenticated;

-- Preserve current app images as candidates rather than assuming they are the best possible visual.
insert into public.gt_media_candidates(
  subject_type,subject_id,url,source_type,source_name,subject_verified,is_stock,is_logo,status,metadata
)
select
  'venue',v.id::text,v.hero_image,'current_record','gt_venues',coalesce(v.is_verified,false),
  false,
  lower(v.hero_image) ~ '(^|[/_.-])(logo|wordmark|brandmark)([/_.-]|$)',
  'candidate',
  jsonb_build_object('legacy_primary',true,'city_key',v.city_key)
from public.gt_venues v
where v.hero_image is not null and btrim(v.hero_image)<>''
on conflict do nothing;

insert into public.gt_media_candidates(
  subject_type,subject_id,url,source_type,source_name,source_url,subject_verified,is_stock,is_logo,status,metadata
)
select
  'event',s.id::text,s.image_url,'current_record',coalesce(s.source,'gt_shows'),s.source_url,(s.status='confirmed'),
  false,
  lower(s.image_url) ~ '(^|[/_.-])(logo|wordmark|brandmark)([/_.-]|$)',
  'candidate',
  jsonb_build_object('legacy_primary',true,'city_key',s.city_key,'show_date',s.show_date)
from public.gt_shows s
where s.image_url is not null and btrim(s.image_url)<>''
on conflict do nothing;

-- Import the existing verification queue into the evidence ledger. Do not delete history.
insert into public.gt_media_candidates(
  subject_type,subject_id,url,source_type,source_name,image_width,image_height,
  subject_verified,is_stock,status,rejection_reason,metadata
)
select
  case when q.subject_type in ('venue','event') then q.subject_type else 'event' end,
  coalesce(q.subject_id,q.id::text),
  q.current_image_url,
  coalesce(nullif(q.source,''),'verification_queue'),
  q.source,
  q.image_width,q.image_height,
  (q.verdict='approved'),
  lower(coalesce(q.source,'')) ~ '(stock|unsplash|pexels)',
  case
    when q.verdict='approved' then 'approved'
    when q.verdict='rejected' then 'rejected'
    when q.subject_type='venue' and lower(coalesce(q.source,''))='stock' then 'rejected'
    when lower(coalesce(q.source,''))='perplexity_scout' then 'rejected'
    else 'candidate'
  end,
  case
    when q.subject_type='venue' and lower(coalesce(q.source,''))='stock' then 'Stock imagery may not impersonate a real GOOD TIMES venue.'
    when lower(coalesce(q.source,''))='perplexity_scout' then 'Retired/disallowed GOOD TIMES source. Retained only as evidence.'
    else q.rejection_reason
  end,
  jsonb_build_object('verification_queue_id',q.id,'imported_verdict',q.verdict)
from public.gt_image_verification_queue q
where q.current_image_url is not null and btrim(q.current_image_url)<>''
on conflict do nothing;

update public.gt_image_verification_queue
set verdict='rejected',
    rejection_reason='Stock imagery may not impersonate a real GOOD TIMES venue. Source verified real photography instead.',
    verified_at=coalesce(verified_at,now())
where verdict='pending'
  and subject_type='venue'
  and lower(coalesce(source,''))='stock';

update public.gt_image_verification_queue
set verdict='rejected',
    rejection_reason='Retired/disallowed GOOD TIMES source. Re-source through current authoritative or direct channels.',
    verified_at=coalesce(verified_at,now())
where verdict='pending'
  and lower(coalesce(source,''))='perplexity_scout';

-- Remove old search-engine-photo guidance from the canonical visual standards.
update public.gt_image_standards
set priority_2='Verified official/owned or licensed editorial/press photo of the exact attraction, independently identity-checked'
where category='attraction' and lower(priority_2) like '%google places%';

update public.gt_image_standards
set priority_2='Verified official, public-domain, or licensed editorial city photography showing the correct skyline or landmark'
where category='city' and lower(priority_2) like '%google images%';

-- Canonical GOOD TIMES intelligence roles for the current enterprise agent fleet.
insert into public.khg_agent_role_catalog(
  role_key,department,title,mission_template,cadence_minutes,authority_level,approval_required,
  allowed_actions,blocked_actions,input_sources,output_targets,success_metrics,playbook,status,updated_at
)
values
('gt_intelligence_director','Intelligence','Good Times Intelligence Director',
 'Coordinate culture discovery, source authority, verification, visual research, feed diversity, freshness, and release quality without allowing sourcing agents to publish directly.',30,'execute_internal',false,
 '["route_work","score_quality","open_review_items","escalate_conflicts"]'::jsonb,
 '["direct_unverified_publish","cross_brand_merge","credential_exposure"]'::jsonb,
 '["good_times_evidence","source_health","media_candidates","app_health"]'::jsonb,
 '["agent_work_items","quality_decisions","escalations"]'::jsonb,
 '{"unverified_publish_rate":0,"critical_regression_rate":0,"brand_leakage_rate":0}'::jsonb,
 '{"ranking":"culture-first","seo_weight":0,"proximity_max_weight":5,"visual_selection":"independent"}'::jsonb,'active',now()),
('gt_culture_editor','Editorial','Good Times Culture Editor',
 'Decide whether an experience is actually worth a GOOD TIMES recommendation using cultural relevance, experience quality, audience fit, uniqueness, and scene importance.',60,'execute_internal',false,
 '["score_cultural_relevance","reject_mediocre_inventory","label_editorial_lanes"]'::jsonb,
 '["rank_by_search_position","rank_by_distance_only"]'::jsonb,
 '["verified_catalog","culture_sources","independent_evidence"]'::jsonb,
 '["editorial_scores","editorial_labels"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_tastemaker_scout','Intelligence','Good Times Tastemaker Scout',
 'Discover strong emerging and established experiences from direct, official, cultural, editorial, creator, ticketing, community, university, Greek, sports, arts, chef, DJ, and promoter channels before they become generic search results.',120,'execute_internal',false,
 '["discover_candidates","capture_provenance","open_source_review"]'::jsonb,
 '["publish_directly","use_retired_provider","seo_rank_as_authority"]'::jsonb,
 '["public_web","official_calendars","approved_sources"]'::jsonb,
 '["evidence_ledger","source_candidates"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_source_authority','Intelligence','Good Times Source Authority Analyst',
 'Maintain source tiers, independence, provenance, conflicts, and freshness. Separate official factual truth from independent cultural validation.',120,'execute_internal',false,
 '["tier_sources","detect_conflicts","retire_bad_sources"]'::jsonb,
 '["follower_count_as_authority","search_rank_as_authority"]'::jsonb,
 '["source_registry","evidence_ledger"]'::jsonb,
 '["source_scores","conflict_flags"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_fact_verifier','Quality','Good Times Fact Verifier',
 'Verify identity, date, time, venue, status, ticket or reservation URL, organizer, restrictions, and cancellations. Never guess through source conflicts.',30,'execute_internal',false,
 '["cross_verify","quarantine_conflicts","confirm_direct_sources"]'::jsonb,
 '["guess_missing_critical_fact","single_source_critical_publish"]'::jsonb,
 '["evidence_ledger","official_sources","candidate_records"]'::jsonb,
 '["verification_verdicts","quarantine_items"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_visual_research','Creative Quality','Good Times Visual Research Director',
 'Build and score multiple truthful image candidates per venue or event; choose the strongest verified visual independently from the curator submission and independently from entity ranking.',60,'execute_internal',false,
 '["source_media_candidates","score_media","reject_stock_impersonation","select_best_verified_visual"]'::jsonb,
 '["curator_image_default","stock_for_real_venue","image_score_inflate_entity_quality","retired_provider"]'::jsonb,
 '["media_candidates","official_media","licensed_editorial_media","verification_queue"]'::jsonb,
 '["media_candidate_scores","visual_replacement_queue"]'::jsonb,'{}'::jsonb,
 '{"preferred":"verified real photography","fallback":"branded category art only when no truthful real visual is usable"}'::jsonb,'active',now()),
('gt_feed_diversity','Editorial','Good Times Feed Diversity Editor',
 'Prevent repetitive feeds across venue, category, neighborhood, promoter, and experience type while preserving genuinely dominant experiences.',30,'execute_internal',false,
 '["diversify_feed","cap_repetition","preserve_high_quality_exceptions"]'::jsonb,
 '["lower_quality_threshold_for_variety"]'::jsonb,
 '["ranked_candidates"]'::jsonb,
 '["diversified_feed_order"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_freshness_sentinel','Data Quality','Good Times Freshness Sentinel',
 'Recheck volatile facts at a cadence appropriate to event proximity and source volatility; broken or zero-yield sources require investigation, not fake healthy status.',30,'execute_internal',false,
 '["set_recheck_deadlines","flag_stale","flag_zero_yield","open_research_task"]'::jsonb,
 '["preserve_stale_inventory_for_counts","mark_zero_yield_healthy"]'::jsonb,
 '["event_inventory","source_health","verification_history"]'::jsonb,
 '["stale_queue","source_health_alerts"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now()),
('gt_release_guardian','Technology','Good Times Release Guardian',
 'Block releases that fail build, tests, schema compatibility, security checks, core journey smoke tests, data-quality gates, or runtime health checks.',30,'execute_internal',false,
 '["run_release_checks","block_bad_release","open_incident","verify_rollback"]'::jsonb,
 '["waive_failed_critical_check","hide_runtime_error"]'::jsonb,
 '["github_checks","vercel_runtime","supabase_advisors","app_health"]'::jsonb,
 '["release_verdict","incident_records"]'::jsonb,'{}'::jsonb,'{}'::jsonb,'active',now())
on conflict(role_key) do update set
  department=excluded.department,title=excluded.title,mission_template=excluded.mission_template,
  cadence_minutes=excluded.cadence_minutes,authority_level=excluded.authority_level,
  approval_required=excluded.approval_required,allowed_actions=excluded.allowed_actions,
  blocked_actions=excluded.blocked_actions,input_sources=excluded.input_sources,
  output_targets=excluded.output_targets,success_metrics=excluded.success_metrics,
  playbook=excluded.playbook,status='active',updated_at=now();

insert into public.khg_agents(
  agent_key,display_name,platform_key,role,department_id,entity_scope,system_prompt,primary_objective,
  success_metrics,reports_to,can_delegate_to,tools_allowed,tools_forbidden,max_cost_per_task_usd,max_tasks_per_day,status
)
values
('gt_intelligence_director','GOOD TIMES — Intelligence Director','chatgpt','gt_intelligence_director','dept_34_intelligence',array['good_times'],
 'Operate GOOD TIMES as a culture-first discovery product. Rank the experience first, then select imagery independently. SEO/search rank is never authority. Proximity is capped at five percent. Never publish unverified critical facts or merge brand context.',
 'Coordinate the GOOD TIMES intelligence and reliability system with explainable quality gates.',
 '{"unverified_publish_rate":0,"critical_regression_rate":0,"brand_leakage_rate":0}'::jsonb,null,
 array['gt_culture_editor','gt_tastemaker_scout','gt_source_authority','gt_fact_verifier','gt_visual_research','gt_feed_diversity','gt_freshness_sentinel','gt_release_guardian'],
 array['web_search','supabase','github','vercel'],array['perplexity','comet','google_place_details','apify','scrapegraph'],2.00,200,'active'),
('gt_culture_editor','GOOD TIMES — Culture Editor','chatgpt','gt_culture_editor','dept_34_intelligence',array['good_times'],
 'Judge actual cultural and experience value. Popularity, review count, SEO, and distance are evidence at most, never the definition of quality.',
 'Maintain a premium recommendation threshold and editorial lanes.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.00,150,'active'),
('gt_tastemaker_scout','GOOD TIMES — Tastemaker Scout','chatgpt','gt_tastemaker_scout','dept_11_trend_intel',array['good_times'],
 'Discover high-value experiences from current direct and authoritative public sources. Capture provenance. Never publish directly and never use retired GOOD TIMES providers.',
 'Find strong emerging and established experiences before generic search results do.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.50,200,'active'),
('gt_source_authority','GOOD TIMES — Source Authority Analyst','chatgpt','gt_source_authority','dept_34_intelligence',array['good_times'],
 'Tier sources by directness, authority, independence, historical accuracy, and freshness. Search rank and follower count alone contribute no authority.',
 'Keep source trust explainable and current.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.00,150,'active'),
('gt_fact_verifier','GOOD TIMES — Fact Verifier','chatgpt','gt_fact_verifier','dept_34_intelligence',array['good_times'],
 'Cross-verify critical facts against the strongest direct evidence. If sources conflict, flag the field; never guess.',
 'Keep published dates, times, venues, links, organizers, restrictions, and statuses correct.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.00,250,'active'),
('gt_visual_research','GOOD TIMES — Visual Research Director','chatgpt','gt_visual_research','dept_34_intelligence',array['good_times'],
 'Research multiple truthful media candidates. Prefer verified official or licensed editorial/press photography. Curator submissions must compete. Reject stock impersonation, logos as hero photography, wrong-subject media, weak duplicates, and retired provider output.',
 'Select the strongest truthful visual for every premium GOOD TIMES surface.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.50,200,'active'),
('gt_feed_diversity','GOOD TIMES — Feed Diversity Editor','chatgpt','gt_feed_diversity','dept_34_intelligence',array['good_times'],
 'Diversify strong qualified inventory by venue, category, neighborhood, promoter, and experience type without lowering the quality bar.',
 'Make the feed feel edited, not scraped.',null,'gt_intelligence_director',null,
 array['supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],0.50,300,'active'),
('gt_freshness_sentinel','GOOD TIMES — Freshness Sentinel','chatgpt','gt_freshness_sentinel','dept_15_ops',array['good_times'],
 'Recheck volatile event and venue facts on risk-based cadence. Stale and zero-yield sources must be visible and remediated.',
 'Prevent stale or cancelled inventory from surviving for coverage optics.',null,'gt_intelligence_director',null,
 array['web_search','supabase'],array['perplexity','comet','google_place_details','apify','scrapegraph'],0.75,300,'active'),
('gt_release_guardian','GOOD TIMES — Release Guardian','chatgpt','gt_release_guardian','dept_20_engineering',array['good_times'],
 'Block bad releases. Require tests, schema compatibility, security checks, production smoke tests, runtime health, and rollback readiness.',
 'Keep GOOD TIMES deployable without silent regressions.',null,'gt_intelligence_director',null,
 array['supabase','github','vercel'],array['perplexity','comet','google_place_details','apify','scrapegraph'],1.00,100,'active')
on conflict(agent_key) do update set
  display_name=excluded.display_name,platform_key=excluded.platform_key,role=excluded.role,
  department_id=excluded.department_id,entity_scope=excluded.entity_scope,system_prompt=excluded.system_prompt,
  primary_objective=excluded.primary_objective,success_metrics=excluded.success_metrics,
  reports_to=excluded.reports_to,can_delegate_to=excluded.can_delegate_to,
  tools_allowed=excluded.tools_allowed,tools_forbidden=excluded.tools_forbidden,
  max_cost_per_task_usd=excluded.max_cost_per_task_usd,max_tasks_per_day=excluded.max_tasks_per_day,status='active';

-- Replace the public live inventory function with a quality-first candidate pool.
-- Google ratings remain metadata for display/research but do not decide ordering.
-- Hero-image source/path no longer boosts venue inventory order.
create or replace function public.gt_public_live_inventory(
  p_city text,
  p_service_date date,
  p_event_limit integer default 480,
  p_venue_limit integer default 360
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(to_jsonb(e))
      from (
        select
          id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,
          image_url,description,organizer,source,source_url,status,quality_score,freshness_tier,
          display_priority,good_times_score,category_key_v2,subcategory_key_v2,
          is_featured,is_curated,updated_at
        from public.gt_shows
        where city_key = p_city
          and show_date >= p_service_date
          and status in ('confirmed','tentative')
          and image_url is not null
          and ticket_url is not null
        order by
          show_date asc,
          (status='confirmed') desc,
          is_curated desc,
          quality_score desc nulls last,
          updated_at desc,
          event_name asc
        limit least(greatest(coalesce(p_event_limit,480),1),720)
      ) e
    ), '[]'::jsonb),
    'venues', coalesce((
      select jsonb_agg(to_jsonb(v))
      from (
        select
          id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,
          quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,
          instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
        from (
          select
            id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,
            quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,
            instagram_handle,website,phone,booking_link,status,latitude,longitude,
            category_key as venue_category_key,
            subcategory as venue_subcategory,
            culture_score,
            row_number() over (
              partition by hero_image
              order by
                is_culture_pick desc,
                is_black_owned desc,
                culture_score desc nulls last,
                quality_score desc nulls last,
                name asc
            ) as image_rank
          from public.gt_venues
          where city_key = p_city
            and status = 'active'
            and is_verified = true
            and hero_image is not null
        ) ranked
        where image_rank = 1
        order by
          is_culture_pick desc,
          culture_tier asc nulls last,
          culture_score desc nulls last,
          quality_score desc nulls last,
          name asc
        limit least(greatest(coalesce(p_venue_limit,360),1),540)
      ) v
    ), '[]'::jsonb)
  );
$function$;

comment on function public.gt_public_live_inventory(text,date,integer,integer) is
  'GOOD TIMES live candidate inventory. Quality/culture first; SEO, search position, Google rating, and hero-image path do not determine order.';
