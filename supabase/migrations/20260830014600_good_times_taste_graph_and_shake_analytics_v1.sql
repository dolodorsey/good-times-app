-- Target Supabase project: GOOD TIMES (czocqfaovfpjweayniuw)
create schema if not exists private;

create table if not exists public.gt_taste_profile_dimensions (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  dimension_type text not null check (dimension_type in ('cuisine','vibe','price','neighborhood')),
  dimension_value text not null,
  score numeric(8,3) not null default 0,
  positive_events integer not null default 0,
  negative_events integer not null default 0,
  total_events integer not null default 0,
  last_signal_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_id, dimension_type, dimension_value)
);

alter table public.gt_taste_profile_dimensions enable row level security;
revoke all on table public.gt_taste_profile_dimensions from anon;
revoke insert, update, delete on table public.gt_taste_profile_dimensions from authenticated;
grant select on table public.gt_taste_profile_dimensions to authenticated;
grant all on table public.gt_taste_profile_dimensions to service_role;

drop policy if exists gt_taste_profile_dimensions_read_own on public.gt_taste_profile_dimensions;
create policy gt_taste_profile_dimensions_read_own on public.gt_taste_profile_dimensions for select to authenticated using ((select auth.uid()) = auth_id);
create index if not exists gt_taste_profile_dimensions_user_score_idx on public.gt_taste_profile_dimensions (auth_id, dimension_type, score desc, last_signal_at desc);

create or replace function private.gt_upsert_taste_dimension(p_auth_id uuid,p_dimension_type text,p_dimension_value text,p_delta numeric,p_signal_at timestamptz) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_value text := lower(trim(coalesce(p_dimension_value,''))); v_positive integer := case when p_delta > 0 then 1 else 0 end; v_negative integer := case when p_delta < 0 then 1 else 0 end;
begin
  if v_value = '' or p_dimension_type not in ('cuisine','vibe','price','neighborhood') then return; end if;
  insert into public.gt_taste_profile_dimensions(auth_id,dimension_type,dimension_value,score,positive_events,negative_events,total_events,last_signal_at,updated_at)
  values(p_auth_id,p_dimension_type,v_value,greatest(-10,least(25,p_delta)),v_positive,v_negative,1,p_signal_at,now())
  on conflict(auth_id,dimension_type,dimension_value) do update set
    score=greatest(-10,least(25,public.gt_taste_profile_dimensions.score+excluded.score)),
    positive_events=public.gt_taste_profile_dimensions.positive_events+excluded.positive_events,
    negative_events=public.gt_taste_profile_dimensions.negative_events+excluded.negative_events,
    total_events=public.gt_taste_profile_dimensions.total_events+1,
    last_signal_at=greatest(public.gt_taste_profile_dimensions.last_signal_at,excluded.last_signal_at),updated_at=now();
end; $$;
revoke all on function private.gt_upsert_taste_dimension(uuid,text,text,numeric,timestamptz) from public, anon, authenticated;
grant execute on function private.gt_upsert_taste_dimension(uuid,text,text,numeric,timestamptz) to service_role;

create or replace function private.gt_taste_signal_to_profile() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_delta numeric := case new.signal_type when 'shake_accept' then 3.0 when 'save' then 4.0 when 'open' then 1.25 when 'shake_result' then 0.25 when 'shake_reject' then -2.5 else 0.5 end; v_vibe text;
begin
  perform private.gt_upsert_taste_dimension(new.auth_id,'cuisine',new.metadata->>'cuisine',v_delta,new.occurred_at);
  perform private.gt_upsert_taste_dimension(new.auth_id,'price',new.metadata->>'price',v_delta,new.occurred_at);
  perform private.gt_upsert_taste_dimension(new.auth_id,'neighborhood',new.metadata->>'neighborhood',v_delta,new.occurred_at);
  perform private.gt_upsert_taste_dimension(new.auth_id,'vibe',new.metadata->>'vibe',v_delta,new.occurred_at);
  if jsonb_typeof(new.metadata->'vibes')='array' then for v_vibe in select jsonb_array_elements_text(new.metadata->'vibes') loop perform private.gt_upsert_taste_dimension(new.auth_id,'vibe',v_vibe,v_delta,new.occurred_at); end loop; end if;
  return new;
end; $$;
revoke all on function private.gt_taste_signal_to_profile() from public, anon, authenticated;
drop trigger if exists gt_taste_signal_profile_trigger on public.gt_taste_signals;
create trigger gt_taste_signal_profile_trigger after insert on public.gt_taste_signals for each row execute function private.gt_taste_signal_to_profile();

create or replace view public.v_gt_shake_analytics_daily with (security_invoker=true) as
select date_trunc('day',occurred_at) day,city_slug,
count(*) filter(where event_name='shake_restaurant_result') results,
count(distinct auth_id) filter(where event_name='shake_restaurant_result') unique_users,
count(*) filter(where event_name='shake_restaurant_result' and properties->>'source'='motion') motion_results,
count(*) filter(where event_name='shake_restaurant_result' and properties->>'source'='tap') tap_results,
avg(nullif(properties->>'candidate_count','')::numeric) filter(where event_name='shake_restaurant_result') avg_candidate_pool
from public.gt_product_events where event_name like 'shake_%' group by 1,2;
revoke all on table public.v_gt_shake_analytics_daily from anon, authenticated;
grant select on table public.v_gt_shake_analytics_daily to service_role;

create or replace view public.v_gt_shake_funnel_daily with (security_invoker=true) as
select date_trunc('day',occurred_at) day,city_slug,
count(*) filter(where signal_type='shake_result') results,
count(*) filter(where signal_type='shake_accept') accepts,
count(*) filter(where signal_type='shake_reject') rejects,
case when count(*) filter(where signal_type in ('shake_accept','shake_reject'))>0 then round((count(*) filter(where signal_type='shake_accept'))::numeric/(count(*) filter(where signal_type in ('shake_accept','shake_reject')))::numeric,4) else null end decision_acceptance_rate,
count(distinct auth_id) unique_users
from public.gt_taste_signals where signal_type in ('shake_result','shake_accept','shake_reject') group by 1,2;
revoke all on table public.v_gt_shake_funnel_daily from anon, authenticated;
grant select on table public.v_gt_shake_funnel_daily to service_role;
