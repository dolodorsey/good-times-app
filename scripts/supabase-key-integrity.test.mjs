import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// Regression guard for both Supabase public-key models.
// GOOD TIMES auth still uses its legacy anon JWT today; the shared KHG content
// project is intentionally migrated to the newer sb_publishable_* key so its
// legacy anon/service_role pair can be retired without shipping a privileged key.

const SOURCE = fs.readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8')
const HEALTH_SOURCE = fs.readFileSync(new URL('../api/health.js', import.meta.url), 'utf8')

function valueOf(name) {
  const match = SOURCE.match(new RegExp('const ' + name + " = '([^']*)'"))
  assert.ok(match, name + ' is missing')
  return match[1]
}
function urlOf(name) {
  return valueOf(name)
}
function jwtClaims(name) {
  const value=valueOf(name)
  const parts=value.split('.')
  assert.equal(parts.length,3,name + ' is not a well-formed JWT')
  return JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))
}
function assertValidAnonClaims(claims,name,ref) {
  assert.equal(claims.iss,'supabase',name + ' has invalid issuer')
  assert.equal(claims.ref,ref,name + ' points at the wrong project')
  assert.equal(claims.role,'anon',name + ' must remain public/anon')
  assert.ok(claims.exp * 1000 > Date.now(),name + ' is expired')
}

test('CANONICAL_GT_ANON_KEY remains a valid public anon JWT for the GOOD TIMES auth project', () => {
  assertValidAnonClaims(jwtClaims('CANONICAL_GT_ANON_KEY'),'CANONICAL_GT_ANON_KEY','czocqfaovfpjweayniuw')
})

test('CANONICAL_KHG_ANON_KEY is the KHG publishable key, not a legacy JWT', () => {
  const value=valueOf('CANONICAL_KHG_ANON_KEY')
  assert.match(value,/^sb_publishable_[A-Za-z0-9_-]+$/)
  assert.doesNotMatch(value,/^eyJ/)
  assert.equal(urlOf('CANONICAL_KHG_URL'),'https://dzlmtvodpyhetvektfuo.supabase.co')
})

test('the canonical service planes address different projects', () => {
  assert.equal(urlOf('CANONICAL_GT_URL'),'https://czocqfaovfpjweayniuw.supabase.co')
  assert.equal(urlOf('CANONICAL_KHG_URL'),'https://dzlmtvodpyhetvektfuo.supabase.co')
  assert.notEqual(urlOf('CANONICAL_GT_URL'),urlOf('CANONICAL_KHG_URL'))
})

test('GOOD TIMES health probe reuses the validated canonical project credentials', () => {
  assert.match(HEALTH_SOURCE,/GT_SUPABASE_ANON_KEY/)
  assert.match(HEALTH_SOURCE,/KHG_SUPABASE_ANON_KEY/)
  assert.doesNotMatch(HEALTH_SOURCE,/const GT_ANON_KEY = 'eyJ/)
  assert.doesNotMatch(HEALTH_SOURCE,/const CONTENT_ANON_KEY = 'eyJ/)
})
