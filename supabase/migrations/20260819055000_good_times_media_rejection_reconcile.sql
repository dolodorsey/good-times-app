-- Reconcile legacy verification verdicts with the new media candidate ledger.
-- Some subject/url pairs already existed as current_record candidates before queue evidence was imported.

update public.gt_media_candidates c
set status='rejected',
    source_type=coalesce(nullif(q.source,''),c.source_type),
    source_name=coalesce(nullif(q.source,''),c.source_name),
    is_stock=(lower(coalesce(q.source,'')) in ('stock','unsplash','pexels')) or c.is_stock,
    rejection_reason=case
      when lower(coalesce(q.source,''))='stock'
        then 'Stock imagery may not impersonate a real GOOD TIMES venue. Source verified real photography instead.'
      when lower(coalesce(q.source,''))='perplexity_scout'
        then 'Retired/disallowed GOOD TIMES source. Re-source through current authoritative or direct channels.'
      else coalesce(q.rejection_reason,c.rejection_reason)
    end,
    metadata=coalesce(c.metadata,'{}'::jsonb) || jsonb_build_object(
      'verification_queue_id',q.id,
      'reconciled_from_verdict',q.verdict,
      'reconciled_at',now()
    ),
    updated_at=now()
from public.gt_image_verification_queue q
where q.subject_type=c.subject_type
  and q.subject_id=c.subject_id
  and q.current_image_url=c.url
  and q.verdict='rejected'
  and lower(coalesce(q.source,'')) in ('stock','perplexity_scout')
  and c.status<>'rejected';
