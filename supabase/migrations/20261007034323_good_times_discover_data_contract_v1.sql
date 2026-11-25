begin;

-- GOOD TIMES only. Additive contract; canonical venue/show IDs remain unchanged.
-- A source observation, an editorial approval and a published fact are distinct.
alter table public.gt_shows
  add column if not exists end_date date,
  add column if not exists end_time text,
  add column if not exists timezone text,
  add column if not exists provider_occurrence_id text,
  add column if not exists admission_type text,
  add column if not exists currency text,
  add column if not exists price_basis text,
  add column if not exists free_status text,
  add column if not exists fact_verified_at timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists age_requirement_verified_at timestamptz;
alter table public.gt_shows alter column age_requirement drop default;

alter table public.gt_sourced_events
  add column if not exists doors_time text,
  add column if not exists timezone text,
  add column if not exists provider_occurrence_id text,
  add column if not exists admission_type text,
  add column if not exists ticket_price_min numeric,
  add column if not exists ticket_price_max numeric,
  add column if not exists currency text,
  add column if not exists price_basis text,
  add column if not exists free_status text,
  add column if not exists fact_verified_at timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists age_requirement text,
  add column if not exists age_requirement_verified_at timestamptz;

alter table public.gt_venues
  add column if not exists entity_kind text,
  add column if not exists parent_entity_id uuid references public.gt_venues(id),
  add column if not exists municipality text,
  add column if not exists timezone text;
create index if not exists gt_venues_parent_entity_id_idx on public.gt_venues(parent_entity_id) where parent_entity_id is not null;

alter table public.gt_shows add constraint gt_shows_free_status_v1_check
  check (free_status is null or free_status in ('verified_free','verified_paid','conditional_free','unknown')) not valid;
alter table public.gt_sourced_events add constraint gt_sourced_events_free_status_v1_check
  check (free_status is null or free_status in ('verified_free','verified_paid','conditional_free','unknown')) not valid;
alter table public.gt_shows validate constraint gt_shows_free_status_v1_check;
alter table public.gt_sourced_events validate constraint gt_sourced_events_free_status_v1_check;

create schema if not exists gt_private;
revoke all on schema gt_private from public,anon,authenticated;
grant usage on schema gt_private to service_role,postgres;

