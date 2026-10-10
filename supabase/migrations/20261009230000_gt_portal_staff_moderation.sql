-- GOOD TIMES (Gateway dzlmtvodpyhetvektfuo) / privileged staff moderation.
-- Adds server-only approval, media QA, selective official profile publishing.
-- No prices, sends, auto claims, or checkout enabled.
create table if not exists public.gt_portal_staff (
 auth_user_id uuid primary key references auth.users(id) on delete restrict,
 role text not null check(role in ('approver','supervisor')),
 is_active boolean not null default true,
 granted_at timestamptz not null default now(),
 grant_reason text not null
);
create table if not exists public.gt_portal_audit (
 id bigint generated always as identity primary key,
 actor_user_id uuid not null,
 action text not null,
 claim_id uuid references public.gt_portal_claims(id) on delete restrict,
 venue_id uuid references public.gt_venues(id) on delete restrict,
 resource_id uuid,
 evidence_ref text,
 detail jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create index if not exists gt_portal_audit_claim_idx on public.gt_portal_audit(claim_id,occurred_at desc);
create table if not exists public.gt_portal_publications (
 id uuid primary key default gen_random_uuid(),
 claim_id uuid not null references public.gt_portal_claims(id) on delete restrict,
 venue_id uuid not null references public.gt_venues(id) on delete restrict,
 approved_by uuid not null references auth.users(id) on delete restrict,
 fields text[] not null,
 previous_public_values jsonb not null,
 published_values jsonb not null,
 evidence_ref text not null,
 published_at timestamptz not null default now()
);
create index if not exists gt_portal_publications_claim_idx on public.gt_portal_publications(claim_id,published_at desc);
alter table public.gt_portal_staff enable row level security;
alter table public.gt_portal_audit enable row level security;
alter table public.gt_portal_publications enable row level security;
revoke all on public.gt_portal_staff,public.gt_portal_audit,public.gt_portal_publications from public,anon,authenticated;
grant select,insert,update,delete on public.gt_portal_staff,public.gt_portal_audit,public.gt_portal_publications to service_role;
grant usage,select on sequence public.gt_portal_audit_id_seq to service_role;

-- Bootstrap only an existing, already email-confirmed founder identity. Not self registration.
-- Legacy gt_partner_admins is NOT a permission source for these functions.
insert into public.gt_portal_staff(auth_user_id,role,grant_reason)
select u.id,'supervisor','Existing confirmed founder identity; explicit one-time trusted staff bootstrap 2026-10-09'
from auth.users u
where lower(u.email) in ('thedoctordorsey@gmail.com','dolodorsey@gmail.com')
 and u.email_confirmed_at is not null
on conflict(auth_user_id) do nothing;

create or replace function public.gt_portal_is_staff()
returns boolean language sql stable security definer set search_path=''
as $f$
 select (select auth.uid()) is not null
 and exists (select 1 from public.gt_portal_staff s
  where s.auth_user_id=(select auth.uid()) and s.is_active=true)
 and exists (select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null);
$f$;
revoke all on function public.gt_portal_is_staff() from public,anon;
grant execute on function public.gt_portal_is_staff() to authenticated,service_role;

create or replace function public.gt_portal_staff_profile()
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_role text;
begin
 if (select auth.uid()) is null then return jsonb_build_object('authorized',false); end if;
 select s.role into v_role from public.gt_portal_staff s
 where s.auth_user_id=(select auth.uid()) and s.is_active
 and exists(select 1 from auth.users u where u.id=s.auth_user_id and u.email_confirmed_at is not null);
 return jsonb_build_object('authorized',coalesce(v_role is not null,false),'role',v_role);
end; $f$;
revoke all on function public.gt_portal_staff_profile() from public,anon;
grant execute on function public.gt_portal_staff_profile() to authenticated,service_role;

create or replace function public.gt_portal_staff_queue(p_kind text default 'claims',p_limit integer default 40)
returns jsonb language plpgsql stable security definer set search_path=''
as $f$
declare v_limit integer; v_result jsonb;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501'; end if;
 v_limit:=least(greatest(coalesce(p_limit,40),1),100);
 if p_kind='claims' then
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into v_result from (
 select c.id,c.venue_id,c.requested_name,c.contact_name,c.contact_email,c.relationship,c.profile_draft,c.status,c.review_reason,c.submitted_at,c.reviewed_at,v.name as canonical_venue_name,v.address as canonical_address,c.auth_user_id
 from public.gt_portal_claims c
 left join public.gt_venues v on v.id=c.venue_id
 order by (case when c.status in ('pending_review','more_info','disputed') then 0 else 1 end),c.submitted_at desc limit v_limit
 ) t;
 elsif p_kind='media' then
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into v_result from (
 select m.id,m.claim_id,m.asset_type,m.file_name,m.mime_type,m.size_bytes,m.storage_path,m.storage_bucket,m.review_status,m.reviewer_note,m.created_at,c.requested_name,c.venue_id,c.status as claim_status
 from public.gt_portal_media m join public.gt_portal_claims c on c.id=m.claim_id
 order by (case when m.review_status='pending' then 0 else 1 end),m.created_at desc limit v_limit
 )t;
 elsif p_kind='interests' then
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into v_result from (
 select i.id,i.claim_id,i.category,i.objective,i.budget_band,i.status,i.submitted_at,c.requested_name,c.contact_email
 from public.gt_portal_interests i join public.gt_portal_claims c on c.id=i.claim_id
 order by i.submitted_at desc limit v_limit
 ) t;
 elsif p_kind='publications' then
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into v_result from (
 select p.id,p.claim_id,p.venue_id,p.fields,p.approved_by,p.published_at,p.published_values
 from public.gt_portal_publications p order by p.published_at desc limit v_limit
 ) t;
 else raise exception 'Unknown queue' using errcode='22023'; end if;
 return v_result;
end; $f$;
revoke all on function public.gt_portal_staff_queue(text,integer) from public,anon;
grant execute on function public.gt_portal_staff_queue(text,integer) to authenticated,service_role;

create or replace function public.gt_portal_staff_claim_decision(
 p_claim_id uuid,p_decision text,p_authority_method text,p_evidence_ref text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare c public.gt_portal_claims%rowtype; v_status text; v_actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501'; end if;
 v_actor:=(select auth.uid());
 if p_decision not in ('approve','more_info','reject','dispute') then raise exception 'Unknown decision' using errcode='22023'; end if;
 if length(btrim(coalesce(p_note,'')))<15 then raise exception 'Review note required (15+ characters)' using errcode='22023';end if;
 if p_decision='approve' and (p_authority_method not in ('official_business_domain','confirmed_business_channel','signed_authorization','verified_existing_owner','documentary_staff_review') or length(btrim(coalesce(p_evidence_ref,'')))<18)
 then raise exception 'Verified authority method and detailed evidence reference required' using errcode='22023';end if;
 select * into c from public.gt_portal_claims where id=p_claim_id for update;
 if not found then raise exception 'Claim not found' using errcode='P0002';end if;
 if c.status in ('rejected','verified') then raise exception 'Claim terminal; request audited transfer' using errcode='23514'; end if;
 if p_decision='approve' then
  if c.venue_id is null then raise exception 'Unlisted venues require manual canonical onboarding' using errcode='23514';end if;
  if not exists(select 1 from public.gt_venues v where v.id=c.venue_id and v.city_key='atlanta' and v.status='active' and v.is_verified is true) then raise exception 'Canonical venue not eligible' using errcode='23514';end if;
  if exists(select 1 from public.gt_portal_memberships m where m.venue_id=c.venue_id and m.is_active and m.revoked_at is null and m.auth_user_id<>c.auth_user_id and m.role='owner') then raise exception 'Existing verified owner: dispute/transfer required' using errcode='23514';end if;
  v_status:='verified';
 elsif p_decision='more_info' then v_status:='more_info';
 elsif p_decision='reject' then v_status:='rejected';
 else v_status:='disputed';end if;
 update public.gt_portal_claims set status=v_status,reviewed_by=v_actor,reviewed_at=now(),review_reason=left(p_note,2000),updated_at=now()
 where id=p_claim_id;
 if p_decision='approve' then
  insert into public.gt_portal_memberships(venue_id,auth_user_id,claim_id,role,is_active,granted_by)
  values(c.venue_id,c.auth_user_id,c.id,'owner',true,v_actor)
  on conflict(venue_id,auth_user_id) do update set is_active=true,revoked_at=null,granted_by=v_actor;
 end if;
 insert into public.gt_portal_audit(actor_user_id,action,claim_id,venue_id,evidence_ref,detail)
 values(v_actor,'claim_'||p_decision,c.id,c.venue_id,left(p_evidence_ref,1500),
 jsonb_build_object('previous_status',c.status,'new_status',v_status,'authority_method',p_authority_method,'review_note',left(p_note,2000)));
 return jsonb_build_object('ok',true,'claim_id',p_claim_id,'status',v_status);
end; $f$;
revoke all on function public.gt_portal_staff_claim_decision(uuid,text,text,text,text) from public,anon;
grant execute on function public.gt_portal_staff_claim_decision(uuid,text,text,text,text) to authenticated,service_role;

create or replace function public.gt_portal_staff_media_decision(
 p_media_id uuid,p_decision text,p_note text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare m public.gt_portal_media%rowtype; v_actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 v_actor:=(select auth.uid());
 if p_decision not in ('approved','rejected') then raise exception 'Invalid media decision' using errcode='22023';end if;
 if length(btrim(coalesce(p_note,'')))<15 then raise exception 'Provide audit reason' using errcode='22023';end if;
 select * into m from public.gt_portal_media where id=p_media_id for update;
 if not found or m.review_status<>'pending' then raise exception 'Media not pending' using errcode='23514';end if;
 if p_decision='approved' and not exists(select 1 from storage.objects s where s.bucket_id=m.storage_bucket and s.name=m.storage_path) then raise exception 'Actual storage object missing' using errcode='23514';end if;
 update public.gt_portal_media set review_status=p_decision,reviewer_note=left(p_note,1500),reviewed_at=now() where id=p_media_id;
 insert into public.gt_portal_audit(actor_user_id,action,claim_id,resource_id,evidence_ref,detail)
 values(v_actor,'media_'||p_decision,m.claim_id,m.id,m.storage_path,jsonb_build_object('reason',p_note,'asset_type',m.asset_type));
 return jsonb_build_object('ok',true,'media_id',p_media_id,'status',p_decision);
end;$f$;
revoke all on function public.gt_portal_staff_media_decision(uuid,text,text) from public,anon;
grant execute on function public.gt_portal_staff_media_decision(uuid,text,text) to authenticated,service_role;

-- Staff may inspect private pending media only when authenticated with explicit verified staff role.
drop policy if exists "gt_portal_storage_staff_review" on storage.objects;
create policy "gt_portal_storage_staff_review" on storage.objects for select to authenticated
using(bucket_id='gt-partner-pending' and (select public.gt_portal_is_staff()));

-- Publishing is strictly field-scoped and audited. Staff must check original evidence; no silent author edits to consumer ranking/hours/categories.
create or replace function public.gt_portal_staff_publish(
 p_claim_id uuid,p_fields text[],p_evidence_ref text
) returns jsonb language plpgsql volatile security definer set search_path=''
as $f$
declare c public.gt_portal_claims%rowtype;v public.gt_venues%rowtype; d jsonb; before_values jsonb; after_values jsonb; v_field text; actor uuid;
begin
 if not (select public.gt_portal_is_staff()) then raise exception 'Not authorized' using errcode='42501';end if;
 actor:=(select auth.uid());
 if array_length(p_fields,1) is null or array_length(p_fields,1)>4 then raise exception 'Select 1-4 explicit fields' using errcode='22023';end if;
 foreach v_field in array p_fields loop if v_field not in ('website','instagram_handle','booking_link','short_desc') then raise exception 'Unapproved publication field' using errcode='22023';end if;end loop;
 if length(btrim(coalesce(p_evidence_ref,'')))<18 then raise exception 'Provide verified source evidence' using errcode='22023';end if;
 select * into c from public.gt_portal_claims where id=p_claim_id for update;
 if not found or c.status<>'verified' then raise exception 'Verified claim required' using errcode='23514';end if;
 if not exists(select 1 from public.gt_portal_memberships m where m.claim_id=c.id and m.is_active and m.revoked_at is null and m.auth_user_id=c.auth_user_id) then raise exception 'Active authorized membership required' using errcode='23514';end if;
 select * into v from public.gt_venues where id=c.venue_id and city_key='atlanta' and status='active' and is_verified is true for update;
 if not found then raise exception 'Canonical venue not eligible' using errcode='23514';end if;
 d:=c.profile_draft;
 if 'website'=any(p_fields) and (nullif(d->>'website','') is null or d->>'website' !~* '^https://[a-z0-9][a-z0-9.-]+([/?#][^[:space:]]*)?$') then raise exception 'Verified https venue website required' using errcode='22023';end if;
 if 'booking_link'=any(p_fields) and (nullif(d->>'booking_link','') is null or d->>'booking_link' !~* '^https://[a-z0-9][a-z0-9.-]+([/?#][^[:space:]]*)?$') then raise exception 'Verified https booking link required' using errcode='22023';end if;
 if 'instagram_handle'=any(p_fields) and (length(coalesce(d->>'instagram_handle',''))<2 or length(d->>'instagram_handle')>70) then raise exception 'Valid Instagram handle required' using errcode='22023';end if;
 if 'short_desc'=any(p_fields) and (length(btrim(coalesce(d->>'description','')))<25 or length(d->>'description')>800) then raise exception 'Approved brief description 25–800 chars required' using errcode='22023';end if;
 before_values:=jsonb_build_object('website',v.website,'booking_link',v.booking_link,'instagram_handle',v.instagram_handle,'short_desc',v.short_desc);
 update public.gt_venues set
 website=case when 'website'=any(p_fields) then d->>'website' else website end,
 booking_link=case when 'booking_link'=any(p_fields) then d->>'booking_link' else booking_link end,
 instagram_handle=case when 'instagram_handle'=any(p_fields) then d->>'instagram_handle' else instagram_handle end,
 short_desc=case when 'short_desc'=any(p_fields) then d->>'description' else short_desc end,
 updated_at=now()
 where id=c.venue_id;
 select * into v from public.gt_venues where id=c.venue_id;
 after_values:=jsonb_build_object('website',v.website,'booking_link',v.booking_link,'instagram_handle',v.instagram_handle,'short_desc',v.short_desc);
 insert into public.gt_portal_publications(claim_id,venue_id,approved_by,fields,previous_public_values,published_values,evidence_ref)
 values(c.id,c.venue_id,actor,p_fields,before_values,after_values,left(p_evidence_ref,1500));
 insert into public.gt_portal_audit(actor_user_id,action,claim_id,venue_id,evidence_ref,detail)
 values(actor,'profile_selective_publish',c.id,c.venue_id,p_evidence_ref,jsonb_build_object('fields',p_fields,'previous',before_values,'current',after_values));
 return jsonb_build_object('ok',true,'venue_id',c.venue_id,'published_fields',p_fields);
end;$f$;
revoke all on function public.gt_portal_staff_publish(uuid,text[],text) from public,anon;
grant execute on function public.gt_portal_staff_publish(uuid,text[],text) to authenticated,service_role;
