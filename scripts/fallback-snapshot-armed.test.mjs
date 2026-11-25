import test from 'node:test'
import assert from 'node:assert/strict'
import { getGoodTimesHealth } from '../api/health.js'
import ATLANTA_FALLBACK_SNAPSHOT from '../api/atlanta-fallback-snapshot.js'

const ok = body => new Response(JSON.stringify(body), { status: 200 })
const healthyFetch = async url => String(url).includes('/rpc/') ? ok({ events: [], venues: [] }) : ok([{ id: 'fixture' }])
const refreshed = Date.parse(String(ATLANTA_FALLBACK_SNAPSHOT.refreshed_at).replace(' ', 'T').replace(/\.([0-9]{3})[0-9]+/, '.$1'))

test('health reports the fallback as armed while content is healthy (observability, not in-use)', async () => {
  const health = await getGoodTimesHealth(healthyFetch, new Date(refreshed + 2 * 36e5))
  assert.equal(health.content_ready, true)
  assert.equal(health.verified_snapshot_ready, false, 'in-use flag keeps its outage-only meaning')
  assert.equal(health.fallback_snapshot_armed, true)
  assert.equal(health.fallback_snapshot_age_hours, 2)
})

test('health exposes an expired fallback snapshot before an outage needs it', async () => {
  const health = await getGoodTimesHealth(healthyFetch, new Date(refreshed + 37 * 36e5))
  assert.equal(health.ok, true, 'expiry alone does not fail health while content is live')
  assert.equal(health.fallback_snapshot_armed, false)
  assert.equal(health.fallback_snapshot_age_hours, 37)
})
