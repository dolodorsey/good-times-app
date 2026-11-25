import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/release.js'
import { releaseMatches, waitForProductionRelease } from './wait-production-release.mjs'

const sha = 'a'.repeat(40)
const ready = { ok: true, service: 'good-times', environment: 'production', commit_sha: sha }

test('production identity requires exact SHA, service and environment', () => {
  assert.equal(releaseMatches(ready, sha), true)
  for (const changed of [{commit_sha:'b'.repeat(40)}, {environment:'preview'}, {service:'other'}, {ok:false}]) {
    assert.equal(releaseMatches({...ready, ...changed}, sha), false)
  }
  assert.equal(releaseMatches(ready, undefined), false)
})

test('wait checks the actual deployed SHA and never substitutes a different release', async () => {
  let count = 0
  const fetchImpl = async () => ({ok:true,json:async()=>++count === 1 ? {...ready,commit_sha:'b'.repeat(40)} : ready})
  assert.equal((await waitForProductionRelease({expectedSha:sha,attempts:2,fetchImpl,sleep:async()=>{}})).commit_sha,sha)
  await assert.rejects(waitForProductionRelease({expectedSha:sha,attempts:1,fetchImpl:async()=>({ok:true,json:async()=>({...ready,environment:'preview'})})}),/did not become available/)
})

test('release identity is uncached, read-only and contains only allowlisted metadata', () => {
  const originalSha = process.env.VERCEL_GIT_COMMIT_SHA
  const originalEnv = process.env.VERCEL_ENV
  try {
    process.env.VERCEL_GIT_COMMIT_SHA = sha
    process.env.VERCEL_ENV = 'production'
    const headers = {}, response = {setHeader:(k,v)=>{headers[k]=v},end:body=>body}
    const payload = JSON.parse(handler({method:'GET'},response))
    assert.deepEqual(Object.keys(payload).sort(),['ok','service','commit_sha','environment','launch_scope'].sort())
    assert.equal(response.statusCode,200)
    assert.equal(headers['Vercel-CDN-Cache-Control'],'no-store')
    assert.equal(headers['Cache-Control'],'no-store')
    assert.equal(handler({method:'HEAD'},response),undefined)
    handler({method:'POST'},response)
    assert.equal(response.statusCode,405)
    delete process.env.VERCEL_GIT_COMMIT_SHA
    assert.equal(JSON.parse(handler({method:'GET'},response)).ok,false)
    assert.equal(response.statusCode,503)
  } finally {
    if(originalSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA=originalSha
    if(originalEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV=originalEnv
  }
})
