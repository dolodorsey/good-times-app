-- PROPOSAL ONLY: not applied, not an auto-run migration.
-- After API recovery, permission/performance review, and approval, apply through
-- Supabase apply_migration and record its migration version. Never psql-patch prod ad hoc.
-- Atlanta only; every other city retains the current source behavior.
-- Existing output column names/types and security_invoker setting are preserved.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE OR REPLACE VIEW public.v_gt_venue_taxonomy_counts
WITH (security_invoker = true) AS
SELECT city_key, category_key, subcategory_key, count(DISTINCT id)::integer AS place_count
FROM public.v_gt_venue_taxonomy_directory
WHERE city_key = 'atlanta'
GROUP BY GROUPING SETS ((city_key,category_key),(city_key,category_key,subcategory_key))
UNION ALL
SELECT city_key, category_key, subcategory_key, count(DISTINCT id)::integer AS place_count
FROM public.mv_gt_venue_taxonomy_directory
WHERE city_key IS DISTINCT FROM 'atlanta'
GROUP BY GROUPING SETS ((city_key,category_key),(city_key,category_key,subcategory_key));
COMMIT;
-- Required after application: zero differences from audit query, curated date-night
-- membership included, exact zero handling in UI, unchanged other-city result sets,
-- anon/authenticated reads through intended policies, no new advisor findings,
-- latency budget and real desktop/mobile results. This does NOT fix invalid mappings,
-- venue reverification, source outages or frontend exact||fallback behavior.
