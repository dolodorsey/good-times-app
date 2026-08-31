-- The cache refresh and its public-read policy are one customer contract. Keep
-- verified 55+ actionable places visible even when branded fallback art is used.
drop policy if exists "gt directory cache public read"
on public.gt_venue_taxonomy_directory_cache;

create policy "gt directory cache public read"
on public.gt_venue_taxonomy_directory_cache
for select
to anon, authenticated
using (
  status = 'active'
  and coalesce(quality_score, 0) >= 55
  and (
    nullif(btrim(address), '') is not null
    or (latitude is not null and longitude is not null)
  )
  and (
    nullif(btrim(website), '') is not null
    or nullif(btrim(phone), '') is not null
    or nullif(btrim(booking_link), '') is not null
    or nullif(btrim(instagram_handle), '') is not null
  )
);

-- These are public read models, not client-write tables.
revoke all on public.gt_venue_taxonomy_directory_cache from anon, authenticated;
revoke all on public.gt_venue_taxonomy_count_cache from anon, authenticated;
grant select on public.gt_venue_taxonomy_directory_cache to anon, authenticated;
grant select on public.gt_venue_taxonomy_count_cache to anon, authenticated;
