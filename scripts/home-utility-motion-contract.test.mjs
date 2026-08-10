import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const responsive=fs.readFileSync(new URL('../src/features/experience/good-times-responsive-contract.css',import.meta.url),'utf8')
const utilities=fs.readFileSync(new URL('../src/features/experience/good-times-mobile-utilities.css',import.meta.url),'utf8')
const utilityComponent=fs.readFileSync(new URL('../src/features/experience/GoodTimesUtilityMenu.jsx',import.meta.url),'utf8')
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')
const launch=fs.readFileSync(new URL('../src/current-media.css',import.meta.url),'utf8')
const venueSql=fs.readFileSync(new URL('../supabase/migrations/20260810041700_dedupe_live_venue_photography.sql',import.meta.url),'utf8')

test('mobile member utilities collapse into one 44px orb instead of permanent desktop pills',()=>{
  assert.match(responsive,/aria-label="Open GOOD TIMES account"\]\{\n    display:none!important/)
  assert.match(utilities,/\.gt-mobile-utilities__orb\{\n    width:44px;height:44px/)
  assert.match(utilityComponent,/Open GOOD TIMES utilities/)
  assert.match(utilityComponent,/\.gt-connect-fab/)
  assert.match(utilityComponent,/gt:open-payments/)
  assert.match(utilityComponent,/Open GOOD TIMES account/)
  assert.match(main,/LazyUtilityMenu/)
})

test('Home and launch expose the approved current motion and current poster only',()=>{
  assert.match(responsive,/\.gt-rich-video\{\n  opacity:\.42!important/)
  assert.match(responsive,/var\(--gt-current-home\) center\/cover!important/)
  assert.doesNotMatch(responsive,/GOODTIMES_HOMESCREEN\.png/)
  assert.match(main,/motion\/goodtimes\.jpg/)
  assert.match(main,/kollective\/animations\/GOODTIMES\.mp4/)
  assert.doesNotMatch(main,/GOODTIMES_HOMESCREEN\.png/)
  assert.doesNotMatch(main,/GOOD_TIMES_ANIMATION\.mp4/)
  assert.match(launch,/brand-graphics\/motion\/goodtimes\.jpg/)
  assert.doesNotMatch(launch,/GOODTIMES_HOMESCREEN\.png/)
})

test('live venue payload keeps one strongest customer card per hero image',()=>{
  assert.match(venueSql,/row_number\(\) over/)
  assert.match(venueSql,/partition by hero_image/)
  assert.match(venueSql,/where image_rank = 1/)
  assert.match(venueSql,/LOCATION_IMAGES/)
})
