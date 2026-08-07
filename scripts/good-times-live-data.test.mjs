import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildGatewayQueries, clampLimit, getEventFreshness, inferCustomerCategory, inferCustomerTaxonomy, normalizeCity } from '../api/data.js'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('GOOD TIMES data gateway canonicalizes city values and caps public limits', () => {
  assert.equal(normalizeCity('Atlanta'), 'atlanta')
  assert.equal(normalizeCity('Los Angeles'), 'los_angeles')
  assert.equal(normalizeCity('unknown city'), 'atlanta')
  assert.equal(clampLimit('9999', 500, 500), 500)
  assert.equal(clampLimit('0', 400, 400), 400)
})

test('Atlanta customer gateway reads bounded current shows and verified venues', () => {
  const queries = buildGatewayQueries({ city:'atlanta', today:'2026-08-06', eventLimit:500, venueLimit:400 })
  assert.match(queries.eventPath, /^gt_shows\?/)
  assert.match(queries.eventPath, /city_key=eq\.atlanta/)
  assert.match(queries.eventPath, /show_date=gte\.2026-08-06/)
  assert.match(queries.eventPath, /status=in\.\(confirmed,tentative\)/)
  assert.match(queries.eventPath, /updated_at/)
  assert.doesNotMatch(queries.eventPath, /category_key_v2=not\.is\.null/)
  assert.match(queries.venuePath, /^gt_venues\?/)
  assert.match(queries.venuePath, /is_verified=eq\.true/)
})

test('event freshness fails closed after 72 hours', () => {
  const now = new Date('2026-08-07T22:00:00.000Z')
  const fresh = getEventFreshness([{ updated_at:'2026-08-07T21:00:00.000Z' }], now)
  const stale = getEventFreshness([{ updated_at:'2026-08-03T21:00:00.000Z' }], now)
  const empty = getEventFreshness([], now)
  assert.equal(fresh.status, 'live')
  assert.equal(fresh.live, true)
  assert.equal(stale.status, 'stale')
  assert.equal(stale.live, false)
  assert.equal(empty.status, 'empty')
  assert.equal(empty.live, false)
})

test('legacy cross-city events receive conservative customer categories', () => {
  assert.equal(inferCustomerCategory({ event_name:'Duelo', event_type:'concert' }), 'concerts_live_music')
  assert.equal(inferCustomerCategory({ event_name:'Underground Rave', event_type:'special_event' }), 'nightlife')
  assert.equal(inferCustomerCategory({ event_name:'Houston Black College Expo', event_type:'special_event' }), 'business_professional')
  assert.equal(inferCustomerCategory({ event_name:'Unknown listing', event_type:'special_event' }), null)
})

test('arena concerts do not inherit the intimate-shows fallback', () => {
  assert.deepEqual(
    inferCustomerTaxonomy({ event_name:'Ariana Grande', event_type:'concert', venue_name:'State Farm Arena', subcategory_key_v2:'intimate_shows' }),
    { category:'concerts_live_music', subcategory:'arena_concerts' },
  )
})

test('Frontend uses same-origin customer inventory and no expensive public-feed fallback', () => {
  const client = read('src/features/intelligence/client.js')
  assert.match(client, /\/api\/data\?city=/)
  assert.match(client, /Same-origin event gateway failed; using direct public feed/)
  assert.match(client, /Same-origin venue gateway failed; using direct public feed/)
  assert.doesNotMatch(client, /gt_public_atlanta_feed/)
})

test('Service worker is retired and customer bootstrap does not register it', () => {
  const worker = read('public/sw.js')
  const main = read('src/main.jsx')
  assert.match(worker, /registration\.unregister\(\)/)
  assert.doesNotMatch(worker, /client\.navigate/)
  assert.doesNotMatch(worker, /GOOD_TIMES_FORCE_RELOAD/)
  assert.doesNotMatch(main, /navigator\.serviceWorker\.register/)
  assert.doesNotMatch(main, /React\.StrictMode/)
})
