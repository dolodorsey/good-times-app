-- Exact pre-audit count-view definition with original security_invoker option.
-- Rollback only the proposed count change; no venue data/permissions are altered.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
CREATE OR REPLACE VIEW public.v_gt_venue_taxonomy_counts
WITH (security_invoker=true) AS
SELECT city_key,category_key,subcategory_key,count(DISTINCT id)::integer AS place_count
FROM public.mv_gt_venue_taxonomy_directory
GROUP BY GROUPING SETS ((city_key,category_key),(city_key,category_key,subcategory_key));
COMMIT;
