begin;

-- Preserve the existing approved official-source intake and final editorial gate.
-- Remove arbitrary duplicate selection; record actual canonical outcomes.
create or replace function public.gt_ingest_priority_events_v1(p_source uuid,p_events jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,gt_private as $$
declare
  src record; e jsonb; k text; sid uuid; source_event uuid; ids uuid[]; venue_match jsonb; venue uuid;
  n integer:=0; fresh_count integer:=0; held integer:=0; ambiguous integer:=0; kind text; state text; pub boolean;
  conflict boolean; new_show boolean; before_row jsonb; after_row jsonb; staged public.gt_sourced_events%rowtype;
  facts jsonb; observed_facts jsonb; latest_raw jsonb; owned jsonb; fields text[]; outcome text; observed_at timestamptz; batch text;
  prior_target text; prior_fields text; prior_ranking text; observed_state text;
  prior_source public.gt_sourced_events%rowtype; link gt_private.gt_source_show_links_v1%rowtype;
  source_exists boolean; approved boolean; source_locked boolean; patch jsonb; source_patch jsonb; prior_owned jsonb;
  item record; cols text; selected_cols text; locked_fields text[]; conflicts text[]; nullable_field text;
  venue_changed boolean; venue_fields text[]:=array['venue_name','venue_address','venue_id'];
begin
  select s.source_name,s.source_url,p.* into src
  from public.gt_atlanta_priority_policy_v1 p join public.gt_event_sources s on s.id=p.source_id
  where p.source_id=p_source and p.enabled and lower(s.city)='atlanta';
  if not found then raise exception 'unknown_atlanta_source'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>150 then raise exception 'invalid_event_batch'; end if;
  -- Use the same lock order as canonical source promotion.
  perform pg_advisory_xact_lock(hashtext('gt_serial_promotion'));
  perform pg_advisory_xact_lock(hashtext('gt_atl_priority_ingest'));
  batch:='priority:'||p_source::text||':'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSUS');
  for e in select value from jsonb_array_elements(p_events) loop
    if coalesce(e->>'name','')='' or coalesce(e->>'sourceUrl','') !~ '^https://' or coalesce(e->>'venue','')='' then continue; end if;
    k:=md5('atlanta|'||regexp_replace(lower(e->>'name'),'[^a-z0-9]+',' ','g')||'|'||(e->>'date')||'|'||coalesce(e->>'time','unknown')||'|'||regexp_replace(lower(e->>'venue'),'[^a-z0-9]+',' ','g'));
    kind:=case when e->>'eventType' in ('concert','comedy','festival','play','musical','sports','special_event','activation','nightlife','brunch') then e->>'eventType' else 'special_event' end;
    state:=case when coalesce((e->>'cancelled')::boolean,false) then
      case when e#>>'{raw,eventStatus}' ilike '%postponed%' then 'postponed' else 'cancelled' end
      when coalesce((e->>'soldOut')::boolean,false) then 'sold_out' else 'confirmed' end;
    pub:=coalesce((e->>'publication')::boolean,false) and coalesce((e->>'verified')::boolean,false)
      and (e->>'date')::date>=(now() at time zone 'America/New_York')::date
      and gt_private.gt_time_key_v1(e->>'time') ~ '^[0-2][0-9]:[0-5][0-9]$'
      and coalesce(e->>'ticket','') like 'https://%' and coalesce(e->>'image','') like 'https://%'
      and state in ('confirmed','sold_out')
      and coalesce(e->>'name','') !~* '(season tickets|season pass|parking pass|parking only|premium season|fast lane|vip upgrade)';
    observed_at:=coalesce(nullif(e#>>'{raw,collected_at}','')::timestamptz,now());
    if not isfinite(observed_at) or observed_at>clock_timestamp()+interval '1 minute' or observed_at<now()-interval '24 hours' then raise exception 'invalid_observation_time'; end if;
    observed_facts:=coalesce(e#>'{raw,source_observation,facts}',jsonb_build_object(
      'eventStatus',nullif(e#>>'{raw,eventStatus}',''),'isAccessibleForFree',e#>'{raw,isAccessibleForFree}',
      'availability',e#>'{raw,availability}'));
    latest_raw:=coalesce(e->'raw','{}'::jsonb)||jsonb_build_object('source_observation',jsonb_build_object(
      'version',2,'observed_at',observed_at,'collector','official_priority_scout','facts',observed_facts));
    observed_state:=coalesce(gt_private.gt_source_show_facts_v1(jsonb_build_object('raw_data',latest_raw))->>'status','unknown');
    sid:=null; conflict:=false; new_show:=false; before_row:='{}'::jsonb; after_row:='{}'::jsonb;
    conflicts:='{}'::text[]; patch:='{}'::jsonb; owned:='{}'::jsonb;
    select * into prior_source from public.gt_sourced_events se where se.dedup_hash='priority:'||k for update;
    source_exists:=found;
    select * into link from gt_private.gt_source_show_links_v1 l where l.source_event_id=prior_source.id;
    -- A recorded source UUID relation has priority over legacy calendar evidence.
    sid:=link.show_id;
    if sid is null then select ev.show_id into sid from public.gt_atlanta_event_evidence_v1 ev where ev.occurrence_key=k; end if;
    if sid is not null then
      select to_jsonb(s) into before_row from public.gt_shows s where s.id=sid for update;
      if before_row is null or before_row->>'city_key'<>'atlanta'
        or (gt_private.gt_full_address_key_v1(before_row->>'venue_address') is not null
          and gt_private.gt_full_address_key_v1(e->>'address') is not null
          and gt_private.gt_full_address_key_v1(before_row->>'venue_address')<>gt_private.gt_full_address_key_v1(e->>'address')) then
        conflict:=true; sid:=null;
      end if;
    else
      select array_agg(s.id) into ids from public.gt_shows s
      where s.city_key='atlanta' and s.show_date=(e->>'date')::date
        and regexp_replace(lower(s.event_name),'[^a-z0-9]+',' ','g')=regexp_replace(lower(e->>'name'),'[^a-z0-9]+',' ','g')
        and regexp_replace(lower(s.venue_name),'[^a-z0-9]+',' ','g')=regexp_replace(lower(e->>'venue'),'[^a-z0-9]+',' ','g')
        and gt_private.gt_time_key_v1(s.show_time)=gt_private.gt_time_key_v1(e->>'time')
        and gt_private.gt_time_key_v1(e->>'time') ~ '^[0-2][0-9]:[0-5][0-9]$'
        and (gt_private.gt_full_address_key_v1(s.venue_address) is null or gt_private.gt_full_address_key_v1(e->>'address') is null
          or gt_private.gt_full_address_key_v1(s.venue_address)=gt_private.gt_full_address_key_v1(e->>'address'));
      if cardinality(ids)=1 then sid:=ids[1];
      elsif cardinality(ids)>1 then conflict:=true; end if;
      if sid is not null then select to_jsonb(s) into before_row from public.gt_shows s where s.id=sid for update; end if;
    end if;
    if conflict then pub:=false; ambiguous:=ambiguous+1; end if;
    venue_match:=gt_private.gt_resolve_venue_v1('atlanta',e->>'venue',e->>'address');
    venue:=(venue_match->>'venue_id')::uuid;
    -- Keep review controls and existing raw annotations on refresh. A failed or
    -- explicitly locked observation is retained separately, never promoted as fact.
    select coalesce(array_agg(distinct value),'{}'::text[]) into locked_fields from (
      select jsonb_array_elements_text(case when jsonb_typeof(prior_source.raw_data->'locked_fields')='array' then prior_source.raw_data->'locked_fields' else '[]'::jsonb end) as value
      union all select jsonb_array_elements_text(case when jsonb_typeof(prior_source.raw_data->'manual_fields')='array' then prior_source.raw_data->'manual_fields' else '[]'::jsonb end)
      union all select jsonb_array_elements_text(case when jsonb_typeof(prior_source.raw_data->'editorial_fields')='array' then prior_source.raw_data->'editorial_fields' else '[]'::jsonb end)
      union all select jsonb_object_keys(case when jsonb_typeof(prior_source.raw_data->'manual_overrides')='object' then prior_source.raw_data->'manual_overrides' else '{}'::jsonb end)
      union all select jsonb_object_keys(case when jsonb_typeof(prior_source.raw_data->'editorial_overrides')='object' then prior_source.raw_data->'editorial_overrides' else '{}'::jsonb end)
    ) locks;
    source_locked:=coalesce(prior_source.raw_data->'manual_lock'='true'::jsonb,false)
      or coalesce(prior_source.raw_data->'editorial_lock'='true'::jsonb,false);
    approved:=coalesce((e->>'verified')::boolean,false) and not conflict and not source_locked
      and (not source_exists or (prior_source.is_verified is true and prior_source.is_published is true
        and prior_source.legacy_quarantined_at is null and prior_source.legacy_quarantine_reason is null));
    latest_raw:=latest_raw||jsonb_build_object('priority_scout_occurrence',k,'publication_reason',e->>'publicationReason',
      'show_id',sid,'discovery_only',not pub,'identity_conflict',conflict);
    source_patch:=jsonb_build_object('event_time',e->>'time','end_date',e->>'endDate','end_time',e->>'endTime',
      'event_type',kind,'ticket_url',e->>'ticket','image_url',e->>'image','source_url',e->>'sourceUrl',
      'venue_name',e->>'venue','venue_address',e->>'address','timezone','America/New_York',
      'fact_verified_at',case when coalesce((e->>'verified')::boolean,false) then observed_at else null end,
      'valid_until',case when coalesce((e->>'verified')::boolean,false) then observed_at+interval '24 hours' else null end);
    if source_exists then
      if not approved then
        source_patch:=jsonb_build_object('raw_data',coalesce(prior_source.raw_data,'{}'::jsonb)
          ||jsonb_build_object('last_held_observation',latest_raw));
      else
        source_patch:=source_patch-locked_fields;
        -- Locks on optional typed facts also protect their raw-observation fallback.
        for item in select * from (values ('ticket_price_min','price_min'),('ticket_price_max','price_max'),
          ('currency','currency'),('price_basis','price_basis'),('free_status','isAccessibleForFree'),
          ('is_free','isAccessibleForFree'),('status','eventStatus'),('is_sold_out','availability')) as f(source_key,fact_key)
        loop
          if item.source_key=any(locked_fields) then
            latest_raw:=jsonb_set(latest_raw,array['source_observation','facts',item.fact_key],
              coalesce(prior_source.raw_data#>array['source_observation','facts',item.fact_key],'null'::jsonb),true);
          end if;
        end loop;
        source_patch:=source_patch||jsonb_build_object('raw_data',coalesce(prior_source.raw_data,'{}'::jsonb)||latest_raw);
      end if;
      select string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') into cols,selected_cols from jsonb_each(source_patch);
      execute format('update public.gt_sourced_events s set (%s)=(select %s from jsonb_populate_record(null::public.gt_sourced_events,$1) x),updated_at=$3 where id=$2 returning s.*',cols,selected_cols)
        into staged using source_patch,prior_source.id,observed_at;
    else
      insert into public.gt_sourced_events(city,event_name,event_date,event_time,end_date,end_time,venue_name,venue_address,
        event_type,ticket_url,image_url,source_id,source_url,source_name,is_verified,is_published,published_to_gt,dedup_hash,
        raw_data,updated_at,timezone,fact_verified_at,valid_until)
      values('atlanta',e->>'name',(e->>'date')::date,e->>'time',nullif(e->>'endDate','')::date,e->>'endTime',e->>'venue',e->>'address',kind,
        e->>'ticket',e->>'image',p_source,e->>'sourceUrl',src.source_name,coalesce((e->>'verified')::boolean,false),pub,false,'priority:'||k,
        latest_raw,observed_at,'America/New_York',
        case when coalesce((e->>'verified')::boolean,false) then observed_at else null end,
        case when coalesce((e->>'verified')::boolean,false) then observed_at+interval '24 hours' else null end)
      returning * into staged;
    end if;
    source_event:=staged.id;
    facts:=gt_private.gt_source_show_facts_v1(to_jsonb(staged));
    if venue is not null then facts:=facts||jsonb_build_object('venue_id',venue); end if;
    if sid is not null and approved then
      owned:=coalesce(link.applied_values,'{}'::jsonb); prior_owned:=owned;
      venue_changed:=(facts ? 'venue_name' and public.gt_normalize_venue_text(facts->>'venue_name') is distinct from public.gt_normalize_venue_text(before_row->>'venue_name'))
        or (facts ? 'venue_address' and gt_private.gt_address_key_v1(facts->>'venue_address') is distinct from gt_private.gt_address_key_v1(before_row->>'venue_address'));
      if venue_changed and venue is null then facts:=facts||jsonb_build_object('venue_id',null); end if;
      for item in select key,value from jsonb_each(facts) loop
        if item.value='null'::jsonb then
          if owned ? item.key and before_row->item.key=owned->item.key then
            if before_row->item.key is distinct from item.value then patch:=patch||jsonb_build_object(item.key,item.value); end if;
            owned:=owned||jsonb_build_object(item.key,item.value);
          elsif before_row->item.key is not null and before_row->item.key<>'null'::jsonb then conflicts:=array_append(conflicts,item.key); end if;
        elsif before_row->item.key=item.value then owned:=owned||jsonb_build_object(item.key,item.value);
        elsif before_row->item.key is null or before_row->item.key='null'::jsonb or before_row->>item.key='' then
          patch:=patch||jsonb_build_object(item.key,item.value); owned:=owned||jsonb_build_object(item.key,item.value);
        elsif item.key='status' and item.value#>>'{}' in ('cancelled','postponed','sold_out') and before_row->>'status' in ('confirmed','tentative') then
          patch:=patch||jsonb_build_object(item.key,item.value); owned:=owned||jsonb_build_object(item.key,item.value);
        elsif owned ? item.key and before_row->item.key=owned->item.key then
          patch:=patch||jsonb_build_object(item.key,item.value); owned:=owned||jsonb_build_object(item.key,item.value);
        else conflicts:=array_append(conflicts,item.key); end if;
      end loop;
      if venue_changed and conflicts && venue_fields then
        patch:=patch-venue_fields;
        foreach nullable_field in array venue_fields loop
          owned:=owned-nullable_field;
          if prior_owned ? nullable_field then owned:=owned||jsonb_build_object(nullable_field,prior_owned->nullable_field); end if;
        end loop;
        conflicts:=array_append(conflicts,'venue_change_requires_coherent_review');
      end if;
      if coalesce((before_row->>'is_curated')::boolean,false) or coalesce((before_row->>'is_featured')::boolean,false) then
        patch:=patch-'event_type'-'genre';
      end if;
      if patch='{}'::jsonb then after_row:=before_row;
      else
        prior_target:=current_setting('good_times.preserve_editorial_id',true);
        prior_fields:=current_setting('good_times.reviewed_patch_fields',true);
        prior_ranking:=current_setting('good_times.preserve_all_ranking',true);
        perform set_config('good_times.preserve_editorial_id',sid::text,true);
        perform set_config('good_times.reviewed_patch_fields','[]',true);
        perform set_config('good_times.preserve_all_ranking','false',true);
        select string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') into cols,selected_cols from jsonb_each(patch);
        execute format('update public.gt_shows s set (%s)=(select %s from jsonb_populate_record(null::public.gt_shows,$1) x),updated_at=$3 where id=$2 returning to_jsonb(s)',cols,selected_cols)
          into after_row using patch,sid,observed_at;
        perform set_config('good_times.preserve_editorial_id',coalesce(prior_target,''),true);
        perform set_config('good_times.reviewed_patch_fields',coalesce(prior_fields,''),true);
        perform set_config('good_times.preserve_all_ranking',coalesce(prior_ranking,''),true);
      end if;
    elsif sid is null and pub and approved then
      -- Only new approved intake uses confirmed as the legacy default. Unknown
      -- status never enters an existing-show patch and cannot resurrect it.
      facts:=facts||jsonb_build_object('status',coalesce(facts->>'status','confirmed'),
        'is_curated',false,'needs_image_sourcing',false,'curation_reason','Official-source candidate; final editorial gate applies');
      select string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') into cols,selected_cols from jsonb_each(facts);
      execute format('insert into public.gt_shows(city_key,%s) select $2,%s from jsonb_populate_record(null::public.gt_shows,$1) x returning to_jsonb(gt_shows)',cols,selected_cols)
        into after_row using facts,'atlanta';
      sid:=(after_row->>'id')::uuid; fresh_count:=fresh_count+1; new_show:=true; owned:=facts;
    else held:=held+1; after_row:=before_row; end if;
    if sid is not null and approved then
      insert into gt_private.gt_source_show_links_v1(source_event_id,show_id,identity_method,source_snapshot,applied_values,source_fingerprint,last_applied_at,metadata)
      values(source_event,sid,'official_priority_occurrence',facts,owned,md5(facts::text),now(),
        jsonb_build_object('venue_match',venue_match,'preserved_fields',conflicts))
      on conflict(source_event_id) do update set source_snapshot=excluded.source_snapshot,applied_values=excluded.applied_values,
        source_fingerprint=excluded.source_fingerprint,last_applied_at=excluded.last_applied_at,metadata=excluded.metadata;
      if exists(select 1 from gt_private.gt_source_show_links_v1 l where l.source_event_id=source_event and l.show_id<>sid) then
        raise exception 'priority_source_link_conflict';
      end if;
      update public.gt_sourced_events set published_to_gt=true,gt_page_id=sid::text,
        raw_data=coalesce(raw_data,'{}'::jsonb)||jsonb_build_object('show_id',sid) where id=source_event;
    end if;
    -- Eligible evidence must agree with the canonical state after guarded application.
    pub:=pub and approved and (sid is null or coalesce(after_row->>'status','unknown') in ('confirmed','tentative','sold_out'));
    insert into public.gt_atlanta_event_evidence_v1(occurrence_key,show_id,source_id,source_url,event_date,event_time,venue_name,
      verified_at,eligible,reason,market_scope,event_status,facts)
    values(k,sid,p_source,e->>'sourceUrl',(e->>'date')::date,e->>'time',e->>'venue',observed_at,pub,
      case when conflict then 'ambiguous_existing_occurrence' when coalesce(e->>'name','')~*'(season tickets|season pass|parking pass|parking only|premium season|fast lane|vip upgrade)'
        then 'ticket_add_on_or_season_product_not_event' else coalesce(e->>'publicationReason','review') end,
      coalesce(e#>>'{raw,scope}','atlanta'),observed_state,jsonb_build_object('name',e->>'name','locality',e->>'locality','ticket',e->>'ticket',
        'image',e->>'image','performer',e->>'performer','priority',src.priority,'source_name',src.source_name,'parser','priority-scout-v1'))
    on conflict(occurrence_key) do update set show_id=coalesce(excluded.show_id,gt_atlanta_event_evidence_v1.show_id),
      source_id=excluded.source_id,source_url=excluded.source_url,verified_at=excluded.verified_at,eligible=excluded.eligible,
      reason=excluded.reason,event_status=excluded.event_status,facts=excluded.facts;
    select coalesce(array_agg(key order by key),'{}'::text[]) into fields from jsonb_each(after_row)
      where value is distinct from before_row->key and key not in ('updated_at','fact_verified_at','valid_until','freshness_tier');
    outcome:=case when sid is null or not approved then 'held' when new_show then 'inserted' when cardinality(fields)=0 then 'unchanged' else 'updated' end;
    insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,record_id,source_event_id,actor,outcome,reason,
      input_hash,changed_fields,before_values,after_values,evidence)
    values(batch,k,'event',sid,source_event,'OFFICIAL_PRIORITY_SCOUT',outcome,
      case when conflict then 'ambiguous_existing_occurrence' when not approved then 'existing_review_controls_or_unverified_observation'
        when cardinality(conflicts)>0 then 'existing_values_preserved_for_review' else coalesce(e->>'publicationReason','review') end,
      md5(e::text),fields,before_row,after_row,jsonb_build_object('source_url',e->>'sourceUrl','observed_at',observed_at,'venue_match',venue_match))
    on conflict(batch_id,row_key) do nothing;
    n:=n+1;
  end loop;
  return jsonb_build_object('occurrences_processed',n,'new_show_candidates',fresh_count,'held_out_of_show_inventory',held,
    'ambiguous_occurrences',ambiguous,'receipt_batch_id',batch,'scope','Atlanta evidence intake; not homepage certification');
end; $$;
revoke all on function public.gt_ingest_priority_events_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.gt_ingest_priority_events_v1(uuid,jsonb) to service_role,postgres;

commit;
