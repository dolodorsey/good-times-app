import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { patchTaxonomySource } from './apply-taxonomy-vs-guard.mjs'

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const oldSports = "  if (/\\b(vs\\.?|versus|boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text)) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }"
const concertAnchor = "  const concertSignal = rawType === 'concert' || /live music|music show|concert|symphony|dj set|night sets|\\br&b\\b|\\brnb\\b|hip hop|hip-hop|\\brap\\b|\\bjazz\\b|\\bgospel\\b|karaoke|open mic/.test(text)"

test('builds apply the VS/day-party taxonomy guard before tests and bundling', () => {
  for (const name of ['build','ios:build','android:build']) {
    assert.match(packageJson.scripts[name], /apply-taxonomy-vs-guard\.mjs/)
  }
})

test('generic VS no longer means sports without a real sports signal', () => {
  const source = `function hasSportsSignal(text){return /sports/.test(text)}\nfunction x(text,fallbackSub,rawType){\n${oldSports}\n${concertAnchor}\n}`
  const patched = patchTaxonomySource(source)
  assert.match(patched, /\(\/\\b\(vs\\\.\?\|versus\)\\b\/\.test\(text\) && hasSportsSignal\(text\)\)/)
  assert.match(patched, /day party\|rooftop day party/)
  assert.equal(patchTaxonomySource(patched), patched, 'taxonomy patch must be idempotent')
})
