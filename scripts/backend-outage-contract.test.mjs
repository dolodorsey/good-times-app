import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getGoodTimesHealth } from '../api/health.js'

const repoFile = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function jsonResponse(payload, ok = true, status = ok ? 200 : 503) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Service Unavailable',
    async json() { return payload },
    async text() { return JSON.stringify(payload) },
  }
}

test('GOOD TIMES health requires both exact service planes', async () => {
  const calls = []
  const health = await getGoodTimesHealth(async (url) => {
    calls.push(String(url))
    return jsonResponse([{ id: 'fixture' }])
  })

  assert.equal(health.ok, true)
  assert.equal(health.service, 'good-times')
  assert.equal(health.customer_ready, true)
  assert.equal(health.content_ready, true)
  assert.equal(calls.length, 2)
  assert.match(calls[0], /^https:\/\/czocqfaovfpjweayniuw\.supabase\.co\/rest\/v1\/gt_formula_versions\?select=id&limit=1$/)
  assert.match(calls[1], /^https:\/\/dzlmtvodpyhetvektfuo\.supabase\.co\/rest\/v1\/gt_venues\?select=id&status=eq\.active&limit=1$/)
})

test('GOOD TIMES health fails closed when either required plane is unavailable', async () => {
  const health = await getGoodTimesHealth(async (url) => {
    if (String(url).includes('czocqfaovfpjweayniuw')) return jsonResponse([])
    return jsonResponse([{ id: 'venue-fixture' }])
  })

  assert.equal(health.ok, false)
  assert.equal(health.customer_ready, false)
  assert.equal(health.content_ready, true)
})

test('GOOD TIMES runtime cannot mount before the service gate resolves', async () => {
  const [index, entry, guard, healthApi] = await Promise.all([
    repoFile('index.html'),
    repoFile('src/stabilized-entry.jsx'),
    repoFile('public/gt-service-guard.js'),
    repoFile('api/health.js'),
  ])

  const stabilizerPos = index.indexOf('/gt-stabilizer.js')
  const serviceGuardPos = index.indexOf('/gt-service-guard.js')
  const entryPos = index.indexOf('/src/stabilized-entry.jsx')
  assert.ok(stabilizerPos >= 0 && serviceGuardPos > stabilizerPos && entryPos > serviceGuardPos)
  assert.match(entry, /__GOOD_TIMES_SERVICE_READY__/)
  assert.match(entry, /serviceState\?\.ready !== false/)
  assert.match(guard, /LIVE SERVICE TEMPORARILY PAUSED/)
  assert.match(guard, /No request or account change was submitted\./)
  assert.match(guard, /Check status again/)
  assert.match(guard, /\/support\.html/)
  assert.match(guard, /\/privacy\.html/)
  assert.match(guard, /CLIENT_TIMEOUT_MS = 5000/)
  assert.match(healthApi, /HEALTH_TIMEOUT_MS = 4500/)
  assert.match(healthApi, /Retry-After', '30'/)
  assert.doesNotMatch(guard, /S\.O\.S\.|ON CALL|MISSION 365|INFINITY WATER|PRONTO|XXX VODKA|HALLOWEEN/i)
})
