import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const publicRoutes = ['/api/data', '/api/data-fast', '/api/data-live']

test('only the three public inventory endpoints receive targeted CDN caching', () => {
  const policies = config.headers.filter(rule => rule.headers.some(header => header.key === 'Vercel-CDN-Cache-Control'))
  assert.deepEqual(policies.map(rule => rule.source).sort(), [...publicRoutes].sort())
  for (const rule of policies) {
    assert.equal(rule.headers.find(header => header.key === 'Vercel-CDN-Cache-Control').value, 'max-age=30, stale-while-revalidate=120')
    assert.ok(!/health|auth|profile|saved|plan|crm/i.test(rule.source))
  }
})

test('public inventory rewrites still use the approved live-data entrypoint', () => {
  for (const source of ['/api/data', '/api/data-fast']) {
    assert.equal(config.rewrites.find(rule => rule.source === source)?.destination, '/api/data-live')
  }
})

test('shared cache does not expand the existing public response contract', () => {
  const source = readFileSync(new URL('../api/data-live.js', import.meta.url), 'utf8')
  assert.ok(source.includes("const city='atlanta'"))
  assert.ok(source.includes('degraded'))
  assert.ok(source.includes('good-times-verified-embedded-snapshot'))
  assert.ok(!/request\.(cookies|session)|request\.headers\.(authorization|cookie)/.test(source))
})
