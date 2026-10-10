-- GOOD TIMES partner portal intake: Gateway project dzlmtvodpyhetvektfuo ONLY.
-- All edits are proposals; NEVER mutate/publish canonical gt_venues from authenticated browser.
create table if not exists public.gt_portal_claims (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid references public.gt_venues(id) on delete restrict,
 requested_name text,
 auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 contact_name text not null check(length(btrim(contact_name)) between 2 and 160),
 contact_email text not null,
 contact_phone text,
 relationship text not null default 'manager' check(relationship in ('owner','manager','marketing','agency','other')),
 profile_draft jsonb not null default '{}'::jsonb check(jsonb_typeof(profile_draft)='object'),
 status text not null default 'pending_review' check(status in ('pending_review','more_info','verified','rejected','disputed')),
 terms_accepted boolean not null default false check(terms_accepted=true),
 review_reason text,
 reviewed_by uuid,
 reviewed_at timestamptz,
 submitted_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(venue_id is not null or length(btrim(coalesce(requested_name,''))) between 2 and 180),
 check (length(btrim(contact_email)) between 6 and 254),
 check(contact_phone is null or length(contact_phone)<=40),
 check (pg_column_size(profile_draft)<=16384)
);
create unique index if not exists gt_portal_claims_venue_claimant_once on public.gt_portal_claims(venue_id,auth_user_id) where venue_id is not null;
create index if not exists gt_portal_claims_owner_idx on public.gt_portal_claims(auth_user_id,submitted_at desc);
create index if not exists gt_portal_claims_review_idx on public.gt_portal_claims(status,submitted_at);
comment on table public.gt_portal_claims is 'GOOD TIMES venue claim requests only; email verified via Supabase Auth, venue authority and publication require staff review.';

create table if not exists public.gt_portal_memberships (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.gt_venues(id) on delete restrict,
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 claim_id uuid not null unique references public.gt_portal_claims(id) on delete restrict,
 role text not null default 'owner' check(role in ('owner','manager','marketing','finance')),
 is_active boolean not null default true,
 granted_by uuid,
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 unique(venue_id,auth_user_id)
);
create index if not exists gt_portal_memberships_owner_idx on public.gt_portal_memberships(auth_user_id);
comment on table public.gt_portal_memberships is 'Server-issued verified venue permissions. Never create membership directly from a claim or signed-in user.';

create table if not exists public.gt_portal_media (
 id uuid primary key default gen_random_uuid(),
 claim_id uuid not null references public.gt_portal_claims(id) on delete restrict,
 auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 storage_bucket text not null default 'gt-partner-pending' check(storage_bucket='gt-partner-pending'),
 storage_path text not null unique,
 asset_type text not null check(asset_type in ('logo','cover','gallery','menu','flyer')),
 file_name text not null check(length(file_name) between 1 and 200),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 rights_confirmed boolean not null check(rights_confirmed=true),
 review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
 reviewer_note text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check(position(auth_user_id::text || '/' || claim_id::text || '/' in storage_path)=1)
);
create index if not exists gt_portal_media_claim_idx on public.gt_portal_media(claim_id,created_at desc);
comment on table public.gt_portal_media is 'Private pending media metadata: never public until vetted and promoted by trusted editorial service.';

create table if not exists public.gt_portal_interests (
 id uuid primary key default gen_random_uuid(),
 claim_id uuid not null references public.gt_portal_claims(id) on delete restrict,
 auth_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
 category text not null check(category in ('app_advertising','email_marketing','social_spotlight','influencer_posts','influencer_visits','physical_marketing','event_boost','content_production','custom_bundle')),
 objective text not null default '' check(length(objective)<=800),
 budget_band text check(budget_band in ('exploring','under_500','500_1500','1500_5000','over_5000')),
 status text not null default 'new' check(status in ('new','qualified','proposal','closed','declined')),
 submitted_at timestamptz not null default now()
);
create index if not exists gt_portal_interests_owner_idx on public.gt_portal_interests(auth_user_id,submitted_at desc);
comment on table public.gt_portal_interests is 'Good Times inquiry/quote interests only; not a purchase or provider send.';

-- Create pending-only private storage (no PII-bearing or rights-undetermined assets in public gt-partner-assets).
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gt-partner-pending','gt-partner-pending',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;

alter table public.gt_portal_claims enable row level security;
alter table public.gt_portal_memberships enable row level security;
alter table public.gt_portal_media enable row level security;
alter table public.gt_portal_interests enable row level security;

