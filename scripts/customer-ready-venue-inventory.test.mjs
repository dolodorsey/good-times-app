import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync(new URL('../supabase/migrations/20260810034900_expand_customer_ready_venue_inventory.sql',import.meta.url),'utf8')

test('public venue policy stays strict while admitting strong GOOD TIMES culture signals',()=>{
  assert.match(sql,/status = 'active'/)
  assert.match(sql,/is_verified is true/)
  assert.match(sql,/hero_image is not null/)
  assert.match(sql,/coalesce\(quality_score,0\) >= 55/)
  assert.match(sql,/is_culture_pick is true/)
  assert.match(sql,/is_black_owned is true/)
  assert.match(sql,/LOCATION_IMAGES/)
  assert.match(sql,/latitude is not null and longitude is not null/)
  assert.match(sql,/booking_link/)
})

test('live inventory ranks approved GOOD TIMES photography before generic venue media',()=>{
  const approved=sql.indexOf("hero_image like '%/brand-graphics/good_times/graphics/LOCATION_IMAGES/%'")
  const culture=sql.indexOf('is_culture_pick desc')
  const quality=sql.indexOf('quality_score desc nulls last')
  assert.ok(approved>=0)
  assert.ok(culture>approved)
  assert.ok(quality>culture)
})
