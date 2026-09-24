import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const live = fs.readFileSync(new URL('../api/data-live.js', import.meta.url), 'utf8')

test('data-live uses fresh cache-only inventory before the heavier canonical RPC', () => {
  assert.match(live,/gt_public_live_inventory_cache_only_v1/)
  assert.match(live,/fetchInventoryCacheOnly/)
  assert.match(live,/inventory=await fetchInventoryCacheOnly/)
  assert.match(live,/cache-only inventory unavailable; trying canonical inventory RPC/)
})

test('cache-only lookup remains Atlanta-scoped and freshness-aware', () => {
  assert.match(live,/CACHE_ONLY_RPC_TIMEOUT_MS=1600/)
  assert.match(live,/is_service_date_match/)
  assert.match(live,/is_fresh/)
})
