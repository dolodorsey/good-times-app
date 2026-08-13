import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the approved Good Times refinement loads after the responsive contract', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  const responsive = source.indexOf("good-times-responsive-contract.css")
  const refinement = source.indexOf("good-times-reference-update.css")
  assert.ok(responsive >= 0)
  assert.ok(refinement > responsive)
})

test('Explore renders three cards per row with explicit responsive fallbacks', async () => {
  const css = await readFile(new URL('../src/features/experience/good-times-reference-update.css', import.meta.url), 'utf8')
  assert.match(css, /\.gt2-explore-browser \.gt2-category-grid/)
  assert.match(css, /\.gt2-explore-browser \.gt2-venue-grid/)
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/)
  assert.match(css, /@media \(max-width:599px\)/)
  assert.match(css, /grid-template-columns:1fr!important/)
})
