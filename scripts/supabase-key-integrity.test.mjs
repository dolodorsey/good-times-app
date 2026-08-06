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

const CONSTANTS = [
  { name: 'CANONICAL_GT_ANON_KEY', ref: 'czocqfaovfpjweayniuw' },
  { name: 'CANONICAL_KHG_ANON_KEY', ref: 'dzlmtvodpyhetvektfuo' },
]

function claimsOf(name) {
  const match = SOURCE.match(new RegExp('const ' + name + " = '([^']*)'"))
  assert.ok(match, name + ' is missing from src/lib/supabase.js')
  const parts = match[1].split('.')
  assert.equal(parts.length, 3, name + ' is not a well-formed JWT')
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

for (const { name, ref } of CONSTANTS) {
  test(name + ' is a valid, unexpired anon key for its own project', () => {
    const claims = claimsOf(name)
    assert.equal(claims.iss, 'supabase',
      name + ' has iss "' + claims.iss + '" — the signature will not verify and every request 401s')
    assert.equal(claims.ref, ref,
      name + ' points at project "' + claims.ref + '" instead of ' + ref)
    assert.equal(claims.role, 'anon',
      name + ' carries role "' + claims.role + '" — never ship a non-anon key to the browser')
    assert.ok(claims.exp * 1000 > Date.now(),
      name + ' expired ' + new Date(claims.exp * 1000).toISOString())
  })
}

test('the two canonical keys address different projects', () => {
  assert.notEqual(claimsOf('CANONICAL_GT_ANON_KEY').ref, claimsOf('CANONICAL_KHG_ANON_KEY').ref)
})
