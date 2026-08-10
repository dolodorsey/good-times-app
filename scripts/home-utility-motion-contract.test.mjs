import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const responsive=fs.readFileSync(new URL('../src/features/experience/good-times-responsive-contract.css',import.meta.url),'utf8')
const venueSql=fs.readFileSync(new URL('../supabase/migrations/20260810041700_dedupe_live_venue_photography.sql',import.meta.url),'utf8')

test('mobile member utilities are compact 44px controls instead of desktop pills',()=>{
  assert.match(responsive,/width:44px!important/)
  assert.match(responsive,/height:44px!important/)
  assert.match(responsive,/\.gt-connect-fab>b\{display:none!important\}/)
  assert.match(responsive,/aria-label="Tickets and paid experiences"\]\{right:66px!important/)
  assert.match(responsive,/aria-label="Open GOOD TIMES account"\]\{right:14px!important/)
})

test('Home exposes the approved current motion and removes retired launch-strip art',()=>{
  assert.match(responsive,/\.gt-rich-video\{\n  opacity:\.42!important/)
  assert.match(responsive,/var\(--gt-current-home\) center\/cover!important/)
  assert.doesNotMatch(responsive,/GOODTIMES_HOMESCREEN\.png/)
})

test('live venue payload keeps one strongest customer card per hero image',()=>{
  assert.match(venueSql,/row_number\(\) over/)
  assert.match(venueSql,/partition by hero_image/)
  assert.match(venueSql,/where image_rank = 1/)
  assert.match(venueSql,/LOCATION_IMAGES/)
})
