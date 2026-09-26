import test from 'node:test'
import assert from 'node:assert/strict'
import {validateCacheResult,renderSnapshotModule,parseSnapshotModule,serviceDateFor,MIN_EVENTS,MIN_VENUES} from './refresh-atlanta-fallback-snapshot.mjs'

const ev=i=>({id:`e${i}`,city_key:'atlanta',event_name:`Show ${i}`,venue_name:'Fox Theatre',show_date:'2026-10-02',status:'confirmed'})
const vn=i=>({id:`v${i}`,name:`Venue ${i}`,city_key:'atlanta'})
const good=(e=MIN_EVENTS,v=MIN_VENUES)=>({ok:true,city:'atlanta',is_fresh:true,is_service_date_match:true,service_date:'2026-10-02',cache_refreshed_at:'2026-10-02T10:00:00+00:00',payload:{events:Array.from({length:e},(_,i)=>ev(i)),venues:Array.from({length:v},(_,i)=>vn(i))}})

test('snapshot refresher accepts a fresh, Atlanta-only, schema-complete cache',()=>{
  assert.deepEqual(validateCacheResult(good(),{serviceDate:'2026-10-02'}),[])
})
test('snapshot refresher refuses stale, mismatched or non-ok cache results',()=>{
  assert.ok(validateCacheResult({...good(),is_fresh:false}).length)
  assert.ok(validateCacheResult({...good(),is_service_date_match:false}).length)
  assert.ok(validateCacheResult({...good(),ok:false}).length)
  assert.ok(validateCacheResult(good(),{serviceDate:'2026-10-03'}).length)
})
test('snapshot refresher refuses any wrong-city row (P0)',()=>{
  const r=good();r.payload.venues[0].city_key='new_york'
  assert.match(validateCacheResult(r).join(' '),/wrong-city/)
})
test('snapshot refresher refuses thin or collapsed inventory',()=>{
  assert.ok(validateCacheResult(good(MIN_EVENTS-1)).length)
  assert.ok(validateCacheResult(good(MIN_EVENTS,MIN_VENUES-1)).length)
  const previous={events:Array(100).fill(0),venues:Array(200).fill(0)}
  assert.match(validateCacheResult(good(40,150),{previous}).join(' '),/event count collapse/)
})
test('snapshot refresher refuses rows missing required fields',()=>{
  const r=good();delete r.payload.events[3].show_date
  assert.match(validateCacheResult(r).join(' '),/missing key show_date/)
})
test('rendered snapshot module round-trips and carries refreshed_at/service_date',()=>{
  const mod=renderSnapshotModule(good())
  assert.match(mod,/export const ATLANTA_FALLBACK_SNAPSHOT = /)
  assert.match(mod,/export default ATLANTA_FALLBACK_SNAPSHOT/)
  const parsed=parseSnapshotModule(mod)
  assert.equal(parsed.city,'atlanta');assert.equal(parsed.refreshed_at,'2026-10-02T10:00:00+00:00');assert.equal(parsed.service_date,'2026-10-02')
  assert.equal(parsed.events.length,MIN_EVENTS);assert.equal(parsed.venues.length,MIN_VENUES)
})
test('service date rolls back before 4am Atlanta (nightlife service day)',()=>{
  assert.equal(serviceDateFor(new Date('2026-10-03T06:30:00Z')),'2026-10-02') // 2:30am EDT
  assert.equal(serviceDateFor(new Date('2026-10-03T09:30:00Z')),'2026-10-03') // 5:30am EDT
})
