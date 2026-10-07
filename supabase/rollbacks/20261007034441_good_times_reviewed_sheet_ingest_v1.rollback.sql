begin;
-- Preserve approved data changes and their receipts. Revert an individual applied change only
-- after comparing its after_values with the current row and reviewing a new explicit patch.
drop function if exists public.gt_apply_reviewed_listing_changes_v1(text,text,jsonb,boolean);
-- The source promoter also uses this scoped editorial guard. Retain it while that
-- promoter is active; its marker-free behavior is a no-op. Remove the shared trigger
-- and helper only after restoring the prior promoter in the coordinated core rollback.
commit;
