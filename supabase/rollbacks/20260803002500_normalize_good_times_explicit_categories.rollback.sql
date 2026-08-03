begin;

drop trigger if exists trg_gt_normalize_sourced_event_type
on public.gt_sourced_events;

drop function if exists public.gt_normalize_sourced_event_type();

commit;

-- Existing event_type values are intentionally preserved on rollback. Restoring
-- heuristic classifications would require reconstructing historical parser
-- context and could reintroduce proven misclassifications.
