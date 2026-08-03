import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GT_SUPABASE_URL,
  KHG_SUPABASE_URL,
  sbF,
  khgF,
} from '../src/lib/supabase.js'

test('uses the two intended GOOD TIMES database boundaries', () => {
  assert.equal(GT_SUPABASE_URL, 'https://czocqfaovfpjweayniuw.supabase.co')
  assert.equal(KHG_SUPABASE_URL, 'https://dzlmtvodpyhetvektfuo.supabase.co')
})

test('queries auth and content databases through their correct clients', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, json: async () => [{ id: 'verified' }] }
  }

  assert.deepEqual(await sbF('gt_saved_items?limit=1', fetchImpl), [{ id: 'verified' }])
  assert.deepEqual(await khgF('gt_shows?limit=1', fetchImpl), [{ id: 'verified' }])
  assert.match(calls[0].url, /czocqfaovfpjweayniuw/)
  assert.match(calls[1].url, /dzlmtvodpyhetvektfuo/)
  assert.ok(calls.every(({ options }) => options.headers.apikey && options.headers.Authorization))
})

test('fails closed to an empty collection when a public read is rejected', async () => {
  const rejected = async () => ({ ok: false, json: async () => ({ message: 'denied' }) })
  assert.deepEqual(await khgF('gt_shows?limit=1', rejected), [])
})
