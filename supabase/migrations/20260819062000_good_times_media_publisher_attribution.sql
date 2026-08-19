-- GOOD TIMES media publisher attribution hardening.
-- When an approved visual replaces a venue hero, carry its provenance and verification status too.

create or replace function public.gt_apply_best_approved_media(
  p_subject_type text,
  p_subject_id text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  chosen record;
  affected integer:=0;
  selected_credit text;
  selected_source text;
begin
  if p_subject_type not in ('venue','event') then
    raise exception 'Unsupported subject type';
  end if;

  select * into chosen
  from public.v_gt_media_candidates_scored
  where subject_type=p_subject_type
    and subject_id=p_subject_id
    and status='approved'
    and subject_verified=true
    and coalesce(is_stock,false)=false
    and lower(rights_status) not in ('blocked','rejected','copyright_denied','do_not_use','unknown')
  order by visual_score desc,updated_at desc
  limit 1;

  if chosen.id is null then
    return jsonb_build_object('ok',false,'reason','no_approved_candidate','subject_type',p_subject_type,'subject_id',p_subject_id);
  end if;

  selected_credit:=coalesce(nullif(chosen.metadata->>'attribution',''),nullif(chosen.source_name,''),nullif(chosen.source_type,''));
  selected_source:=coalesce(nullif(chosen.source_name,''),nullif(chosen.source_type,''));

  if p_subject_type='venue' then
    update public.gt_venues
    set hero_image=chosen.url,
        photo_status='verified',
        photo_source=selected_source,
        photo_credit=selected_credit,
        updated_at=now()
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
    'rights_status',chosen.rights_status,
    'photo_source',selected_source,
    'photo_credit',selected_credit,
    'rows_updated',affected
  );
end;
$$;

revoke all on function public.gt_apply_best_approved_media(text,text) from public,anon,authenticated;
grant execute on function public.gt_apply_best_approved_media(text,text) to service_role;

comment on function public.gt_apply_best_approved_media(text,text) is
  'Internal GOOD TIMES publisher. Applies only an approved, subject-verified, non-stock visual with known usable rights and carries source/credit provenance into canonical venue media fields.';