create table gt_private.gt_source_show_links_v1 (
  source_event_id uuid primary key references public.gt_sourced_events(id),
  show_id uuid not null references public.gt_shows(id),
  identity_method text not null,
  source_snapshot jsonb not null default '{}'::jsonb,
  applied_values jsonb not null default '{}'::jsonb,
  source_fingerprint text,
  linked_at timestamptz not null default now(),
  last_applied_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index gt_source_show_links_v1_show_idx on gt_private.gt_source_show_links_v1(show_id);
alter table gt_private.gt_source_show_links_v1 enable row level security;
revoke all on gt_private.gt_source_show_links_v1 from public,anon,authenticated;
grant select,insert,update on gt_private.gt_source_show_links_v1 to service_role,postgres;

create table gt_private.gt_backend_change_receipts_v1 (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  row_key text not null,
  record_type text not null,
  record_id uuid,
  source_event_id uuid references public.gt_sourced_events(id),
  actor text not null,
  outcome text not null check (outcome in ('inserted','updated','linked','unchanged','held','excluded')),
  reason text,
  input_hash text not null,
  changed_fields text[] not null default '{}'::text[],
  before_values jsonb not null default '{}'::jsonb,
  after_values jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  unique(batch_id,row_key)
);
create index gt_backend_receipts_source_idx on gt_private.gt_backend_change_receipts_v1(source_event_id,recorded_at desc) where source_event_id is not null;
create index gt_backend_receipts_record_idx on gt_private.gt_backend_change_receipts_v1(record_type,record_id,recorded_at desc);
alter table gt_private.gt_backend_change_receipts_v1 enable row level security;
revoke all on gt_private.gt_backend_change_receipts_v1 from public,anon,authenticated;
grant select,insert on gt_private.gt_backend_change_receipts_v1 to service_role,postgres;

create or replace function gt_private.gt_time_key_v1(p_time text)
returns text language plpgsql immutable set search_path=pg_catalog as $$
declare value text:=lower(btrim(coalesce(p_time,''))); parts text[]; hour integer;
begin
  if value='' then return 'time_unknown'; end if;
  if value ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then
    return lpad(split_part(value,':',1),2,'0')||':'||split_part(value,':',2);
  end if;
  parts:=regexp_match(value,'^(0?[1-9]|1[0-2])(:([0-5][0-9]))?[[:space:]]*([ap]m)$');
  if parts is not null then
    hour:=(parts[1]::integer%12)+case when parts[4]='pm' then 12 else 0 end;
    return lpad(hour::text,2,'0')||':'||coalesce(parts[3],'00');
  end if;
  return 'unparsed:'||value;
end; $$;

create or replace function gt_private.gt_provider_host_v1(p_url text)
returns text language sql immutable set search_path=pg_catalog as $$
  select lower((regexp_match(btrim(coalesce(p_url,'')),'^https?://(?:www\.)?([^/:?#@]+)(?:[/:?#]|$)','i'))[1]);
$$;

CREATE OR REPLACE FUNCTION gt_private.gt_address_key_v1(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
DECLARE
  v text := lower(coalesce(p_value, ''));
BEGIN
  v := replace(replace(replace(v, '&nbsp;', ' '), '&#160;', ' '), '&amp;', ' and ');
  v := regexp_replace(v, '#\s*(?=(ste|suite|unit)\M)', '', 'g');
  v := replace(v, '#', ' unit ');
  v := trim(regexp_replace(v, '[^a-z0-9]+', ' ', 'g'));
  v := regexp_replace(v, '\mnorth\s+east\M', 'ne', 'g');
  v := regexp_replace(v, '\mnorth\s+west\M', 'nw', 'g');
  v := regexp_replace(v, '\msouth\s+east\M', 'se', 'g');
  v := regexp_replace(v, '\msouth\s+west\M', 'sw', 'g');
  SELECT string_agg(CASE token
      WHEN 'street' THEN 'st' WHEN 'avenue' THEN 'ave' WHEN 'road' THEN 'rd'
      WHEN 'boulevard' THEN 'blvd' WHEN 'drive' THEN 'dr' WHEN 'lane' THEN 'ln'
      WHEN 'court' THEN 'ct' WHEN 'terrace' THEN 'ter' WHEN 'circle' THEN 'cir'
      WHEN 'parkway' THEN 'pkwy' WHEN 'place' THEN 'pl' WHEN 'highway' THEN 'hwy'
      WHEN 'northeast' THEN 'ne' WHEN 'northwest' THEN 'nw'
      WHEN 'southeast' THEN 'se' WHEN 'southwest' THEN 'sw'
      WHEN 'north' THEN 'n' WHEN 'south' THEN 's' WHEN 'east' THEN 'e' WHEN 'west' THEN 'w'
      WHEN 'georgia' THEN 'ga'
      WHEN 'suite' THEN 'unit' WHEN 'ste' THEN 'unit' WHEN 'unit' THEN 'unit'
      WHEN 'apartment' THEN 'apt' WHEN 'floor' THEN 'floor' WHEN 'fl' THEN 'floor'
      ELSE token END, ' ' ORDER BY ordinal)
    INTO v FROM unnest(string_to_array(v, ' ')) WITH ORDINALITY AS t(token, ordinal);
  v := trim(regexp_replace(coalesce(v, ''), ' (united states of america|united states|usa|us)$', ''));
  RETURN nullif(v, '');
END;
$function$;

CREATE OR REPLACE FUNCTION gt_private.gt_full_address_key_v1(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT CASE WHEN k ~ '^[0-9]+[a-z]? '
    AND k ~ ' (atlanta|decatur|college park|e point|sandy springs|brookhaven|chamblee|duluth|norcross|smyrna|marietta|alpharetta) ga [0-9]{5}( [0-9]{4})?$'
    THEN k ELSE NULL END
  FROM (SELECT gt_private.gt_address_key_v1(p_value) AS k) AS n;
$function$;

-- A complete approved-market locality and ZIP are required for automatic address links.
-- Include every venue UUID, including inactive rows, when checking ambiguity.
create index if not exists gt_venues_full_address_v1_idx
  on public.gt_venues(city_key,gt_private.gt_full_address_key_v1(address));

create or replace function gt_private.gt_resolve_venue_v1(p_city text,p_name text,p_address text)
returns jsonb language plpgsql stable set search_path=pg_catalog,public,gt_private as $$
declare ids uuid[]; eligible uuid; method text; address_key text:=gt_private.gt_address_key_v1(p_address);
begin
  select array_agg(distinct a.venue_id) into ids
  from public.gt_venue_aliases a join public.gt_venues v on v.id=a.venue_id
  where a.city_key=p_city and v.city_key=p_city and a.status='active'
    and a.match_method='reviewed_alias' and a.confidence=100 and a.evidence<>'{}'::jsonb
    and a.normalized_alias_name=public.gt_normalize_venue_text(p_name)
    and (address_key is null
      or (nullif(btrim(a.alias_address),'') is not null and address_key=gt_private.gt_address_key_v1(a.alias_address))
      or (nullif(btrim(a.alias_address),'') is null and gt_private.gt_full_address_key_v1(p_address)=gt_private.gt_full_address_key_v1(v.address)));
  if cardinality(ids)>1 then return jsonb_build_object('reason','ambiguous_reviewed_alias'); end if;
  if cardinality(ids)=1 then method:='reviewed_alias';
  else
    address_key:=gt_private.gt_full_address_key_v1(p_address);
    if address_key is null then
      return jsonb_build_object('reason','full_address_or_reviewed_alias_required');
    end if;
    select array_agg(distinct v.id) into ids from public.gt_venues v
    where v.city_key=p_city and gt_private.gt_full_address_key_v1(v.address)=address_key;
    if cardinality(ids) is distinct from 1 then
      return jsonb_build_object('reason',case when cardinality(ids)>1 then 'ambiguous_full_address' else 'no_full_address_match' end);
    end if;
    method:='unique_full_address';
  end if;
  select v.id into eligible from public.gt_venues v where v.id=ids[1]
    and v.status='active' and v.is_verified=true and v.verification_status='verified_current'
    and v.freshness_expires_at>now();
  if eligible is null then return jsonb_build_object('reason','matched_venue_requires_reverification','candidate_id',ids[1]); end if;
  return jsonb_build_object('venue_id',eligible,'method',method);
end; $$;

create or replace function gt_private.gt_source_show_facts_v1(p_source jsonb)
returns jsonb language plpgsql stable set search_path=pg_catalog,public,gt_private as $$
declare result jsonb; kind text; admission text; state text; raw jsonb:=coalesce(p_source->'raw_data','{}'::jsonb);
  observed jsonb; status_text text; availability text; free_value jsonb; nullable_field record;
  observation_v2 boolean:=false; price_min jsonb; price_max jsonb; price_currency text; basis text;
begin
  kind:=case lower(coalesce(p_source->>'event_type',''))
    when 'concert' then 'concert' when 'live_music' then 'concert' when 'music' then 'concert'
    when 'comedy' then 'comedy' when 'festival' then 'festival' when 'food_festival' then 'festival' when 'food' then 'festival'
    when 'play' then 'play' when 'theater' then 'play' when 'theatre' then 'play' when 'musical' then 'musical'
    when 'sports' then 'sports' when 'sport' then 'sports'
    when 'nightlife' then 'nightlife' when 'party' then 'nightlife' when 'day_party' then 'nightlife'
    when 'dj_night' then 'nightlife' when 'pool_party' then 'nightlife' when 'brunch' then 'brunch'
    when 'activation' then 'activation' else 'special_event' end;
  if raw#>>'{source_observation,version}'='2' and jsonb_typeof(raw#>'{source_observation,facts}')='object' then
    observation_v2:=true;
    observed:=raw#>'{source_observation,facts}';
    status_text:=observed->>'eventStatus'; availability:=observed->>'availability';
    free_value:=observed->'isAccessibleForFree';
  elsif raw#>>'{occurrence_identity,version}'='2' and jsonb_typeof(raw->'jsonld')='object'
      and raw->>'collected_via' in ('eventbrite_public_jsonld_v4','direct_jsonld_v2') then
    observed:=raw->'jsonld'; status_text:=observed->>'eventStatus'; free_value:=observed->'isAccessibleForFree';
    availability:=coalesce(observed#>>'{offers,availability}',observed#>>'{offers,0,availability}');
  else
    status_text:=coalesce(raw->>'eventStatus',raw#>>'{jsonld,eventStatus}',raw->>'event_status');
    availability:=coalesce(raw#>>'{offers,availability}',raw#>>'{jsonld,offers,availability}',raw#>>'{jsonld,offers,0,availability}');
    free_value:=coalesce(nullif(raw->'isAccessibleForFree','null'::jsonb),raw#>'{jsonld,isAccessibleForFree}');
  end if;
  admission:=case when p_source->>'free_status' in ('verified_free','verified_paid','conditional_free','unknown') then p_source->>'free_status'
    when jsonb_typeof(free_value)='boolean' then case when (free_value#>>'{}')::boolean then 'verified_free' else 'verified_paid' end
    else null end;
  state:=case when status_text ilike '%postponed%' then 'postponed'
    when status_text ilike '%cancel%' then 'cancelled'
    when status_text ilike '%soldout%' or availability ilike '%soldout%' then 'sold_out'
    when status_text ~* '(scheduled|confirmed)' then 'confirmed' else null end;
  -- Explicit reviewed typed values take precedence; otherwise use only the latest
  -- v2 observation. Legacy zero/default price values never prove free admission.
  price_min:=coalesce(nullif(p_source->'ticket_price_min','null'::jsonb),case when observation_v2 then observed->'price_min' end);
  price_max:=coalesce(nullif(p_source->'ticket_price_max','null'::jsonb),case when observation_v2 then observed->'price_max' end);
  price_currency:=upper(coalesce(nullif(btrim(p_source->>'currency'),''),case when observation_v2 then nullif(btrim(observed->>'currency'),'') end));
  basis:=coalesce(nullif(btrim(p_source->>'price_basis'),''),case when observation_v2 then nullif(btrim(observed->>'price_basis'),'') end);
  if jsonb_typeof(price_min) is distinct from 'number' then price_min:=null;
  elsif (price_min#>>'{}')::numeric<0 then price_min:=null; end if;
  if jsonb_typeof(price_max) is distinct from 'number' then price_max:=null;
  elsif (price_max#>>'{}')::numeric<0 then price_max:=null; end if;
  if price_currency is null or price_currency !~ '^[A-Z]{3}$' then
    price_currency:=null; price_min:=null; price_max:=null;
  elsif price_min is not null and price_max is not null and (price_max#>>'{}')::numeric<(price_min#>>'{}')::numeric then
    price_min:=null; price_max:=null;
  end if;
  result:=jsonb_strip_nulls(jsonb_build_object(
    'event_name',nullif(btrim(p_source->>'event_name'),''),'show_date',nullif(p_source->>'event_date',''),
    'show_time',nullif(btrim(p_source->>'event_time'),''),'doors_time',nullif(btrim(p_source->>'doors_time'),''),
    'event_type',kind,'genre',nullif(btrim(p_source->>'event_category'),''),
    'venue_name',nullif(btrim(p_source->>'venue_name'),''),'venue_address',nullif(btrim(p_source->>'venue_address'),''),
    'ticket_url',nullif(btrim(p_source->>'ticket_url'),''),'image_url',nullif(btrim(p_source->>'image_url'),''),
    'description',nullif(btrim(p_source->>'description'),''),'organizer',nullif(btrim(p_source->>'organizer'),''),
    'source',nullif(btrim(p_source->>'source_name'),''),'source_url',nullif(btrim(p_source->>'source_url'),''),
    'end_date',nullif(p_source->>'end_date',''),'end_time',nullif(btrim(p_source->>'end_time'),''),
    'timezone',case when public.gt_city_normalize(p_source->>'city')='atlanta' then 'America/New_York' else nullif(p_source->>'timezone','') end,
    'provider_occurrence_id',coalesce(nullif(p_source->>'provider_occurrence_id',''),nullif(raw#>>'{occurrence_identity,provider_occurrence_id}','')),
    'admission_type',nullif(p_source->>'admission_type',''),'currency',price_currency,'price_basis',basis,
    'ticket_price_min',price_min,'ticket_price_max',price_max,'free_status',admission,
    'is_free',case admission when 'verified_free' then true when 'verified_paid' then false else null end,
    'age_requirement',case when nullif(p_source->>'age_requirement_verified_at','') is not null then nullif(p_source->>'age_requirement','') else null end,
    'age_requirement_verified_at',p_source->'age_requirement_verified_at',
    'fact_verified_at',p_source->'fact_verified_at','valid_until',p_source->'valid_until',
    'status',state,'is_sold_out',case state when 'sold_out' then true when 'confirmed' then false else null end));
  -- Typed source rows retain omitted columns on collector updates. Explicit nulls
  -- withdraw source-owned optional facts; required identity and unknown status stay absent.
  for nullable_field in select key,value from jsonb_each_text('{
    "show_time":"event_time","doors_time":"doors_time","end_date":"end_date","end_time":"end_time",
    "image_url":"image_url","ticket_url":"ticket_url",
    "admission_type":"admission_type",
    "fact_verified_at":"fact_verified_at","valid_until":"valid_until"
  }'::jsonb) loop
    if p_source ? nullable_field.value and nullif(btrim(p_source->>nullable_field.value),'') is null then
      result:=result||jsonb_build_object(nullable_field.key,null);
    end if;
  end loop;
  if observation_v2 or p_source ? 'ticket_price_min' or p_source ? 'ticket_price_max' or p_source ? 'currency' then
    result:=result||jsonb_build_object('ticket_price_min',price_min,'ticket_price_max',price_max,'currency',price_currency,'price_basis',basis);
  end if;
  if admission is null and p_source ? 'free_status' then result:=result||jsonb_build_object('free_status',null,'is_free',null); end if;
  -- Preserve the source's raw end fields in staging, but do not expose a non-positive duration as a known end.
  if result ? 'end_date' and result ? 'show_date' and ((result->>'end_date')::date<(result->>'show_date')::date
    or ((result->>'end_date')=(result->>'show_date') and result ? 'end_time' and result ? 'show_time'
      and gt_private.gt_time_key_v1(result->>'end_time') ~ '^[0-2][0-9]:[0-5][0-9]$'
      and gt_private.gt_time_key_v1(result->>'show_time') ~ '^[0-2][0-9]:[0-5][0-9]$'
      and gt_private.gt_time_key_v1(result->>'end_time')<=gt_private.gt_time_key_v1(result->>'show_time'))) then
    result:=result||jsonb_build_object('end_date',null,'end_time',null);
  end if;
  return result;
end; $$;

create or replace function gt_private.gt_queue_changed_source_v1()
returns trigger language plpgsql set search_path=pg_catalog,public,gt_private as $$
begin
  if public.gt_city_normalize(new.city)='atlanta'
    and (gt_private.gt_source_show_facts_v1(to_jsonb(new))-array['fact_verified_at','valid_until'])
      is distinct from (gt_private.gt_source_show_facts_v1(to_jsonb(old))-array['fact_verified_at','valid_until']) then
    new.published_to_gt:=false;
  end if;
  return new;
end; $$;
create trigger zzz_gt_queue_changed_source_v1 before update on public.gt_sourced_events
for each row execute function gt_private.gt_queue_changed_source_v1();

-- Bootstrap only a single exact city/date/title/time/venue occurrence. No show is changed here.
with candidates as (
  select se.id as source_event_id,s.id as show_id,
    gt_private.gt_source_show_facts_v1(to_jsonb(se)) as facts,
    to_jsonb(s) as existing,
    count(*) over(partition by se.id) as matches
  from public.gt_sourced_events se join public.gt_shows s
    on s.city_key=public.gt_city_normalize(se.city) and (
      (s.provider_occurrence_id is not null
        and s.provider_occurrence_id=coalesce(se.provider_occurrence_id,se.raw_data#>>'{occurrence_identity,provider_occurrence_id}')
        and gt_private.gt_provider_host_v1(s.source_url)=gt_private.gt_provider_host_v1(se.source_url))
      or (s.show_date=se.event_date
    and public.gt_normalize_venue_text(s.event_name)=public.gt_normalize_venue_text(se.event_name)
    and gt_private.gt_time_key_v1(s.show_time)=gt_private.gt_time_key_v1(se.event_time)
    and (gt_private.gt_time_key_v1(se.event_time) ~ '^[0-2][0-9]:[0-5][0-9]$'
      or exists(select 1 from public.gt_atlanta_event_evidence_v1 ev where ev.show_id=s.id and ev.occurrence_key=se.raw_data->>'priority_scout_occurrence'))
    and public.gt_normalize_venue_text(s.venue_name)=public.gt_normalize_venue_text(se.venue_name)
    and (nullif(btrim(s.venue_address),'') is null or nullif(btrim(se.venue_address),'') is null
      or gt_private.gt_address_key_v1(s.venue_address)=gt_private.gt_address_key_v1(se.venue_address))
    and (coalesce(se.provider_occurrence_id,se.raw_data#>>'{occurrence_identity,provider_occurrence_id}') is null
      or s.provider_occurrence_id is null
      or (s.provider_occurrence_id=coalesce(se.provider_occurrence_id,se.raw_data#>>'{occurrence_identity,provider_occurrence_id}')
        and gt_private.gt_provider_host_v1(s.source_url)=gt_private.gt_provider_host_v1(se.source_url)))))
  where s.city_key='atlanta' and se.event_date>=(now() at time zone 'America/New_York')::date
    and se.is_verified=true and se.is_published=true and se.legacy_quarantined_at is null and se.legacy_quarantine_reason is null
)
insert into gt_private.gt_source_show_links_v1(source_event_id,show_id,identity_method,source_snapshot,applied_values,source_fingerprint,metadata)
select source_event_id,show_id,'exact_legacy_occurrence',facts,
  coalesce((select jsonb_object_agg(key,value) from jsonb_each(facts) where existing->key=value),'{}'::jsonb),
  md5(facts::text),jsonb_build_object('bootstrap','identity_only_no_catalog_changes')
from candidates where matches=1 on conflict(source_event_id) do nothing;

-- Install the final editorial guard before changing any publisher, so scheduled
-- calls are safe between this migration and the reviewed-sheet RPC migration.

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


-- Preserve non-Atlanta behavior behind an explicit-city-only private entrypoint.
CREATE OR REPLACE FUNCTION gt_private.gt_promote_legacy_non_atlanta_v1(p_city_filter text DEFAULT NULL::text, p_dry_run boolean DEFAULT false, p_limit integer DEFAULT 500)
 RETURNS TABLE(promoted_count integer, matched_venue_count integer, unmatched_venue_count integer, skipped_noise_count integer, skipped_city_count integer, cities_touched text[])
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_promoted integer:=0;
  v_matched integer:=0;
  v_unmatched integer:=0;
  v_skipped_noise integer:=0;
  v_skipped_city integer:=0;
  v_cities text[]:=array[]::text[];
begin
  if p_city_filter is null or public.gt_city_normalize(p_city_filter)='atlanta' then
    raise exception 'explicit_non_atlanta_city_required';
  end if;
  drop table if exists pg_temp.gt_promotion_batch;
  create temporary table gt_promotion_batch on commit drop as
  select
    se.id,se.event_name,se.event_date,se.event_time,se.venue_name,se.venue_address,
    se.city,se.event_type,se.event_category,se.description,se.ticket_url,se.image_url,
    se.source_name,se.source_url,se.organizer,se.created_at,
    public.gt_city_normalize(se.city) as canonical_city,
    (
      lower(coalesce(se.event_name,'')) ~ '(webinar|virtual event|online event|zoom event|mlm|pyramid scheme|timeshare presentation|make money fast)'
      or lower(coalesce(se.description,'')) ~ '(virtual-only|online-only|zoom webinar|pyramid scheme|multi-level marketing opportunity|timeshare presentation)'
    ) as is_noise,
    case lower(trim(coalesce(nullif(se.event_type,''),nullif(se.event_category,''),'special_event')))
      when 'concert' then 'concert'
      when 'live_music' then 'concert'
      when 'music' then 'concert'
      when 'comedy' then 'comedy'
      when 'festival' then 'festival'
      when 'food_festival' then 'festival'
      when 'food' then 'festival'
      when 'play' then 'play'
      when 'theater' then 'play'
      when 'theatre' then 'play'
      when 'musical' then 'musical'
      when 'sports' then 'sports'
      when 'sport' then 'sports'
      when 'nightlife' then 'nightlife'
      when 'party' then 'nightlife'
      when 'day_party' then 'nightlife'
      when 'dj_night' then 'nightlife'
      when 'pool_party' then 'nightlife'
      when 'brunch' then 'brunch'
      when 'activation' then 'activation'
      when 'career_fair' then 'career_fair'
      when 'networking' then 'networking'
      when 'workshop' then 'workshop'
      when 'class' then 'class'
      else 'special_event'
    end as canonical_event_type
  from public.gt_sourced_events se
  where se.event_date >= (now() at time zone 'America/New_York')::date
    and coalesce(se.published_to_gt,false)=false
    and coalesce(se.is_verified,false)=true
    and coalesce(se.is_published,false)=true
    and se.legacy_quarantined_at is null
    and se.legacy_quarantine_reason is null
    and nullif(trim(se.event_name),'') is not null
    and (
      p_city_filter is null
      or public.gt_city_normalize(se.city)=public.gt_city_normalize(p_city_filter)
    )
  order by se.event_date,se.event_time nulls last,se.created_at
  limit least(greatest(coalesce(p_limit,500),1),5000);

  create index on gt_promotion_batch(id);
  create index on gt_promotion_batch(canonical_city,event_date,lower(event_name));

  select count(*)::integer into v_skipped_noise
  from gt_promotion_batch where is_noise;

  select count(*)::integer into v_skipped_city
  from gt_promotion_batch
  where not is_noise
    and canonical_city not in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  if p_dry_run then
    select count(*)::integer into v_promoted
    from (
      select distinct on (b.canonical_city,b.event_date,lower(b.event_name)) b.*
      from gt_promotion_batch b
      where not b.is_noise
        and b.canonical_city in (
          'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
          'washington_dc','phoenix','scottsdale','las_vegas'
        )
      order by b.canonical_city,b.event_date,lower(b.event_name),b.created_at
    ) b
    where not exists(
      select 1 from public.gt_shows s
      where s.city_key=b.canonical_city and s.show_date=b.event_date
        and lower(s.event_name)=lower(b.event_name)
    );

    return query select v_promoted,0,0,v_skipped_noise,v_skipped_city,array[]::text[];
    return;
  end if;

  select count(*)::integer into v_matched
  from gt_promotion_batch b
  where not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    )
    and (
      exists(
        select 1 from public.gt_venue_aliases a
        where a.city_key=b.canonical_city and a.status='active'
          and a.normalized_alias_name=public.gt_normalize_venue_text(b.venue_name)
          and (
            coalesce(a.normalized_alias_address,'')=''
            or coalesce(public.gt_normalize_venue_text(b.venue_address),'')=''
            or a.normalized_alias_address=public.gt_normalize_venue_text(b.venue_address)
          )
      )
      or exists(
        select 1 from public.gt_venues v
        where v.city_key=b.canonical_city and v.status='active'
          and public.gt_normalize_venue_text(v.name)=public.gt_normalize_venue_text(b.venue_name)
      )
    );

  select count(*)::integer-v_matched into v_unmatched
  from gt_promotion_batch b
  where not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  with candidates as (
    select distinct on (b.canonical_city,b.event_date,lower(b.event_name))
      b.*
    from gt_promotion_batch b
    where not b.is_noise
      and b.canonical_city in (
        'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
        'washington_dc','phoenix','scottsdale','las_vegas'
      )
    order by b.canonical_city,b.event_date,lower(b.event_name),b.created_at
  ), inserted as (
    insert into public.gt_shows(
      city_key,show_date,show_time,event_name,event_type,venue_name,venue_address,
      ticket_url,image_url,description,organizer,source,source_url,status,
      needs_image_sourcing,freshness_tier,is_curated,created_at,updated_at
    )
    select
      c.canonical_city,c.event_date,c.event_time,c.event_name,c.canonical_event_type,
      c.venue_name,c.venue_address,c.ticket_url,c.image_url,c.description,c.organizer,
      coalesce(c.source_name,'good_times_scout'),c.source_url,'confirmed',
      (c.image_url is null or c.image_url=''),'fresh',false,now(),now()
    from candidates c
    where not exists(
      select 1 from public.gt_shows s
      where s.city_key=c.canonical_city and s.show_date=c.event_date
        and lower(s.event_name)=lower(c.event_name)
    )
    returning city_key
  )
  select count(*)::integer,coalesce(array_agg(distinct city_key),'{}'::text[])
  into v_promoted,v_cities
  from inserted;

  update public.gt_sourced_events se
  set published_to_gt=true,
      is_published=true,
      updated_at=now(),
      raw_data=coalesce(se.raw_data,'{}'::jsonb)||jsonb_build_object(
        'promotion',jsonb_build_object('processed_at',now(),'publisher','set_based_v2')
      )
  from gt_promotion_batch b
  where se.id=b.id
    and not b.is_noise
    and b.canonical_city in (
      'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
      'washington_dc','phoenix','scottsdale','las_vegas'
    );

  update public.gt_sourced_events se
  set published_to_gt=true,
      updated_at=now(),
      raw_data=coalesce(se.raw_data,'{}'::jsonb)||jsonb_build_object(
        'promotion_exclusion',jsonb_build_object(
          'reason',case when b.is_noise then 'actual_noise_or_virtual' else 'unsupported_city' end,
          'processed_at',now()
        )
      )
  from gt_promotion_batch b
  where se.id=b.id
    and (
      b.is_noise
      or b.canonical_city not in (
        'atlanta','houston','miami','new_york','los_angeles','charlotte','dallas',
        'washington_dc','phoenix','scottsdale','las_vegas'
      )
    );

  return query
  select v_promoted,v_matched,greatest(v_unmatched,0),v_skipped_noise,v_skipped_city,v_cities;
end;
$function$
;

create or replace function public.gt_promote_sourced_to_shows_internal(
  p_city_filter text default null,p_dry_run boolean default false,p_limit integer default 500)
returns table(promoted_count integer,matched_venue_count integer,unmatched_venue_count integer,
  skipped_noise_count integer,skipped_city_count integer,cities_touched text[])
language plpgsql set search_path=pg_catalog,public,gt_private as $$
declare
  r public.gt_sourced_events%rowtype; s public.gt_shows%rowtype; link gt_private.gt_source_show_links_v1%rowtype;
  facts jsonb; before_row jsonb; after_row jsonb; patch jsonb; owned jsonb; match jsonb; conflicts text[]; keys text[];
  item record; ids uuid[]; sid uuid; venue uuid; canonical_city text; input_hash text; outcome text; reason text; method text;
  cols text; selected_cols text; batch text; receipt uuid; inserted boolean; prior_guard text; prior_fields text; prior_ranking text;
  native_id text; native_host text; venue_changed boolean; venue_fields text[]:=array['venue_name','venue_address','venue_id'];
  prior_owned jsonb; city_batch record; city_result record;
  promoted integer:=0; matched integer:=0; unmatched integer:=0; noise integer:=0; unsupported integer:=0; cities text[]:='{}'::text[];
begin
  if not pg_try_advisory_xact_lock(hashtext('gt_serial_promotion')) then
    return query select 0,0,0,0,0,array[]::text[]; return;
  end if;
  if p_city_filter is null then
    for city_batch in
      with eligible as (
        select public.gt_city_normalize(se.city) as city_key,
          row_number() over(order by se.event_date,se.event_time nulls last,se.created_at,se.id) as position
        from public.gt_sourced_events se
        where se.event_date>=(now() at time zone 'America/New_York')::date
          and coalesce(se.published_to_gt,false)=false and coalesce(se.is_verified,false)=true and coalesce(se.is_published,false)=true
          and se.legacy_quarantined_at is null and se.legacy_quarantine_reason is null and nullif(trim(se.event_name),'') is not null
          and (public.gt_city_normalize(se.city)<>'atlanta' or not exists(
            select 1 from gt_private.gt_backend_change_receipts_v1 q where q.source_event_id=se.id
              and q.outcome in ('held','excluded') and q.input_hash=md5(gt_private.gt_source_show_facts_v1(to_jsonb(se))::text)))
        order by se.event_date,se.event_time nulls last,se.created_at,se.id
        limit least(greatest(coalesce(p_limit,25),1),100)
      ) select city_key,count(*)::integer as slots,min(position) as position from eligible group by city_key order by min(position)
    loop
      select * into city_result from public.gt_promote_sourced_to_shows_internal(city_batch.city_key,p_dry_run,city_batch.slots);
      promoted:=promoted+coalesce(city_result.promoted_count,0); matched:=matched+coalesce(city_result.matched_venue_count,0);
      unmatched:=unmatched+coalesce(city_result.unmatched_venue_count,0); noise:=noise+coalesce(city_result.skipped_noise_count,0);
      unsupported:=unsupported+coalesce(city_result.skipped_city_count,0);
      cities:=array(select distinct unnest(cities||coalesce(city_result.cities_touched,'{}'::text[])));
    end loop;
    return query select promoted,matched,unmatched,noise,unsupported,cities; return;
  elsif public.gt_city_normalize(p_city_filter)<>'atlanta' then
    return query select * from gt_private.gt_promote_legacy_non_atlanta_v1(p_city_filter,p_dry_run,least(greatest(coalesce(p_limit,25),1),100)); return;
  end if;
  for r in select se.* from public.gt_sourced_events se
    where (se.event_date>=(now() at time zone 'America/New_York')::date
      or exists(select 1 from gt_private.gt_source_show_links_v1 l where l.source_event_id=se.id))
      and coalesce(se.published_to_gt,false)=false and se.is_verified=true and se.is_published=true
      and se.legacy_quarantined_at is null and se.legacy_quarantine_reason is null
      and nullif(btrim(se.event_name),'') is not null
      and (p_city_filter is null or public.gt_city_normalize(se.city)=public.gt_city_normalize(p_city_filter))
      and not exists(select 1 from gt_private.gt_backend_change_receipts_v1 q where q.source_event_id=se.id
        and q.outcome in ('held','excluded') and q.input_hash=md5(gt_private.gt_source_show_facts_v1(to_jsonb(se))::text))
    order by se.event_date,se.event_time nulls last,se.created_at
    limit least(greatest(coalesce(p_limit,25),1),100) for update of se skip locked
  loop
    facts:=gt_private.gt_source_show_facts_v1(to_jsonb(r)); input_hash:=md5(facts::text);
    native_id:=nullif(facts->>'provider_occurrence_id',''); native_host:=gt_private.gt_provider_host_v1(r.source_url);
    batch:='source:'||r.id::text||':'||input_hash;
    canonical_city:=public.gt_city_normalize(r.city); reason:=null; sid:=null; inserted:=false; conflicts:='{}'::text[];
    if lower(r.event_name)~'(webinar|virtual event|online event|zoom event|mlm|pyramid scheme|timeshare presentation|make money fast)'
      or lower(coalesce(r.description,''))~'(virtual-only|online-only|zoom webinar|pyramid scheme|multi-level marketing opportunity|timeshare presentation)' then
      noise:=noise+1; reason:='actual_noise_or_virtual';
    elsif canonical_city not in ('atlanta','houston','miami','new_york','los_angeles','charlotte','dallas','washington_dc','phoenix','scottsdale','las_vegas') then
      unsupported:=unsupported+1; reason:='unsupported_city';
    end if;
    if reason is not null then
      if not p_dry_run then insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,source_event_id,actor,outcome,reason,input_hash,evidence)
        values(batch,r.id::text,'source',r.id,'SOURCE_PROMOTER','excluded',reason,input_hash,jsonb_build_object('source_url',r.source_url)) on conflict do nothing; end if;
      continue;
    end if;
    match:=gt_private.gt_resolve_venue_v1(canonical_city,r.venue_name,r.venue_address);
    venue:=(match->>'venue_id')::uuid;
    select * into link from gt_private.gt_source_show_links_v1 l where l.source_event_id=r.id;
    if found then sid:=link.show_id; method:=link.identity_method;
    else
      ids:=null;
      if native_id is not null and native_host is not null then
        select array_agg(t.id) into ids from public.gt_shows t where t.city_key=canonical_city
          and t.provider_occurrence_id=native_id and gt_private.gt_provider_host_v1(t.source_url)=native_host;
      end if;
      if cardinality(ids)>1 then reason:='ambiguous_native_occurrence';
      elsif cardinality(ids)=1 then sid:=ids[1]; method:='native_provider_occurrence';
      else
      select array_agg(t.id) into ids from public.gt_shows t
      where t.city_key=canonical_city and t.show_date=r.event_date
        and (native_id is null or t.provider_occurrence_id is null
          or (t.provider_occurrence_id=native_id and gt_private.gt_provider_host_v1(t.source_url)=native_host))
        and public.gt_normalize_venue_text(t.event_name)=public.gt_normalize_venue_text(r.event_name)
        and gt_private.gt_time_key_v1(t.show_time)=gt_private.gt_time_key_v1(r.event_time)
        and (gt_private.gt_time_key_v1(r.event_time) ~ '^[0-2][0-9]:[0-5][0-9]$'
          or exists(select 1 from public.gt_atlanta_event_evidence_v1 ev where ev.show_id=t.id and ev.occurrence_key=r.raw_data->>'priority_scout_occurrence'))
        and public.gt_normalize_venue_text(t.venue_name)=public.gt_normalize_venue_text(r.venue_name)
        and (nullif(btrim(t.venue_address),'') is null or nullif(btrim(r.venue_address),'') is null
          or gt_private.gt_address_key_v1(t.venue_address)=gt_private.gt_address_key_v1(r.venue_address));
      if cardinality(ids)>1 then reason:='ambiguous_existing_occurrence';
      elsif cardinality(ids)=1 then sid:=ids[1]; method:='exact_occurrence';
      else
        method:='new_source_occurrence';
        if gt_private.gt_time_key_v1(r.event_time) !~ '^[0-2][0-9]:[0-5][0-9]$' and exists(
          select 1 from public.gt_shows u where u.city_key=canonical_city and u.show_date=r.event_date
            and public.gt_normalize_venue_text(u.event_name)=public.gt_normalize_venue_text(r.event_name)
            and public.gt_normalize_venue_text(u.venue_name)=public.gt_normalize_venue_text(r.venue_name)) then
          reason:='unknown_time_occurrence_requires_review';
        end if;
      end if;
      end if;
    end if;
    if sid is not null then
      select * into s from public.gt_shows t where t.id=sid for update;
      if s.city_key is distinct from canonical_city then reason:='linked_occurrence_city_conflict'; end if;
    end if;
    if reason is not null then
      if not p_dry_run then insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,record_id,source_event_id,actor,outcome,reason,input_hash,evidence)
        values(batch,r.id::text,'event',sid,r.id,'SOURCE_PROMOTER','held',reason,input_hash,jsonb_build_object('source_url',r.source_url)) on conflict do nothing; end if;
      continue;
    end if;
    if venue is not null then facts:=facts||jsonb_build_object('venue_id',venue); end if;
    if sid is null then
      -- Past or explicitly cancelled discovery does not create a new active catalog row.
      if r.event_date<(now() at time zone 'America/New_York')::date or facts->>'status' in ('cancelled','postponed') then
        if not p_dry_run then insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,source_event_id,actor,outcome,reason,input_hash,evidence)
          values(batch,r.id::text,'event',r.id,'SOURCE_PROMOTER','held','no_existing_occurrence_for_inactive_source',input_hash,jsonb_build_object('source_url',r.source_url)) on conflict do nothing; end if;
        continue;
      end if;
      promoted:=promoted+1; before_row:='{}'::jsonb; patch:=facts; owned:=facts; outcome:='inserted';
      if not p_dry_run then
        select string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') into cols,selected_cols from jsonb_each(facts);
        execute format('insert into public.gt_shows(city_key,%s) select $2,%s from jsonb_populate_record(null::public.gt_shows,$1) x returning to_jsonb(gt_shows)',cols,selected_cols)
          into after_row using facts,canonical_city;
        sid:=(after_row->>'id')::uuid; inserted:=true;
        owned:=owned||jsonb_build_object('status',after_row->>'status');
      end if;
    else
      before_row:=to_jsonb(s); patch:='{}'::jsonb; owned:=coalesce(link.applied_values,'{}'::jsonb); prior_owned:=owned;
      venue_changed:=(facts ? 'venue_name' and public.gt_normalize_venue_text(facts->>'venue_name') is distinct from public.gt_normalize_venue_text(s.venue_name))
        or (facts ? 'venue_address' and gt_private.gt_address_key_v1(facts->>'venue_address') is distinct from gt_private.gt_address_key_v1(s.venue_address));
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
        foreach cols in array venue_fields loop
          owned:=owned-cols;
          if prior_owned ? cols then owned:=owned||jsonb_build_object(cols,prior_owned->cols); end if;
        end loop;
        conflicts:=array_append(conflicts,'venue_change_requires_coherent_review');
      end if;
      -- Source type refreshes cannot rewrite a manual taxonomy or editorial ranking.
      if coalesce(s.is_curated,false) or coalesce(s.is_featured,false) then patch:=patch-'event_type'-'genre'; end if;
      if patch='{}'::jsonb then outcome:='unchanged'; after_row:=before_row;
      else
        outcome:='updated';
        if not p_dry_run then
          select string_agg(format('%I',key),','),string_agg(format('x.%I',key),',') into cols,selected_cols from jsonb_each(patch);
          prior_guard:=current_setting('good_times.preserve_editorial_id',true);
          prior_fields:=current_setting('good_times.reviewed_patch_fields',true);
          prior_ranking:=current_setting('good_times.preserve_all_ranking',true);
          perform set_config('good_times.preserve_editorial_id',sid::text,true);
          perform set_config('good_times.reviewed_patch_fields','[]',true);
          perform set_config('good_times.preserve_all_ranking','false',true);
          execute format('update public.gt_shows t set (%s)=(select %s from jsonb_populate_record(null::public.gt_shows,$1) x), updated_at=$3 where t.id=$2 returning to_jsonb(t)',cols,selected_cols)
            into after_row using patch,sid,case when patch-'venue_id'-'timezone'-'provider_occurrence_id'='{}'::jsonb then s.updated_at else greatest(s.updated_at,least(coalesce(r.updated_at,r.created_at),now())) end;
          perform set_config('good_times.preserve_editorial_id',coalesce(prior_guard,''),true);
          perform set_config('good_times.reviewed_patch_fields',coalesce(prior_fields,''),true);
          perform set_config('good_times.preserve_all_ranking',coalesce(prior_ranking,''),true);
        end if;
      end if;
    end if;
    if venue is not null or (sid is not null and before_row->>'venue_id' is not null) then matched:=matched+1; else unmatched:=unmatched+1; end if;
    if not canonical_city=any(cities) then cities:=array_append(cities,canonical_city); end if;
    if not p_dry_run then
      select coalesce(array_agg(key),'{}'::text[]) into keys from jsonb_each(patch);
      insert into gt_private.gt_source_show_links_v1(source_event_id,show_id,identity_method,source_snapshot,applied_values,source_fingerprint,last_applied_at,metadata)
      values(r.id,sid,method,gt_private.gt_source_show_facts_v1(to_jsonb(r)),owned,input_hash,now(),jsonb_build_object('venue_match',match,'preserved_fields',conflicts))
      on conflict(source_event_id) do update set source_snapshot=excluded.source_snapshot,applied_values=excluded.applied_values,
        source_fingerprint=excluded.source_fingerprint,last_applied_at=excluded.last_applied_at,metadata=excluded.metadata;
      insert into gt_private.gt_backend_change_receipts_v1(batch_id,row_key,record_type,record_id,source_event_id,actor,outcome,reason,input_hash,changed_fields,before_values,after_values,evidence)
      values(batch,r.id::text,'event',sid,r.id,'SOURCE_PROMOTER',outcome,
        case when cardinality(conflicts)>0 then 'existing_values_preserved_for_review' else method end,input_hash,keys,
        before_row,after_row,jsonb_build_object('source_url',r.source_url,'venue_match',match,'preserved_fields',conflicts))
      on conflict(batch_id,row_key) do nothing returning id into receipt;
      update public.gt_sourced_events set published_to_gt=true,gt_page_id=sid::text,
        venue_id=case when venue_id is null or venue_id is not distinct from (before_row->>'venue_id')::uuid
          then (after_row->>'venue_id')::uuid else venue_id end,
        raw_data=coalesce(raw_data,'{}'::jsonb)||jsonb_build_object('promotion',jsonb_build_object('publisher','occurrence_contract_v1','show_id',sid,'outcome',outcome,'receipt_id',receipt,'processed_at',now()))
      where id=r.id;
    end if;
  end loop;
  return query select promoted,matched,unmatched,noise,unsupported,cities;
end; $$;

revoke all on function gt_private.gt_time_key_v1(text),gt_private.gt_provider_host_v1(text),gt_private.gt_address_key_v1(text),gt_private.gt_full_address_key_v1(text),
  gt_private.gt_resolve_venue_v1(text,text,text),gt_private.gt_source_show_facts_v1(jsonb),gt_private.gt_queue_changed_source_v1()
from public,anon,authenticated;
grant execute on function gt_private.gt_time_key_v1(text),gt_private.gt_provider_host_v1(text),gt_private.gt_address_key_v1(text),gt_private.gt_full_address_key_v1(text),
  gt_private.gt_resolve_venue_v1(text,text,text),gt_private.gt_source_show_facts_v1(jsonb),gt_private.gt_queue_changed_source_v1()
to service_role,postgres;
revoke all on function gt_private.gt_promote_legacy_non_atlanta_v1(text,boolean,integer) from public,anon,authenticated;
grant execute on function gt_private.gt_promote_legacy_non_atlanta_v1(text,boolean,integer) to service_role,postgres;
revoke all on function public.gt_promote_sourced_to_shows_internal(text,boolean,integer) from public,anon,authenticated;
grant execute on function public.gt_promote_sourced_to_shows_internal(text,boolean,integer) to service_role,postgres;

comment on table gt_private.gt_source_show_links_v1 is 'Canonical source-to-show identity and last applied source values. Existing manual facts are preserved by a three-way comparison.';
comment on table gt_private.gt_backend_change_receipts_v1 is 'Private, append-only application outcomes for reviewed workbook changes and source refreshes. A staged/held row is never a publication receipt.';

-- Preserve all source-backed event facts in the existing live-inventory contract.
CREATE OR REPLACE FUNCTION public.gt_public_live_inventory(p_city text, p_service_date date, p_event_limit integer DEFAULT 480, p_venue_limit integer DEFAULT 360)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,city_key,artist_id,venue_id,event_name,event_type,genre,show_date,show_time,doors_time,end_date,end_time,timezone,venue_name,venue_address,image_url,ticket_url,ticket_price_min,ticket_price_max,is_free,free_status,admission_type,currency,price_basis,is_sold_out,age_requirement,age_requirement_verified_at,description,organizer,source,source_url,status,quality_score,good_times_score,display_priority,is_featured,is_curated,category_key_v2,subcategory_key_v2,freshness_tier,fact_verified_at,valid_until,provider_occurrence_id,updated_at
      from public.gt_shows
      where city_key=p_city
        and show_date>=p_service_date
        and (p_city<>'atlanta' or id in(select show_id from public.gt_atlanta_editorial_selection_v1 where selected_at>now()-interval '2 hours'))
        and status in ('confirmed','tentative')
        and coalesce(freshness_tier,'unknown') not in ('expired','unknown')
        and image_url is not null
        and ticket_url is not null
        and lower(coalesce(event_name,'') || ' ' || coalesce(description,'')) !~ '\m(back-to-campus transportation|college shuttle|shuttle event|scheduled motorcoach transportation)\M'
      order by show_date asc,(status='confirmed') desc,is_curated desc,quality_score desc nulls last,updated_at desc,event_name asc
      limit least(greatest(coalesce(p_event_limit,480),1),720)
    ) e),'[]'::jsonb),
    'venues',coalesce((select jsonb_agg(to_jsonb(v)) from (
      select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,culture_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,venue_category_key,venue_subcategory
      from (
        select id,city_key,name,address,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,website,phone,booking_link,status,latitude,longitude,category_key as venue_category_key,subcategory as venue_subcategory,culture_score,
          row_number() over(
            partition by case when hero_image is null or btrim(hero_image)='' then 'venue:'||id::text else lower(regexp_replace(split_part(hero_image,'?',1),'/+$','')) end
            order by is_culture_pick desc,is_black_owned desc,culture_score desc nulls last,quality_score desc nulls last,name asc
          ) as image_rank
        from public.gt_venues
        where city_key=p_city
          and status='active'
          and is_verified=true
          and verification_status='verified_current'
          and freshness_expires_at>now()
          and coalesce(subcategory,'') not in ('grocery_or_supermarket','supermarket')
      ) ranked where image_rank=1
      order by is_culture_pick desc,culture_tier asc nulls last,culture_score desc nulls last,quality_score desc nulls last,name asc
      limit least(greatest(coalesce(p_venue_limit,360),1),540)
    ) v),'[]'::jsonb)
  );
$function$;

commit;
