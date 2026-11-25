-- Minimal pre-contract dependencies for isolated migration regression tests.
-- Schema and legacy helpers only; no production rows, credentials, or external files.
-- The contract functions under test are loaded from supabase/migrations by database.mjs.
create role anon;
create role authenticated;
create role service_role;

create table public.gt_atlanta_editorial_selection_v1 (
  "show_id" uuid not null,
  "editorial_score" numeric not null,
  "selection_reason" text not null,
  "horizon" text not null,
  "category" text not null,
  "source_verified_at" timestamptz,
  "selected_at" timestamptz default now() not null
);

create table public.gt_atlanta_event_evidence_v1 (
  "occurrence_key" text not null,
  "show_id" uuid,
  "source_id" uuid not null,
  "source_url" text not null,
  "event_date" date not null,
  "event_time" text,
  "venue_name" text not null,
  "verified_at" timestamptz not null,
  "eligible" bool not null,
  "reason" text not null,
  "market_scope" text not null,
  "event_status" text default 'scheduled'::text not null,
  "facts" jsonb default '{}'::jsonb not null,
  "superseded_by" text,
  unique (occurrence_key)
);

create table public.gt_shows (
  "id" uuid default gen_random_uuid() not null,
  "artist_id" uuid,
  "tour_id" uuid,
  "venue_id" uuid,
  "city_key" text not null,
  "show_date" date not null,
  "show_time" text,
  "doors_time" text,
  "event_name" text not null,
  "event_type" text not null,
  "genre" text,
  "venue_name" text,
  "venue_address" text,
  "ticket_url" text,
  "ticket_price_min" numeric,
  "ticket_price_max" numeric,
  "is_sold_out" bool default false,
  "is_free" bool default false,
  "age_requirement" text default '18+'::text,
  "image_url" text,
  "description" text,
  "organizer" text,
  "source" text,
  "source_url" text,
  "status" text default 'confirmed'::text,
  "display_priority" int4 default 50,
  "is_featured" bool default false,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "needs_image_sourcing" bool default false,
  "freshness_tier" text default 'unknown'::text,
  "quality_score" int4,
  "is_curated" bool default false,
  "curation_reason" text,
  "is_world_cup" bool default false,
  "holiday_tag" text,
  "good_times_score" numeric,
  "category_key_v2" text,
  "subcategory_key_v2" text,
  primary key (id)
);

create table public.gt_sourced_events (
  "id" uuid default gen_random_uuid() not null,
  "city" text not null,
  "event_name" text not null,
  "event_date" date,
  "event_time" text,
  "end_date" date,
  "end_time" text,
  "venue_name" text,
  "venue_address" text,
  "neighborhood" text,
  "event_type" text not null,
  "event_category" text,
  "description" text,
  "ticket_url" text,
  "ticket_price" text,
  "image_url" text,
  "source_id" uuid,
  "source_url" text,
  "source_name" text,
  "organizer" text,
  "tags" text[] default '{}'::text[],
  "vibe_tags" text[] default '{}'::text[],
  "is_free" bool default false,
  "is_verified" bool default false,
  "is_published" bool default false,
  "published_to_gt" bool default false,
  "gt_page_id" text,
  "dedup_hash" text,
  "raw_data" jsonb default '{}'::jsonb,
  "ai_summary" text,
  "ai_vibe_score" int4,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "venue_id" uuid,
  "legacy_quarantined_at" timestamptz,
  "legacy_quarantine_reason" text,
  "good_times_score" numeric,
  "category_key_v2" text,
  "subcategory_key_v2" text,
  primary key (id),
  unique (dedup_hash)
);

create table public.gt_venue_aliases (
  "id" uuid default gen_random_uuid() not null,
  "city_key" text default 'atlanta'::text not null,
  "alias_name" text not null,
  "alias_address" text,
  "normalized_alias_name" text,
  "normalized_alias_address" text,
  "venue_id" uuid not null,
  "match_method" text default 'reviewed_alias'::text not null,
  "confidence" int2 default 100 not null,
  "status" text default 'active'::text not null,
  "evidence" jsonb default '{}'::jsonb not null,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  primary key (id)
);