revoke all on public.gt_portal_claims,public.gt_portal_memberships,public.gt_portal_media,public.gt_portal_interests from public,anon,authenticated;
grant all on public.gt_portal_claims,public.gt_portal_memberships,public.gt_portal_media,public.gt_portal_interests to service_role;
grant select,insert on public.gt_portal_claims to authenticated;
grant update(contact_name,contact_phone,relationship,profile_draft,updated_at) on public.gt_portal_claims to authenticated;
grant select on public.gt_portal_memberships to authenticated;
grant select,insert on public.gt_portal_media,public.gt_portal_interests to authenticated;

drop policy if exists "gt_portal_claim_self_read" on public.gt_portal_claims;
create policy "gt_portal_claim_self_read" on public.gt_portal_claims for select to authenticated
using (auth_user_id=(select auth.uid()));
drop policy if exists "gt_portal_claim_self_create" on public.gt_portal_claims;
create policy "gt_portal_claim_self_create" on public.gt_portal_claims for insert to authenticated
with check (
 auth_user_id=(select auth.uid())
 and status='pending_review' and reviewed_by is null and reviewed_at is null and review_reason is null
 and terms_accepted = true
 and lower(contact_email)=lower((select auth.jwt()->>'email'))
 and (venue_id is null or exists (
  select 1 from public.gt_venues v where v.id=venue_id
   and v.city_key='atlanta' and v.status='active' and v.is_verified=true
 ))
);
drop policy if exists "gt_portal_claim_own_pending_update" on public.gt_portal_claims;
create policy "gt_portal_claim_own_pending_update" on public.gt_portal_claims for update to authenticated
using (auth_user_id=(select auth.uid()) and status in ('pending_review','more_info'))
with check (auth_user_id=(select auth.uid()) and status in ('pending_review','more_info'));

drop policy if exists "gt_portal_membership_self_read" on public.gt_portal_memberships;
create policy "gt_portal_membership_self_read" on public.gt_portal_memberships for select to authenticated
using(auth_user_id=(select auth.uid()));

drop policy if exists "gt_portal_media_self_read" on public.gt_portal_media;
create policy "gt_portal_media_self_read" on public.gt_portal_media for select to authenticated
using(auth_user_id=(select auth.uid()) and exists(select 1 from public.gt_portal_claims c where c.id=claim_id and c.auth_user_id=(select auth.uid())));
drop policy if exists "gt_portal_media_self_insert" on public.gt_portal_media;
create policy "gt_portal_media_self_insert" on public.gt_portal_media for insert to authenticated
with check(auth_user_id=(select auth.uid()) and review_status='pending' and reviewer_note is null and reviewed_at is null
  and exists(select 1 from public.gt_portal_claims c where c.id=claim_id and c.auth_user_id=(select auth.uid()) and c.status in ('pending_review','more_info','verified')));

drop policy if exists "gt_portal_interest_self_read" on public.gt_portal_interests;
create policy "gt_portal_interest_self_read" on public.gt_portal_interests for select to authenticated
using(auth_user_id=(select auth.uid()) and exists(select 1 from public.gt_portal_claims c where c.id=claim_id and c.auth_user_id=(select auth.uid())));
drop policy if exists "gt_portal_interest_self_insert" on public.gt_portal_interests;
create policy "gt_portal_interest_self_insert" on public.gt_portal_interests for insert to authenticated
with check(auth_user_id=(select auth.uid()) and status='new'
  and exists(select 1 from public.gt_portal_claims c where c.id=claim_id and c.auth_user_id=(select auth.uid())));

-- Private object access is owner+claim isolated. Prefix is auth_uuid/claim_uuid/random_filename.
drop policy if exists "gt_portal_storage_owner_read" on storage.objects;
create policy "gt_portal_storage_owner_read" on storage.objects for select to authenticated
using(bucket_id='gt-partner-pending' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.gt_portal_claims c where c.id::text=(storage.foldername(name))[2] and c.auth_user_id=(select auth.uid())));
drop policy if exists "gt_portal_storage_owner_upload" on storage.objects;
create policy "gt_portal_storage_owner_upload" on storage.objects for insert to authenticated
with check(bucket_id='gt-partner-pending' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.gt_portal_claims c where c.id::text=(storage.foldername(name))[2] and c.auth_user_id=(select auth.uid()) and c.status in ('pending_review','more_info','verified')));
-- No partner update/delete/upsert on storage objects; replacement = new filename + new moderation record.
