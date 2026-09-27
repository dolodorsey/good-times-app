import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Regression guard. The shipped bundle once carried a hand-edited KHG anon JWT
// whose payload read iss:"sup" (truncated from "supabase") while keeping the
// original signature. Verification failed, every content request returned
// 401 "Invalid API key", and the app rendered empty with no visible error.
// validProjectKey() only screens the env-supplied override; the hardcoded
// fallbacks are what actually ship, so they are what must be asserted here.

const SOURCE = fs.readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8')
const HEALTH_SOURCE = fs.readFileSync(new URL('../api/health.js', import.meta.url), 'utf8')

const CONSTANTS = [
  { name: 'CANONICAL_GT_ANON_KEY', ref: 'czocqfaovfpjweayniuw', type: 'legacy-anon' },
  { name: 'CANONICAL_KHG_ANON_KEY', ref: 'dzlmtvodpyhetvektfuo', type: 'publishable' },
]

function valueFrom(source, name) {
  const match = source.match(new RegExp('const ' + name + " = '([^']*)'"))
  assert.ok(match, name + ' is missing')
  return match[1]
}

function claimsFrom(source, name) {
  const parts = valueFrom(source, name).split('.')
  assert.equal(parts.length, 3, name + ' is not a well-formed JWT')
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

function claimsOf(name) {
  return claimsFrom(SOURCE, name)
}

function assertValidAnonClaims(claims, name, ref) {
  assert.equal(claims.iss, 'supabase',
    name + ' has iss "' + claims.iss + '" — the signature will not verify and requests will 401')
  assert.equal(claims.ref, ref,
    name + ' points at project "' + claims.ref + '" instead of ' + ref)
  assert.equal(claims.role, 'anon',
    name + ' carries role "' + claims.role + '" — never ship a non-anon key to the browser or health probe')
  assert.ok(claims.exp * 1000 > Date.now(),
    name + ' expired ' + new Date(claims.exp * 1000).toISOString())
}

for (const { name, ref, type } of CONSTANTS) {
  test(name + ' uses the intended public credential type', () => {
    const value = valueFrom(SOURCE, name)
    assert.doesNotMatch(value, /^sb_secret_/, name + ' must never ship a private secret key')
    if (type === 'publishable') {
      assert.match(value, /^sb_publishable_[A-Za-z0-9_-]+$/, name + ' must use a modern publishable key')
      return
    }
    assertValidAnonClaims(claimsOf(name), name, ref)
  })
}

test('legacy GOOD TIMES auth and modern KHG content credentials stay intentionally separated', () => {
  assert.equal(claimsOf('CANONICAL_GT_ANON_KEY').ref, 'czocqfaovfpjweayniuw')
  assert.match(valueFrom(SOURCE, 'CANONICAL_KHG_ANON_KEY'), /^sb_publishable_/)
})

test('env key validator accepts publishable keys and rejects secret keys', () => {
  assert.match(SOURCE, /value\.startsWith\('sb_publishable_'\)/)
  assert.match(SOURCE, /value\.startsWith\('sb_secret_'\).*return false/)
})

test('GOOD TIMES health probe reuses the validated canonical project credentials', () => {
  assert.match(HEALTH_SOURCE, /GT_SUPABASE_ANON_KEY/)
  assert.match(HEALTH_SOURCE, /KHG_SUPABASE_ANON_KEY/)
  assert.doesNotMatch(HEALTH_SOURCE, /const GT_ANON_KEY = 'eyJ/)
  assert.doesNotMatch(HEALTH_SOURCE, /const CONTENT_ANON_KEY = 'eyJ/)
})
