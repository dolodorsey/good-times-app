import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GT_SESSION_KEY,
  parseRecoverySession,
  parseStoredSession,
  refreshStoredSession,
  shouldRefreshSession,
} from '../src/gt-auth-session.js'

function createStorage(initialValue = null) {
  const values = new Map()
  if (initialValue !== null) values.set(GT_SESSION_KEY, initialValue)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('parses only valid JSON object sessions', () => {
  assert.deepEqual(parseStoredSession('{"access_token":"a"}'), { access_token: 'a' })
  assert.equal(parseStoredSession('not-json'), null)
  assert.equal(parseStoredSession('null'), null)
})

test('refresh decision respects expiry safety window', () => {
  assert.equal(shouldRefreshSession({ refresh_token: 'r', expires_at: 1061 }, 1000), false)
  assert.equal(shouldRefreshSession({ refresh_token: 'r', expires_at: 1060 }, 1000), true)
  assert.equal(shouldRefreshSession({ expires_at: 900 }, 1000), false)
})

test('refreshes an expired session and stores rotated tokens', async () => {
  const storage = createStorage(JSON.stringify({ access_token: 'old', refresh_token: 'refresh-old', expires_at: 900 }))
  const refreshed = { access_token: 'new', refresh_token: 'refresh-new', expires_at: 2000, user: { id: 'u1' } }
  const result = await refreshStoredSession({
    storage,
    nowSeconds: 1000,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => refreshed }),
  })
  assert.equal(result.status, 'refreshed')
  assert.deepEqual(JSON.parse(storage.getItem(GT_SESSION_KEY)), refreshed)
})

test('removes an invalid local session', async () => {
  const storage = createStorage('broken-json')
  const result = await refreshStoredSession({ storage, fetchImpl: async () => assert.fail('fetch should not run') })
  assert.equal(result.status, 'invalid-local-session')
  assert.equal(storage.getItem(GT_SESSION_KEY), null)
})

test('removes the session only for an invalid refresh token', async () => {
  const storage = createStorage(JSON.stringify({ access_token: 'old', refresh_token: 'bad', expires_at: 900 }))
  const result = await refreshStoredSession({
    storage,
    nowSeconds: 1000,
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }),
  })
  assert.equal(result.status, 'invalid-refresh-token')
  assert.equal(storage.getItem(GT_SESSION_KEY), null)
})

test('preserves the old session during a transient refresh failure', async () => {
  const original = { access_token: 'old', refresh_token: 'refresh', expires_at: 900 }
  const storage = createStorage(JSON.stringify(original))
  const result = await refreshStoredSession({
    storage,
    nowSeconds: 1000,
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  })
  assert.equal(result.status, 'refresh-failed')
  assert.deepEqual(JSON.parse(storage.getItem(GT_SESSION_KEY)), original)
})

test('parses a valid recovery callback', () => {
  const session = parseRecoverySession('#access_token=a&refresh_token=r&type=recovery&expires_at=2000&token_type=bearer')
  assert.equal(session.access_token, 'a')
  assert.equal(session.refresh_token, 'r')
  assert.equal(session.type, 'recovery')
  assert.equal(parseRecoverySession('#type=signup&access_token=a&refresh_token=r'), null)
})
