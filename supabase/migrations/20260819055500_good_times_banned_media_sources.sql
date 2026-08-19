-- GOOD TIMES banned media/source quarantine.
-- Retain evidence, but never let retired provider output or stock imagery impersonating real entities remain publishable.

update public.gt_media_candidates
set status='rejected',
    rejection_reason=case
      when lower(source_type)='perplexity_scout'
        then 'Retired/disallowed GOOD TIMES provider. Retained as evidence only; re-source through current direct or authoritative channels.'
      else 'Stock or generic library imagery may not impersonate a real GOOD TIMES venue or event. Source truthful verified media.'
    end,
    updated_at=now()
where status in ('candidate','approved','quarantined')
  and (
    lower(source_type)='perplexity_scout'
    or lower(source_type) in ('stock','unsplash','pexels')
  );

comment on table public.gt_media_candidates is
  'Internal GOOD TIMES visual candidate ledger. Retired provider and generic stock candidates remain stored as rejected evidence only.';
