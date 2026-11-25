-- GOOD TIMES · Atlanta editorial selector admits confirmed + fresh official-source events (owner-approved 2026-10-29)
-- Root cause: the public Atlanta event feed (RLS "Atlanta public recommendations require editorial selection")
-- had shrunk to 1–12 events for two weeks. gt_refresh_atlanta_editorial_v1 only admitted events whose latest
-- evidence row was eligible=true, while the evidence pipeline now records most official-source confirmations as
-- eligible=false / reason 'verified_candidate_not_homepage_guarantee'.
-- Change (two predicates only): also admit when the latest evidence is event_status='confirmed', verified within
-- 24h, and its reason starts with 'verified' or 'official'. Every other gate is unchanged: status confirmed, real
-- https ticket + image, explicit time, GOOD TIMES score >= 60 (58 comedy), updated < 72h, noise filters,
-- repeat/category caps, 112 maximum. Result on apply: 7 -> 56 selected.
-- Applied to dzlmtvodpyhetvektfuo as gt_editorial_admit_confirmed_fresh_official_v1 (+ _fix adding `reason` to the
-- evidence lateral). The prior definition is stored in gt_private.gt_function_snapshots for rollback:
--   select definition from gt_private.gt_function_snapshots
--   where fn='public.gt_refresh_atlanta_editorial_v1()'::regprocedure order by captured_at desc limit 1;  -- then execute it

create table if not exists gt_private.gt_function_snapshots (id bigint generated always as identity primary key, fn regprocedure not null, captured_at timestamptz not null default now(), reason text, definition text not null);
revoke all on gt_private.gt_function_snapshots from anon, authenticated;

do $$
declare
  d text := pg_get_functiondef('public.gt_refresh_atlanta_editorial_v1'::regproc);
  a0 text := 'left join lateral(select verified_at,eligible,event_status from gt_atlanta_event_evidence_v1 where show_id=s.id order by verified_at desc limit 1)ev on true';
  b0 text := 'left join lateral(select verified_at,eligible,event_status,reason from gt_atlanta_event_evidence_v1 where show_id=s.id order by verified_at desc limit 1)ev on true';
  a1 text := 'and (s.is_curated or coalesce(ev.eligible,false)) and';
  b1 text := 'and (s.is_curated or coalesce(ev.eligible,false) or (ev.event_status=''confirmed'' and ev.verified_at>now()-interval ''24 hours'' and coalesce(ev.reason,'''') ~ ''^(verified|official)'')) /* admit_confirmed_fresh_official_v1 */ and';
  a2 text := 'and (ev.verified_at is null or (ev.eligible and ev.event_status=''confirmed'' and ev.verified_at>now()-interval ''24 hours''))';
  b2 text := 'and (ev.verified_at is null or ((ev.eligible or coalesce(ev.reason,'''') ~ ''^(verified|official)'') and ev.event_status=''confirmed'' and ev.verified_at>now()-interval ''24 hours''))';
begin
  if position('admit_confirmed_fresh_official_v1' in d) > 0 then return; end if;  -- idempotent
  insert into gt_private.gt_function_snapshots(fn,reason,definition) values ('public.gt_refresh_atlanta_editorial_v1'::regproc::regprocedure,'before admit_confirmed_fresh_official_v1',d);
  execute replace(replace(replace(d,a0,b0),a1,b1),a2,b2);
end $$;
