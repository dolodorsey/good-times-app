import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/features/experience/ExploreTaxonomyBrowser.jsx', import.meta.url), 'utf8')

test('Explore search includes canonical search tags', () => {
  assert.match(source, /\.\.\.\(row\.search_tags \|\| \[\]\)/)
})

test('authoritative zero counts do not fall through to directory fallback', () => {
  assert.match(source, /return match \? Number\(match\.place_count \?\? 0\) : null/)
  assert.match(source, /return exact === null \? fallback : exact/)
  assert.doesNotMatch(source, /count:exact\|\|fallback/)
  assert.doesNotMatch(source, /const count=exact\|\|fallback/)
})
