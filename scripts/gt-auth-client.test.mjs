import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearSession,
  friendlyAuthError,
  readSession,
  storeSession,
} from '../src/features/auth/client.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

test('stores and reads a complete current session', () => {
  const storage = memoryStorage()
  const session = {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1' },
  }
  storeSession(session, storage)
  assert.deepEqual(readSession(storage), session)
})

test('rejects expired and incomplete sessions', () => {
  const expired = memoryStorage({
    gt_session: JSON.stringify({ access_token: 'access', user: { id: '1' }, expires_at: 1 }),
  })
  assert.equal(readSession(expired), null)
  assert.throws(() => storeSession({ access_token: 'missing-user' }, memoryStorage()), /complete session/i)
})

test('clears a stored session', () => {
  const storage = memoryStorage({ gt_session: '{}' })
  clearSession(storage)
  assert.equal(storage.getItem('gt_session'), null)
})

test('normalizes common authentication errors', () => {
  assert.equal(friendlyAuthError(new Error('Invalid login credentials')), 'Wrong email or password.')
  assert.match(friendlyAuthError(new Error('over_email_send_rate_limit')), /temporarily limited/i)
})
