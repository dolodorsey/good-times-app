import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../public/gt-service-guard.js', import.meta.url), 'utf8')

async function runGuard(native, healthy) {
  const root = { innerHTML: '' }
  const calls = []
  const window = { Capacitor: { isNativePlatform: () => native } }
  const context = {
    window, document: { getElementById: id => id === 'root' ? root : null },
    AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      calls.push(url)
      return { ok: healthy, json: async () => ({ok: healthy, service: 'good-times'}) }
    },
  }
  vm.runInNewContext(source, context)
  return {state: await window.__GOOD_TIMES_SERVICE_READY__, root, calls}
}

test('packaged iOS health goes to the live host before React loads', async () => {
  const {state, root, calls} = await runGuard(true, true)
  assert.equal(calls[0], 'https://thegoodtimesworldwide.com/api/health')
  assert.equal(state.ready, true)
  assert.match(root.innerHTML, /Opening GOOD TIMES/)
})

test('web health remains same-origin and the opening screen stays visible', async () => {
  const {state, root, calls} = await runGuard(false, true)
  assert.equal(calls[0], '/api/health')
  assert.equal(state.ready, true)
  assert.ok(root.innerHTML.length > 0)
})

test('native and web outages retain the blocked state and retry action', async () => {
  for (const native of [false, true]) {
    const {state, root} = await runGuard(native, false)
    assert.equal(state.ready, false)
    assert.match(root.innerHTML, /Check status again/)
    assert.match(root.innerHTML, /No request or account change was submitted/)
  }
})
