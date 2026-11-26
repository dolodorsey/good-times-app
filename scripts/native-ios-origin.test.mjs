import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

// Apple rejected 1.1.0 (Guideline 2.1(a), Nov 20, 2026): the iPad launched to "GOOD TIMES is reconnecting."
// Cause: Capacitor iOS can't serve local files over https (WKWebView owns that scheme), so it falls back to
// capacitor://localhost, while the API only allowed https://localhost. The startup health check was blocked by
// the browser on every iOS launch.
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const plan = fs.readFileSync(new URL('../api/plan.js', import.meta.url), 'utf8')
const guard = fs.readFileSync(new URL('../public/gt-service-guard.js', import.meta.url), 'utf8')

const allowOrigin = rule => rule.headers.find(h => h.key === 'Access-Control-Allow-Origin')?.value
const apiRules = vercel.headers.filter(r => r.source === '/api/(.*)' && allowOrigin(r))

test('API answers the iOS app origin (capacitor://localhost)', () => {
  const ios = apiRules.find(r => r.has?.some(c => c.type === 'header' && c.key === 'origin' && c.value === 'capacitor://localhost'))
  assert.ok(ios, 'rule for requests from capacitor://localhost')
  assert.equal(allowOrigin(ios), 'capacitor://localhost')
})

test('API still answers the Android/web origin (https://localhost), and the two rules never overlap', () => {
  const other = apiRules.find(r => r.missing?.some(c => c.key === 'origin' && c.value === 'capacitor://localhost'))
  assert.ok(other)
  assert.equal(allowOrigin(other), 'https://localhost')
  assert.equal(apiRules.length, 2)
  for (const r of apiRules) assert.ok(r.headers.some(h => h.key === 'Vary' && h.value === 'Origin'))
})

test('Plan endpoint echoes the iOS origin too', () => {
  assert.match(plan, /req\.headers\?\.origin==='capacitor:\/\/localhost'\?'capacitor:\/\/localhost':'https:\/\/localhost'/)
})

test('a slow or dropped first health check retries before blocking the app', async () => {
  let calls = 0
  const root = { innerHTML: '' }
  const window = { Capacitor: { isNativePlatform: () => true } }
  vm.runInNewContext(guard, {
    window, document: { getElementById: id => id === 'root' ? root : null },
    AbortController, setTimeout, clearTimeout,
    fetch: async () => { calls += 1; if (calls === 1) throw new TypeError('Load failed'); return { ok: true, json: async () => ({ ok: true, service: 'good-times' }) } },
  })
  const state = await window.__GOOD_TIMES_SERVICE_READY__
  assert.equal(calls, 2)
  assert.equal(state.ready, true)
  assert.doesNotMatch(root.innerHTML, /reconnecting/)
})

test('startup health check gives a cold phone enough time', () => {
  const ms = Number(guard.match(/CLIENT_TIMEOUT_MS = (\d+)/)?.[1])
  assert.ok(ms >= 10000, `timeout ${ms}`)
})
