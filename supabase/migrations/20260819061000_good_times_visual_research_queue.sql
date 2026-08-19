-- GOOD TIMES Visual Research Queue + approved-media publisher.
-- Internal only. The research agent can see where real alternatives are missing and can publish only an approved candidate.

create or replace view public.v_gt_visual_research_queue
with (security_invoker=true) as
with candidate_stats as (
  select
    subject_type,
    subject_id,
    count(*) filter (where status in ('candidate','approved')) as usable_candidate_count,
    count(*) filter (where status='approved') as approved_candidate_count,
    max(visual_score) filter (where status in ('candidate','approved')) as best_visual_score,
    max(updated_at) as latest_candidate_at
  from public.v_gt_media_candidates_scored
  group by subject_type,subject_id
),
venue_rows as (
  select
    'venue'::text as subject_type,
    v.id::text as subject_id,
    v.name as subject_name,
    v.city_key,
    v.hero_image as current_media_url,
    coalesce(s.usable_candidate_count,0) as usable_candidate_count,
    coalesce(s.approved_candidate_count,0) as approved_candidate_count,
    s.best_visual_score,
    s.latest_candidate_at,
    case
      when coalesce(s.approved_candidate_count,0)=0 and coalesce(s.usable_candidate_count,0)<=1 then 100
      when coalesce(s.approved_candidate_count,0)=0 then 90
      when coalesce(s.best_visual_score,0)<60 then 80
      else 40
    end as research_priority,
    jsonb_build_object(
      'is_culture_pick',v.is_culture_pick,
      'culture_score',v.culture_score,
      'quality_score',v.quality_score,
      'category_key',v.category_key,
      'subcategory',v.subcategory,
      'instagram_handle',v.instagram_handle,
      'website',v.website
    ) as context
  from public.gt_venues v
  left join candidate_stats s on s.subject_type='venue' and s.subject_id=v.id::text
  where v.status='active' and v.is_verified=true
),
event_rows as (
  select
    'event'::text as subject_type,
    s0.id::text as subject_id,
    s0.event_name as subject_name,
    s0.city_key,
    s0.image_url as current_media_url,
    coalesce(s.usable_candidate_count,0) as usable_candidate_count,
    coalesce(s.approved_candidate_count,0) as approved_candidate_count,
    s.best_visual_score,
    s.latest_candidate_at,
    case
      when s0.show_date <= current_date + 3 and coalesce(s.approved_candidate_count,0)=0 then 100
      when coalesce(s.approved_candidate_count,0)=0 and coalesce(s.usable_candidate_count,0)<=1 then 95
      when coalesce(s.approved_candidate_count,0)=0 then 85
      when coalesce(s.best_visual_score,0)<60 then 75
      else 35
    end as research_priority,
    jsonb_build_object(
      'show_date',s0.show_date,
      'show_time',s0.show_time,
      'venue_name',s0.venue_name,
      'organizer',s0.organizer,
      'source',s0.source,
      'source_url',s0.source_url,
      'ticket_url',s0.ticket_url,
      'status',s0.status
    ) as context
  from public.gt_shows s0
  left join candidate_stats s on s.subject_type='event' and s.subject_id=s0.id::text
  where s0.show_date>=current_date and s0.status in ('confirmed','tentative')
)
select * from venue_rows
union all
select * from event_rows;

revoke all on public.v_gt_visual_research_queue from anon,authenticated;

create or replace function public.gt_apply_best_approved_media(
  p_subject_type text,
  p_subject_id text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  chosen record;
  affected integer:=0;
begin
  if p_subject_type not in ('venue','event') then
    raise exception 'Unsupported subject type';
  end if;

  select * into chosen
  from public.v_gt_media_candidates_scored
  where subject_type=p_subject_type
    and subject_id=p_subject_id
    and status='approved'
    and lower(rights_status) not in ('blocked','rejected','copyright_denied','do_not_use')
  order by visual_score desc,subject_verified desc,updated_at desc
  limit 1;

  if chosen.id is null then
    return jsonb_build_object('ok',false,'reason','no_approved_candidate','subject_type',p_subject_type,'subject_id',p_subject_id);
  end if;

  if p_subject_type='venue' then
    update public.gt_venues
    set hero_image=chosen.url,updated_at=now()
    where id::text=p_subject_id and is_verified=true and status='active';
    get diagnostics affected=row_count;
  else
    update public.gt_shows
    set image_url=chosen.url,updated_at=now()
    where id::text=p_subject_id and show_date>=current_date and status in ('confirmed','tentative');
    get diagnostics affected=row_count;
  end if;

  return jsonb_build_object(
    'ok',affected>0,
    'subject_type',p_subject_type,
    'subject_id',p_subject_id,
    'candidate_id',chosen.id,
    'media_url',chosen.url,
    'visual_score',chosen.visual_score,
    'rows_updated',affected
  );
end;
$$;

revoke all on function public.gt_apply_best_approved_media(text,text) from public,anon,authenticated;

comment on function public.gt_apply_best_approved_media(text,text) is
  'Internal GOOD TIMES publisher. Applies only the highest-scoring approved visual candidate to the canonical venue/event record.';
