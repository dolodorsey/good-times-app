import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')
const app=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV2.jsx',import.meta.url),'utf8')
const hardening=fs.readFileSync(new URL('../src/features/experience/good-times-v2-hardening.css',import.meta.url),'utf8')
const launch=fs.readFileSync(new URL('../src/current-media.css',import.meta.url),'utf8')
const mediaSql=fs.readFileSync(new URL('../supabase/support-migrations/20260830_good_times_hard_media_and_event_dedupe.sql',import.meta.url),'utf8')

test('V2 uses one app navigation and does not mount floating legacy utility systems',()=>{
  assert.match(app,/gt3-mobile-nav/)
  assert.match(hardening,/\.gt3-mobile-nav[\s\S]*display:grid!important/)
  assert.doesNotMatch(main,/LazyUtilityMenu/)
  assert.doesNotMatch(main,/LazyPaymentsLauncher/)
  assert.doesNotMatch(main,/LazyConnectHub/)
  assert.doesNotMatch(main,/LazyAccountCenter/)
  assert.doesNotMatch(main,/GoodTimesShellControl/)
})

test('Home and launch expose the approved current motion and current poster only',()=>{
  assert.match(main,/motion\/goodtimes\.jpg/)
  assert.match(main,/kollective\/animations\/GOODTIMES\.mp4/)
  assert.doesNotMatch(main,/GOODTIMES_HOMESCREEN\.png/)
  assert.doesNotMatch(main,/GOOD_TIMES_ANIMATION\.mp4/)
  assert.match(launch,/brand-graphics\/motion\/goodtimes\.jpg/)
  assert.doesNotMatch(launch,/GOODTIMES_HOMESCREEN\.png/)
})

test('venue hero duplication is prevented at the database write boundary',()=>{
  assert.match(mediaSql,/gt_enforce_unique_venue_hero/)
  assert.match(mediaSql,/trg_gt_enforce_unique_venue_hero/)
  assert.match(mediaSql,/gt_venues_active_unique_hero_fingerprint_uidx/)
  assert.match(mediaSql,/generic_or_stock_hero_blocked/)
  assert.match(mediaSql,/duplicate_venue_hero_blocked/)
})

test('live event identity duplication is removed before customer reads',()=>{
  assert.match(mediaSql,/create or replace view public\.v_gt_events_live/)
  assert.match(mediaSql,/row_number\(\) over/)
  assert.match(mediaSql,/identity_rank=1/)
})
