import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildGatewayQueries, clampLimit, normalizeCity } from '../api/data.js'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('GOOD TIMES data gateway canonicalizes city values and caps public limits', () => {
  assert.equal(normalizeCity('Atlanta'), 'atlanta')
  assert.equal(normalizeCity('Los Angeles'), 'los_angeles')
  assert.equal(normalizeCity('unknown city'), 'atlanta')
  assert.equal(clampLimit('9999', 500, 500), 500)
  assert.equal(clampLimit('0', 400, 400), 400)
})

test('Atlanta customer gateway reads bounded current shows and verified venues', () => {
  const queries = buildGatewayQueries({
    city: 'atlanta',
    today: '2026-08-06',
    eventLimit: 500,
    venueLimit: 400,
  })
  assert.match(queries.eventPath, /^gt_shows\?/)
  assert.match(queries.eventPath, /city_key=eq\.atlanta/)
  assert.match(queries.eventPath, /show_date=gte\.2026-08-06/)
  assert.match(queries.eventPath, /status=in\.\(confirmed,tentative\)/)
  assert.match(queries.venuePath, /^gt_venues\?/)
  assert.match(queries.venuePath, /status=eq\.active/)
})

test('Frontend uses same-origin customer inventory before any direct fallback', () => {
  const client = read('src/features/intelligence/client.js')
  assert.match(client, /\/api\/data\?city=/)
  assert.match(client, /Same-origin event gateway failed; using direct public feed/)
  assert.match(client, /Same-origin venue gateway failed; using direct public feed/)
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
