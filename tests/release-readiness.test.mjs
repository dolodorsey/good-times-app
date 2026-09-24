import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('health contract identifies publishing authority and staging', () => {
  const health = JSON.parse(read('public/health.json'))
  assert.equal(health.app, 'good-times-app')
  assert.equal(health.authority, 'MCP Gateway public.gt_*')
  assert.equal(health.staging, 'Google Drive source directory')
})

test('handoff prevents direct sheet publishing', () => {
  const handoff = read('docs/HANDOFF.md')
  assert.match(handoff, /gt_venues/)
  assert.match(handoff, /candidate|staging/i)
  assert.match(handoff, /dedup|freshness/i)
})
