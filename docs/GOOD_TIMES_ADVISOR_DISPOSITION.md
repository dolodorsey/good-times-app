# Post-migration advisor disposition

Security and performance advisors were run after applying gt_compact_event_page_v1. The new function is bounded, read-only SECURITY INVOKER with fixed search_path, timeout, explicit public JSON projection, and the existing editorial/freshness gate. An anonymous-role verification returned 24 Atlanta rows; its transaction rolled back.

Findings concern unrelated khg policies/views, legacy mutable-search-path routines, extensions in public, a job log duplicate index and an unindexed gt_shows venue foreign key. No finding names the new function. This does not certify the whole shared project as finding-free. No prior full advisor snapshot was captured for a differential claim. Cross-brand objects were not edited. Actual query latency still requires measurement.

Rollback: drop function public.gt_compact_event_page_v1(date,date,text,text,text,date,uuid,integer,text,uuid[]); only after restoring compatible application reads. No existing listing, account or source schedule was changed by this function.
