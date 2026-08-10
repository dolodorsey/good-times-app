import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { cityClock } from '../api/data-live.js'

const fastSource=fs.readFileSync(new URL('../api/data-fast.js',import.meta.url),'utf8')
const liveSource=fs.readFileSync(new URL('../api/data-live.js',import.meta.url),'utf8')

test('Atlanta uses its local calendar date instead of UTC for tonight',()=>{
  const clock=cityClock('atlanta',new Date('2026-08-10T02:39:00Z'))
  assert.equal(clock.timeZone,'America/New_York')
  assert.equal(clock.calendarDate,'2026-08-09')
  assert.equal(clock.serviceDate,'2026-08-09')
  assert.equal(clock.hour,22)
  assert.equal(clock.minute,39)
})

test('GOOD TIMES keeps the previous nightlife service date through 4 AM local',()=>{
  const clock=cityClock('atlanta',new Date('2026-08-10T05:15:00Z'))
  assert.equal(clock.calendarDate,'2026-08-10')
  assert.equal(clock.serviceDate,'2026-08-09')
  assert.equal(clock.hour,1)
})

test('fast gateway fetches the local service date first and drops stale same-day inventory',()=>{
  assert.match(liveSource,/show_date=gte\.\$\{clock\.serviceDate\}/)
  assert.match(liveSource,/order=show_date\.asc,good_times_score\.desc\.nullslast,display_priority\.asc\.nullslast/)
  assert.match(liveSource,/isStaleServiceDayEvent/)
  assert.match(liveSource,/clock\.serviceMinute-\(6\*60\)/)
  assert.match(liveSource,/X-Good-Times-Live-Gateway','v5'/)
})

test('personalization cannot move a future date ahead of the current nightlife service date',()=>{
  assert.match(fastSource,/serviceDate=payload\?\.local_clock\?\.service_date\|\|cityClock\(city\)\.serviceDate/)
  assert.match(fastSource,/const date=String\(a\.item\?\.event_date\|\|''\)\.localeCompare\(String\(b\.item\?\.event_date\|\|''\)\)/)
  assert.match(fastSource,/sameNightPriority\(a\.item,serviceDate\)-sameNightPriority\(b\.item,serviceDate\)/)
  assert.match(fastSource,/service-date-then-nightlife-then-taste/)
})
