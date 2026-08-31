import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const catalog=fs.readFileSync(new URL('../api/catalog.js',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../supabase/migrations/20260831084234_repair_place_taxonomy_and_catalog_inventory.sql',import.meta.url),'utf8')
const publicReadPolicy=fs.readFileSync(new URL('../supabase/migrations/20260831130700_align_catalog_cache_public_read_policy.sql',import.meta.url),'utf8')

test('place directory admits verified actionable inventory without requiring photos',()=>{
  assert.match(catalog,/quality_score \|\| 0\) < 55/)
  assert.match(catalog,/row\.address,row\.website,row\.phone,row\.booking_link,row\.instagram_handle/)
  assert.doesNotMatch(catalog,/!hasValue\(row\.hero_image\)/)
  assert.match(catalog,/MAX_DIRECTORY_ROWS = 2500/)
  assert.match(publicReadPolicy,/coalesce\(quality_score, 0\) >= 55/)
  assert.doesNotMatch(publicReadPolicy,/hero_image is not null/)
  assert.match(publicReadPolicy,/grant select on public\.gt_venue_taxonomy_directory_cache/)
})

test('standing food trucks and food halls cannot appear as food festivals',()=>{
  assert.match(catalog,/isStandingPlaceInEventOnlyLane/)
  assert.match(catalog,/\['food_truck','food_hall'\]/)
  assert.match(migration,/venue_category_key in \('food_truck', 'food_hall'\)/)
  assert.match(migration,/category_key = 'festivals_major_activations'/)
  assert.match(migration,/subcategory_key = 'food_festivals'/)
})
