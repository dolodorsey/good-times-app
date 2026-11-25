begin;

-- Runs after the existing scoring/taxonomy triggers, only for a deliberately scoped write.
create or replace function gt_private.gt_preserve_reviewed_editorial_v1()
returns trigger language plpgsql set search_path=pg_catalog,public,gt_private as $$
declare approved jsonb; preserve_all boolean;
begin
  if current_setting('good_times.preserve_editorial_id',true) is distinct from new.id::text then return new; end if;
  approved:=coalesce(nullif(current_setting('good_times.reviewed_patch_fields',true),''),'[]')::jsonb;
  preserve_all:=coalesce(current_setting('good_times.preserve_all_ranking',true),'')='true';
  if preserve_all or coalesce(old.is_curated,false) or coalesce(old.is_featured,false) then
    new.is_curated:=old.is_curated; new.is_featured:=old.is_featured;
    new.curation_reason:=old.curation_reason; new.display_priority:=old.display_priority;
    new.good_times_score:=old.good_times_score; new.quality_score:=old.quality_score;
  end if;
  if nullif(btrim(old.category_key_v2),'') is not null and not approved ? 'category_key_v2' then
    new.category_key_v2:=old.category_key_v2;
  end if;
  if nullif(btrim(old.subcategory_key_v2),'') is not null and not approved ? 'subcategory_key_v2' then
    new.subcategory_key_v2:=old.subcategory_key_v2;
  end if;
  return new;
end; $$;
create or replace trigger zzzz_gt_preserve_reviewed_editorial_v1 before update on public.gt_shows
for each row execute function gt_private.gt_preserve_reviewed_editorial_v1();
revoke all on function gt_private.gt_preserve_reviewed_editorial_v1() from public,anon,authenticated;
grant execute on function gt_private.gt_preserve_reviewed_editorial_v1() to service_role,postgres;

