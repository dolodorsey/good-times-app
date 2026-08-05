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

test('Atlanta gateway reads the bounded public feed and active venue inventory', () => {
  const queries = buildGatewayQueries({
    city: 'atlanta',
    today: '2026-08-05',
    eventLimit: 500,
    venueLimit: 400,
  })
  assert.match(queries.eventPath, /^gt_public_atlanta_feed\?/)
  assert.match(queries.eventPath, /event_date=gte\.2026-08-05/)
  assert.match(queries.venuePath, /^gt_venues\?/)
  assert.match(queries.venuePath, /status=eq\.active/)
  assert.match(queries.venuePath, /hero_image=not\.is\.null/)
})

test('Frontend uses the same-origin data gateway with direct Supabase fallback', () => {
  const client = read('src/features/intelligence/client.js')
  assert.match(client, /\/api\/data\?city=/)
  assert.match(client, /Same-origin event gateway failed; using direct public feed/)
  assert.match(client, /Same-origin venue gateway failed; using direct public feed/)
  assert.match(client, /gt_public_atlanta_feed/)
})

test('PWA update policy removes the permanent v1 shell cache', () => {
  const worker = read('public/sw.js')
  const main = read('src/main.jsx')
  assert.doesNotMatch(worker, /good-times-shell-v1/)
  assert.match(worker, /good-times-shell-v3/)
  assert.match(worker, /GOOD_TIMES_FORCE_RELOAD/)
  assert.match(worker, /client\.navigate\(client\.url\)/)
  assert.match(main, /updateViaCache: 'none'/)
  assert.match(main, /VITE_VERCEL_GIT_COMMIT_SHA/)
})
