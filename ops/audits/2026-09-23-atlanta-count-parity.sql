-- Read-only diagnostics. Canonical project: dzlmtvodpyhetvektfuo.
-- SQL result counts are not a rendered UI or public-role certification.
WITH actual AS (
 SELECT city_key, category_key, subcategory_key, count(DISTINCT id)::integer AS place_count
 FROM public.v_gt_venue_taxonomy_directory
 WHERE city_key = 'atlanta'
 GROUP BY GROUPING SETS ((city_key,category_key),(city_key,category_key,subcategory_key))
), displayed AS (
 SELECT * FROM public.v_gt_venue_taxonomy_counts WHERE city_key = 'atlanta'
)
SELECT coalesce(d.category_key,a.category_key) AS category_key,
 coalesce(d.subcategory_key,a.subcategory_key) AS subcategory_key,
 coalesce(d.place_count,0) AS count_endpoint,
 coalesce(a.place_count,0) AS current_directory
FROM displayed d FULL JOIN actual a
 ON d.city_key=a.city_key AND d.category_key=a.category_key
 AND d.subcategory_key IS NOT DISTINCT FROM a.subcategory_key
WHERE coalesce(d.place_count,0) <> coalesce(a.place_count,0)
ORDER BY 1,2;

-- Reverification backlog: do not resolve by extending expiry without evidence.
SELECT status, verification_status, count(*) AS record_count,
 count(*) FILTER (WHERE freshness_expires_at <= now()) AS expired,
 count(*) FILTER (WHERE freshness_expires_at IS NULL) AS no_expiry
FROM public.gt_venues WHERE city_key='atlanta'
GROUP BY status,verification_status ORDER BY 1,2;

-- Source work age, not cache generation time.
SELECT count(*) AS rows, min(updated_at) AS oldest, max(updated_at) AS newest,
 count(*) FILTER (WHERE next_action_at<now() AND status<>'resolved') AS unresolved_overdue
FROM public.gt_taxonomy_sourcing_queue WHERE city_key='atlanta';

-- Required concrete discovery coverage. Dessert keys are proposed, not active claims.
WITH requested(category_key,subcategory_key) AS (VALUES
 ('nightlife','nightclubs'),('nightlife','lounges'),('nightlife','rooftop_nights'),
 ('dating_social','date_night'),('dining_culinary','dessert_spots'),
 ('dining_culinary','bakeries_pastries'),('dining_culinary','ice_cream_frozen_treats'))
SELECT r.*, coalesce(s.is_active,false) AS category_defined,
 count(DISTINCT d.id) AS live_venues
FROM requested r LEFT JOIN public.gt_taxonomy_subcategories s
 ON s.category_key=r.category_key AND s.subcategory_key=r.subcategory_key
LEFT JOIN public.v_gt_venue_taxonomy_directory d
 ON d.city_key='atlanta' AND d.category_key=r.category_key AND d.subcategory_key=r.subcategory_key
GROUP BY r.category_key,r.subcategory_key,s.is_active ORDER BY 1,2;
