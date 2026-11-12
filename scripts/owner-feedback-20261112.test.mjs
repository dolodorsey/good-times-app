import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('Uber reference: Home has compact Starting Soon rows, live tile counts and a one-row plan strip', () => {
  const home = read('src/features/experience/complete/HomeScreen.jsx')
  const kit = read('src/features/experience/complete/Kit.jsx')
  assert.match(home, /<QuickList title=\{night\.next\?'Next':'Starting'\}/)
  assert.match(home, /<BuildTrio compact /)
  assert.match(home, /badge:`\$\{n\} tonight`/)
  assert.match(kit, /export function QuickList/)
  assert.match(kit, /gtk-cat-badge/)
})

test('Uber reference: phone cards are smaller than before but larger than Uber tiles', () => {
  const css = read('src/features/experience/complete/good-times-cinematic.css')
  const pass = css.slice(css.indexOf('Owner pass 2026-11-12'))
  assert.ok(pass.length > 1000)
  assert.match(pass, /\.gtk-cat\{width:84px!important;height:100px!important/)
  assert.match(pass, /\.gtk-poster,\.gtk-poster-sm\{width:min\(26\.7vw,140px\)!important/)
  assert.match(pass, /\.gtk-lanes-top\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/)
  assert.match(pass, /\.gtk-build\.is-compact \.gtk-build-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/)
})
