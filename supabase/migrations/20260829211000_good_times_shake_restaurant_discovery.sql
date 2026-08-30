alter table public.gt_venues
  add column if not exists shake_enabled boolean not null default true,
  add column if not exists shake_weight numeric(6,3) not null default 1.000,
  add column if not exists shake_tags text[] not null default '{}',
  add column if not exists amenity_tags text[] not null default '{}',
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists ownership_tags text[] not null default '{}';

comment on column public.gt_venues.shake_enabled is 'Eligibility override for GOOD TIMES Shake restaurant discovery.';
comment on column public.gt_venues.shake_weight is 'Editorial multiplier for weighted random Shake selection; does not replace canonical quality scoring.';
comment on column public.gt_venues.shake_tags is 'Curated discovery tags used only for Shake filters.';
comment on column public.gt_venues.amenity_tags is 'Verified amenity tags such as patio, full_bar, live_music, dj, hookah.';
comment on column public.gt_venues.dietary_tags is 'Verified dietary tags such as vegan, vegetarian, halal, gluten_free.';
comment on column public.gt_venues.ownership_tags is 'Verified ownership tags such as black_owned, woman_owned, latino_owned.';

create index if not exists gt_venues_shake_city_idx
  on public.gt_venues (city_key, status, category_key, shake_enabled)
  where shake_enabled = true;
create index if not exists gt_venues_shake_tags_gin_idx on public.gt_venues using gin (shake_tags);
create index if not exists gt_venues_amenity_tags_gin_idx on public.gt_venues using gin (amenity_tags);
create index if not exists gt_venues_dietary_tags_gin_idx on public.gt_venues using gin (dietary_tags);
create index if not exists gt_venues_ownership_tags_gin_idx on public.gt_venues using gin (ownership_tags);