create table public.gt_venues (
  "id" uuid default gen_random_uuid() not null,
  "city_key" text not null,
  "neighborhood" text,
  "name" text not null,
  "slug" text not null,
  "category_key" text not null,
  "subcategory" text,
  "address" text,
  "latitude" numeric,
  "longitude" numeric,
  "phone" text,
  "website" text,
  "instagram_handle" text,
  "google_place_id" text,
  "yelp_id" text,
  "short_desc" text,
  "long_desc" text,
  "vibe_tags" text[] default '{}'::text[],
  "best_for" text[] default '{}'::text[],
  "best_time" text,
  "price_range" text,
  "dress_code" text,
  "reservation_req" bool default false,
  "hours" jsonb default '{}'::jsonb,
  "featured_item" text,
  "insider_tip" text,
  "status" text default 'active'::text,
  "is_featured" bool default false,
  "is_verified" bool default false,
  "quality_score" int4 default 0,
  "data_source" text default 'manual'::text,
  "photos" text[] default '{}'::text[],
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "hero_image" text,
  "entry_id" text,
  "booking_link" text,
  "booking_platform" text,
  "awards" text,
  "people_score" int4,
  "age_range" text,
  "side_of_town" text,
  "google_rating" numeric,
  "google_reviews" int4,
  "hours_summary" text,
  "evidence_url_1" text,
  "evidence_type_1" text,
  "evidence_url_2" text,
  "evidence_type_2" text,
  "enrichment_status" text default 'needs_enrichment'::text,
  "enrichment_source" text,
  "enriched_at" timestamptz,
  "photo_status" text default 'missing'::text,
  "best_day" text,
  "best_time_slot" text,
  "tonight_eligible" bool default false,
  "tonight_label" text,
  "tonight_priority" int4 default 5,
  "search_tags" text[] default '{}'::text[],
  "tab_tags" text[] default '{}'::text[],
  "culture_tier" int2 default 3,
  "is_khg" bool default false,
  "is_friend" bool default false,
  "is_culture_pick" bool default false,
  "is_black_owned" bool default false,
  "culture_score" numeric default 0,
  "source_count" int4 default 0,
  "last_culture_mention" timestamptz,
  "khg_brand_key" text,
  "friend_owner" text,
  "culture_tags" text[],
  "sourced_from" text[],
  "photo_source" varchar default 'google_maps'::character varying,
  "photo_credit" varchar,
  "is_stock_photo" bool,
  "verification_status" text default 'unverified'::text not null,
  "verified_at" timestamptz,
  "freshness_expires_at" timestamptz,
  "verification_evidence_count" int2 default 0 not null,
  "verification_method" text,
  "shake_enabled" bool default false not null,
  "shake_weight" numeric default 1.000 not null,
  "shake_tags" text[] default '{}'::text[] not null,
  "amenity_tags" text[] default '{}'::text[] not null,
  "dietary_tags" text[] default '{}'::text[] not null,
  "ownership_tags" text[] default '{}'::text[] not null,
  primary key (id)
);

alter table public.gt_shows add constraint test_event_type check (event_type in ('concert','comedy','festival','play','musical','sports','special_event','activation','nightlife','brunch'));
alter table public.gt_shows add constraint test_status check (status in ('confirmed','tentative','cancelled','postponed','sold_out'));

create table public.gt_event_sources (id uuid primary key default gen_random_uuid(), source_name text, source_url text, city text);
create table public.gt_atlanta_priority_policy_v1 (source_id uuid primary key, enabled boolean, priority integer);

CREATE OR REPLACE FUNCTION public.gt_normalize_venue_text(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select nullif(
    regexp_replace(
      lower(
        replace(replace(replace(replace(coalesce(p_value,''),'&amp;',' and '),'&#x27;', ''''),'&',' and '),'–','-')
      ),
      '[^a-z0-9]+','','g'
    ),
    ''
  );
$function$
;

CREATE OR REPLACE FUNCTION public.gt_city_normalize(raw_city text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
BEGIN
  IF raw_city IS NULL THEN RETURN NULL; END IF;
  RETURN CASE LOWER(TRIM(raw_city))
    WHEN 'atl' THEN 'atlanta'
    WHEN 'atlanta' THEN 'atlanta'
    WHEN 'houston' THEN 'houston'
    WHEN 'miami' THEN 'miami'
    WHEN 'new york' THEN 'new_york'
    WHEN 'new_york' THEN 'new_york'
    WHEN 'nyc' THEN 'new_york'
    WHEN 'los angeles' THEN 'los_angeles'
    WHEN 'los_angeles' THEN 'los_angeles'
    WHEN 'la' THEN 'los_angeles'
    WHEN 'charlotte' THEN 'charlotte'
    WHEN 'dallas' THEN 'dallas'
    WHEN 'washington dc' THEN 'washington_dc'
    WHEN 'washington_dc' THEN 'washington_dc'
    WHEN 'washington' THEN 'washington_dc'
    WHEN 'dc' THEN 'washington_dc'
    WHEN 'phoenix' THEN 'phoenix'
    WHEN 'scottsdale' THEN 'scottsdale'
    WHEN 'las vegas' THEN 'las_vegas'
    WHEN 'las_vegas' THEN 'las_vegas'
    WHEN 'vegas' THEN 'las_vegas'
    ELSE LOWER(REPLACE(TRIM(raw_city), ' ', '_'))
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.classify_event_freshness()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.freshness_tier := CASE
    WHEN NEW.updated_at >= NOW() - INTERVAL '24 hours' THEN 'red_hot'
    WHEN NEW.updated_at >= NOW() - INTERVAL '72 hours' THEN 'hot'
    WHEN NEW.updated_at >= NOW() - INTERVAL '7 days' THEN 'warm'
    WHEN NEW.updated_at >= NOW() - INTERVAL '30 days' THEN 'cool'
    ELSE 'expired'
  END;
  RETURN NEW;
END;
$function$
;

create trigger gt_shows_freshness before insert or update on public.gt_shows
for each row execute function public.classify_event_freshness();