create or replace function public.gt_apply_reviewed_listing_changes_v1(
  p_batch_id text,p_actor text,p_changes jsonb,p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,gt_private as $$
declare
  item jsonb; patch jsonb; evidence jsonb; before_row jsonb; expected_row jsonb; proposed jsonb; after_row jsonb;
  result jsonb:='[]'::jsonb; entry record; rtype text; rid uuid; rowkey text; fingerprint text;
  receipt gt_private.gt_backend_change_receipts_v1%rowtype; venue public.gt_venues%rowtype;
  allowed text[]; field_names text[]; changed text[]; cols text; selected_cols text; table_name text;
  expected timestamptz; observed timestamptz; reviewed_at timestamptz; stamp timestamptz; outcome text;
  refresh_event boolean; prior_target text; prior_fields text; prior_ranking text; venue_match jsonb;
  venue_fields constant text[]:=array[
    'name','address','neighborhood','latitude','longitude','website','booking_link','phone','instagram_handle',
    'short_desc','long_desc','hours','hours_summary','price_range','hero_image','photos','vibe_tags','best_for',
    'amenity_tags','dietary_tags','google_place_id','category_key','subcategory','status',
    'is_verified','verification_status','verified_at','freshness_expires_at','verification_method',
    'evidence_url_1','evidence_url_2','evidence_type_1','evidence_type_2','photo_source','photo_credit','is_stock_photo',
    'entity_kind','parent_entity_id','municipality','timezone'];
  event_fields constant text[]:=array[
    'event_name','event_type','genre','show_date','show_time','doors_time','end_date','end_time','timezone',
    'venue_id','venue_name','venue_address','organizer','artist_id','description','image_url','ticket_url',
    'ticket_price_min','ticket_price_max','admission_type','currency','price_basis','free_status',
    'is_sold_out','status','age_requirement','age_requirement_verified_at','source','source_url',
    'category_key_v2','subcategory_key_v2','provider_occurrence_id','fact_verified_at','valid_until'];
begin
  if p_batch_id is null or btrim(p_batch_id)='' or length(p_batch_id)>160 then
    raise exception using errcode='22023',message='batch_id must contain 1–160 characters';
  end if;
  if p_actor is null or p_actor not in ('DOT','LINDA (MUSE)','MARIA') then
    raise exception using errcode='22023',message='actor must be DOT, LINDA (MUSE), or MARIA';
  end if;
  if p_dry_run is null or jsonb_typeof(p_changes) is distinct from 'array'
    or jsonb_array_length(p_changes) not between 1 and 100 or octet_length(p_changes::text)>1048576 then
    raise exception using errcode='22023',message='changes must contain 1–100 rows within 1 MiB; dry_run is required';
  end if;
  -- A repeated batch cannot race a concurrent attempt using the same row keys.
  perform pg_advisory_xact_lock(hashtextextended('good_times:reviewed:'||p_batch_id,0));
  if exists(select 1 from jsonb_array_elements(p_changes) x
    group by x->>'row_key' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(p_changes) x
      group by x->>'record_type',x->>'record_id' having count(*)>1) then
    raise exception using errcode='22023',message='duplicate row_key or canonical record in one batch';
  end if;
  -- Consistent canonical ordering makes overlapping reviewed batches acquire locks in the same order.
  for item in select x from jsonb_array_elements(p_changes) x order by x->>'record_type',x->>'record_id' loop
    if jsonb_typeof(item) is distinct from 'object' or exists(
      select 1 from jsonb_object_keys(item) k where k not in
        ('row_key','record_type','record_id','expected_updated_at','review_state','patch','evidence','expected_values')) then
      raise exception using errcode='22023',message='invalid reviewed change keys';
    end if;
    rowkey:=item->>'row_key'; rtype:=item->>'record_type';
    if rowkey is null or btrim(rowkey)='' or length(rowkey)>160
      or rtype is null or rtype not in ('venue','event')
      or item->>'review_state' is distinct from 'APPROVED'
      or coalesce(item->>'record_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or jsonb_typeof(item->'expected_updated_at') is distinct from 'string' then
      raise exception using errcode='22023',message='exact identity, APPROVED review, and raw baseline timestamp required';
    end if;
    rid:=(item->>'record_id')::uuid; expected:=(item->>'expected_updated_at')::timestamptz;
    if not isfinite(expected) then raise exception using errcode='22023',message='invalid baseline timestamp'; end if;
    fingerprint:=md5(jsonb_build_object('actor',p_actor,'change',item)::text);
    select * into receipt from gt_private.gt_backend_change_receipts_v1 q where q.batch_id=p_batch_id and q.row_key=rowkey;
    if found then
      if receipt.input_hash is distinct from fingerprint then
        raise exception using errcode='23505',message='batch row already exists with different approved input';
      end if;
      result:=result||jsonb_build_array(jsonb_build_object('row_key',rowkey,'record_id',rid,'receipt_id',receipt.id,
        'outcome',receipt.outcome,'replayed',true,'changed_fields',receipt.changed_fields,
        'before_values',receipt.before_values,'after_values',receipt.after_values));
      continue;
    end if;
    patch:=item->'patch'; evidence:=item->'evidence';
    if jsonb_typeof(patch) is distinct from 'object' or patch='{}'::jsonb
      or jsonb_typeof(evidence) is distinct from 'object' then
      raise exception using errcode='22023',message='nonempty approved patch and evidence object required';
    end if;
    if jsonb_typeof(evidence->'source_url') is distinct from 'string'
      or (evidence->>'source_url') !~ '^https?://[^[:space:]<>@]+\.[^[:space:]<>@]+'
      or length(evidence->>'source_url')>4096
      or jsonb_typeof(evidence->'verified_at') is distinct from 'string'
      or jsonb_typeof(evidence->'reason') is distinct from 'string'
      or length(btrim(evidence->>'reason')) not between 8 and 4000 then
      raise exception using errcode='22023',message='detail source URL, actual fact verification time, and specific reason required';
    end if;
    reviewed_at:=(evidence->>'verified_at')::timestamptz;
    if not isfinite(reviewed_at) or reviewed_at>clock_timestamp()
      or reviewed_at<now()-(case when rtype='event' then interval '72 hours' else interval '30 days' end) then
      raise exception using errcode='22023',message='fact evidence must be current and cannot be future-dated';
    end if;
    allowed:=case when rtype='event' then event_fields else venue_fields end;
    for entry in select key,value from jsonb_each(patch) loop
      if not entry.key=any(allowed) then
        raise exception using errcode='22023',message='field is not approved for reviewed ingestion: '||entry.key;
      end if;
      if entry.value='null'::jsonb then continue; end if;
      if entry.key in ('latitude','longitude','ticket_price_min','ticket_price_max') then
        if jsonb_typeof(entry.value)<>'number' then raise exception using errcode='22023',message='numeric JSON value required: '||entry.key; end if;
      elsif entry.key in ('is_verified','is_stock_photo','is_sold_out') then
        if jsonb_typeof(entry.value)<>'boolean' then raise exception using errcode='22023',message='boolean JSON value required: '||entry.key; end if;
      elsif entry.key in ('photos','vibe_tags','best_for','amenity_tags','dietary_tags') then
        if jsonb_typeof(entry.value)<>'array' then raise exception using errcode='22023',message='array value required: '||entry.key; end if;
        if exists(select 1 from jsonb_array_elements(entry.value) v where jsonb_typeof(v)<>'string') then
          raise exception using errcode='22023',message='array of strings required: '||entry.key;
        end if;
        if entry.key='photos' and exists(select 1 from jsonb_array_elements_text(entry.value) v
          where v !~ '^https?://[^[:space:]<>@]+\.[^[:space:]<>@]+' or length(v)>4096) then
          raise exception using errcode='22023',message='photos require explicit HTTP(S) asset URLs';
        end if;
      elsif entry.key='hours' then
        if jsonb_typeof(entry.value)<>'object' then raise exception using errcode='22023',message='hours must be an explicit schedule object'; end if;
      elsif jsonb_typeof(entry.value)<>'string' or length(entry.value#>>'{}')>20000 then
        raise exception using errcode='22023',message='bounded string value required: '||entry.key;
      end if;
      if entry.key in ('website','booking_link','hero_image','image_url','ticket_url','source_url','evidence_url_1','evidence_url_2')
        and ((entry.value#>>'{}') !~ '^https?://[^[:space:]<>@]+\.[^[:space:]<>@]+' or length(entry.value#>>'{}')>4096) then
        raise exception using errcode='22023',message='HTTP(S) source URL required: '||entry.key;
      end if;
      if entry.key in ('verified_at','fact_verified_at','age_requirement_verified_at') then
        stamp:=(entry.value#>>'{}')::timestamptz;
        if not isfinite(stamp) or stamp>reviewed_at then
          raise exception using errcode='22023',message='verification marker cannot exceed the actual evidence time';
        end if;
      end if;
      if entry.key in ('show_date','end_date') and (entry.value#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception using errcode='22023',message='event dates require exact YYYY-MM-DD calendar values';
      end if;
    end loop;
    table_name:=case when rtype='event' then 'gt_shows' else 'gt_venues' end;
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',table_name) into before_row using rid;
    if before_row is null or before_row->>'city_key' is distinct from 'atlanta' then
      raise exception using errcode='22023',message='existing Atlanta record required; creates and cross-city writes are not supported';
    end if;
    observed:=(before_row->>'updated_at')::timestamptz;
    if observed is distinct from expected then
      raise exception using errcode='40001',message='stale baseline: refresh and re-review the canonical record';
    end if;
    if jsonb_typeof(item->'expected_values') is distinct from 'object' then
      raise exception using errcode='22023',message='expected_values must contain the exact baseline for every patch key';
    end if;
    execute format('select to_jsonb(x) from jsonb_populate_record(null::public.%I,$1) x',table_name)
      into expected_row using before_row||(item->'expected_values');
    for entry in select key,value from jsonb_each(patch) loop
      if not (item->'expected_values') ? entry.key or expected_row->entry.key is distinct from before_row->entry.key then
        raise exception using errcode='40001',message='baseline value changed: '||entry.key;
      end if;
    end loop;
    -- Conversion validates UUIDs, dates, numbers and the actual deployed column types without writing.
    execute format('select to_jsonb(x) from jsonb_populate_record(null::public.%I,$1) x',table_name)
      into proposed using before_row||patch;
    if exists(select 1 from pg_attribute a where a.attrelid=format('public.%I',table_name)::regclass
      and a.attnum>0 and not a.attisdropped and a.attnotnull
      and (proposed->a.attname is null or proposed->a.attname='null'::jsonb)) then
      raise exception using errcode='22023',message='required stored fields cannot be cleared';
    end if;
    if patch ? 'timezone' and proposed->>'timezone' is not null and not exists(
      select 1 from pg_timezone_names where name=proposed->>'timezone') then
      raise exception using errcode='22023',message='timezone must be a real IANA zone';
    end if;
    if rtype='event' then
      if nullif(btrim(proposed->>'event_name'),'') is null or proposed->>'show_date' is null
        or coalesce(proposed->>'event_type','') not in ('concert','comedy','festival','play','musical','sports','special_event','activation','nightlife','brunch')
        or coalesce(proposed->>'status','') not in ('confirmed','tentative','cancelled','postponed','sold_out') then
        raise exception using errcode='22023',message='event requires title, date, supported event type and status';
      end if;
      if patch ? 'free_status' and proposed->>'free_status' is not null and proposed->>'free_status' not in ('verified_free','verified_paid','conditional_free','unknown') then
        raise exception using errcode='22023',message='invalid free_status';
      end if;
      if patch ? 'currency' and proposed->>'currency' is not null and (proposed->>'currency') !~ '^[A-Z]{3}$' then
        raise exception using errcode='22023',message='currency must be a recorded three-letter ISO code';
      end if;
      if patch ? 'admission_type' and proposed->>'admission_type' is not null and proposed->>'admission_type' not in
        ('ticketed','free_admission','registration_required','reservation_required','walk_in','mixed_conditional') then
        raise exception using errcode='22023',message='invalid admission_type';
      end if;
      if patch ? 'price_basis' and proposed->>'price_basis' is not null and proposed->>'price_basis' not in
        ('per_person','per_ticket','per_group','per_table','from_price','donation','minimum_spend','varies') then
        raise exception using errcode='22023',message='invalid price_basis';
      end if;
      if (proposed->>'ticket_price_min')::numeric<0 or (proposed->>'ticket_price_max')::numeric<0
        or (proposed->>'ticket_price_min')::numeric>(proposed->>'ticket_price_max')::numeric then
        raise exception using errcode='22023',message='prices must be nonnegative and min cannot exceed max';
      end if;
      if patch ? 'age_requirement' and proposed->>'age_requirement' is not null
        and (not patch ? 'age_requirement_verified_at' or proposed->>'age_requirement_verified_at' is null) then
        raise exception using errcode='22023',message='age change requires its own evidence marker';
      end if;
      if proposed->>'end_date' is not null and (proposed->>'end_date')::date<(proposed->>'show_date')::date then
        raise exception using errcode='22023',message='end date precedes start date';
      end if;
      if proposed->>'end_date'=proposed->>'show_date'
        and gt_private.gt_time_key_v1(proposed->>'show_time') ~ '^[0-2][0-9]:[0-5][0-9]$'
        and gt_private.gt_time_key_v1(proposed->>'end_time') ~ '^[0-2][0-9]:[0-5][0-9]$'
        and gt_private.gt_time_key_v1(proposed->>'end_time')<=gt_private.gt_time_key_v1(proposed->>'show_time') then
        raise exception using errcode='22023',message='known end must follow known start; overnight events require the next end date';
      end if;
      if patch ? 'valid_until' and proposed->>'valid_until' is not null and
        ((proposed->>'valid_until')::timestamptz<=reviewed_at or not isfinite((proposed->>'valid_until')::timestamptz)) then
        raise exception using errcode='22023',message='fact expiry must be a finite time after verification';
      end if;
      if patch ? 'venue_id' and proposed->>'venue_id' is not null then
        select * into venue from public.gt_venues v where v.id=(proposed->>'venue_id')::uuid for share;
        if not found or venue.city_key<>'atlanta' or venue.status<>'active' or venue.is_verified is distinct from true
          or venue.verification_status<>'verified_current' or venue.freshness_expires_at is null or venue.freshness_expires_at<=now() then
          raise exception using errcode='22023',message='venue link requires an active, verified, fresh Atlanta venue';
        end if;
        if before_row->>'venue_id' is not null and before_row->>'venue_id' is distinct from proposed->>'venue_id' then
          raise exception using errcode='22023',message='canonical_link_replacement_requires_review';
        end if;
        venue_match:=gt_private.gt_resolve_venue_v1('atlanta',proposed->>'venue_name',proposed->>'venue_address');
        if venue_match->>'venue_id' is distinct from proposed->>'venue_id' then
          raise exception using errcode='22023',message='venue link requires an unambiguous full-address or reviewed-alias identity match';
        end if;
      end if;
      if patch ? 'venue_id' and before_row->>'venue_id' is not null and proposed->>'venue_id' is null then
        raise exception using errcode='22023',message='canonical_link_replacement_requires_review';
      end if;
      refresh_event:=patch ?& array['fact_verified_at','valid_until','show_date','show_time','venue_name','venue_address','status']
        and proposed->>'fact_verified_at' is not null and proposed->>'valid_until' is not null;
      if refresh_event and (proposed->>'fact_verified_at')::timestamptz is distinct from reviewed_at then
        raise exception using errcode='22023',message='full event re-verification marker must equal the actual evidence review time';
      end if;
    else
      if nullif(btrim(proposed->>'name'),'') is null then raise exception using errcode='22023',message='venue name is required'; end if;
      if patch ? 'status' and coalesce(proposed->>'status','') not in
        ('active','archived','closed','inactive','needs_reverification','pending_review','temporarily_closed') then
        raise exception using errcode='22023',message='invalid venue status';
      end if;
      if patch ? 'entity_kind' and proposed->>'entity_kind' is not null and proposed->>'entity_kind' not in
        ('venue','organization','organizer','performer','brand','room_stage','mobile_pop_up','unclassified') then
        raise exception using errcode='22023',message='invalid entity_kind';
      end if;
      if (proposed->>'latitude')::numeric not between -90 and 90 or (proposed->>'longitude')::numeric not between -180 and 180 then
        raise exception using errcode='22023',message='invalid coordinates';
      end if;
      if patch ? 'verification_status' and proposed->>'verification_status' is not null
        and proposed->>'verification_status' not in ('verified_current','needs_reverification','unverified','closed','temporarily_closed') then
        raise exception using errcode='22023',message='unsupported verification status';
      end if;
      if patch ?| array['is_verified','verification_status','verified_at','freshness_expires_at']
        and proposed->>'is_verified'='true' and proposed->>'verification_status'='verified_current'
        and (not patch ?& array['verified_at','freshness_expires_at','evidence_url_1']
          or proposed->>'verified_at' is null or proposed->>'evidence_url_1' is null
          or (proposed->>'verified_at')::timestamptz is distinct from reviewed_at
          or proposed->>'freshness_expires_at' is null
          or not isfinite((proposed->>'freshness_expires_at')::timestamptz)
          or (proposed->>'freshness_expires_at')::timestamptz<=reviewed_at) then
        raise exception using errcode='22023',message='current venue verification requires explicit evidence, review time and future expiry';
      end if;
      if patch ? 'parent_entity_id' and proposed->>'parent_entity_id' is not null then
        if proposed->>'parent_entity_id'=rid::text or not exists(select 1 from public.gt_venues v
          where v.id=(proposed->>'parent_entity_id')::uuid and v.city_key='atlanta') then
          raise exception using errcode='22023',message='parent must be a different existing Atlanta entity';
        end if;
        if exists(with recursive parents as (
          select v.id,v.parent_entity_id,array[v.id] as visited from public.gt_venues v where v.id=(proposed->>'parent_entity_id')::uuid
          union all select v.id,v.parent_entity_id,p.visited||v.id from parents p join public.gt_venues v on v.id=p.parent_entity_id
          where not v.id=any(p.visited)
        ) select 1 from parents where id=rid) then
          raise exception using errcode='22023',message='parent relationship would create an entity cycle';
        end if;
      end if;
      refresh_event:=false;
    end if;
    select coalesce(array_agg(key order by key),'{}'::text[]) into field_names from jsonb_each(patch);
    select coalesce(array_agg(key order by key),'{}'::text[]) into changed
      from jsonb_each(patch) where proposed->key is distinct from before_row->key;
    outcome:=case when cardinality(changed)=0 then 'unchanged'
      when rtype='event' and changed=array['venue_id']::text[] then 'linked' else 'updated' end;
    if cardinality(changed)=0 then after_row:=before_row;
    elsif p_dry_run then
      after_row:=proposed||jsonb_build_object('updated_at',case when rtype='venue' or refresh_event then to_jsonb(now()) else before_row->'updated_at' end);
    else
      prior_target:=current_setting('good_times.preserve_editorial_id',true);
      prior_fields:=current_setting('good_times.reviewed_patch_fields',true);
      prior_ranking:=current_setting('good_times.preserve_all_ranking',true);
      perform set_config('good_times.preserve_editorial_id',rid::text,true);
      perform set_config('good_times.reviewed_patch_fields',to_jsonb(field_names)::text,true);
      perform set_config('good_times.preserve_all_ranking','true',true);
      select string_agg(format('%I',key),',' order by key),string_agg(format('x.%I',key),',' order by key)
        into cols,selected_cols from jsonb_each(patch);
      execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1) x), updated_at=$3 where id=$2 returning to_jsonb(t)',table_name,cols,selected_cols,table_name)
        into after_row using patch,rid,case when rtype='venue' or refresh_event then now() else observed end;
      perform set_config('good_times.preserve_editorial_id',coalesce(prior_target,''),true);
      perform set_config('good_times.reviewed_patch_fields',coalesce(prior_fields,''),true);
      perform set_config('good_times.preserve_all_ranking',coalesce(prior_ranking,''),true);
      select coalesce(array_agg(key order by key),'{}'::text[]) into changed from jsonb_each(after_row)
        where value is distinct from before_row->key;
    end if;
    if not p_dry_run then
      insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,record_id,actor,outcome,reason,input_hash,
        changed_fields,before_values,after_values,evidence)
      values(p_batch_id,rowkey,rtype,rid,p_actor,outcome,evidence->>'reason',fingerprint,changed,before_row,after_row,evidence)
      returning * into receipt;
    end if;
    result:=result||jsonb_build_array(jsonb_build_object('row_key',rowkey,'record_id',rid,
      'receipt_id',case when p_dry_run then null else receipt.id end,'outcome',outcome,'dry_run',p_dry_run,
      'changed_fields',changed,'before_values',before_row,'after_values',after_row,
      'public_visibility','not_checked','prediction_only',p_dry_run));
  end loop;
  return jsonb_build_object('ok',true,'batch_id',p_batch_id,'dry_run',p_dry_run,'rows',result,
    'row_count',jsonb_array_length(result),'publication_verified',false);
end; $$;

revoke all on function public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean) to service_role,postgres;
comment on function public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean) is
  'Reviewed existing Atlanta records only. Exact baselines, explicit patch/evidence, atomic failure, dry-run by default, append-only idempotent receipts. Does not publish or create listings.';

commit;
