-- Correct two source identities that were promoted from a generic Google type.
-- Official business pages identify Publik as a draft house / restaurant and
-- Metro as a diner, bar, karaoke room and late-night dance venue. Neither is a
-- nightclub. The customer API also keeps a defensive identity check so future
-- imports cannot silently recreate this contradiction.
update public.gt_venues
set category_key = 'bar',
    subcategory = 'cocktail_bar',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'taxonomy_corrected_at', now(),
      'taxonomy_correction_reason', 'Official site identifies a draft house, bar and restaurant, not a nightclub.',
      'taxonomy_evidence_url', 'https://www.publik654.com/'
    ),
    updated_at = now()
where id = '022153d5-8158-4fde-bd24-99b179576586'::uuid
  and city_key = 'atlanta'
  and name = 'Publik Draft House';

update public.gt_venues
set category_key = 'bar',
    subcategory = 'karaoke',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'taxonomy_corrected_at', now(),
      'taxonomy_correction_reason', 'Official site identifies a diner, karaoke bar and late-night dance venue, not a nightclub.',
      'taxonomy_evidence_url', 'https://metrodineratl.com/'
    ),
    updated_at = now()
where id = 'e5a137f9-3393-4c7c-95aa-530cc182317d'::uuid
  and city_key = 'atlanta'
  and name = 'Metro Diner and Bar';

refresh materialized view public.mv_gt_venue_taxonomy_directory;
select public.gt_refresh_venue_taxonomy_directory_cache();
