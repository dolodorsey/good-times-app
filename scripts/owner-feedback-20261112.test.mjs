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

test('Eventbrite art loads: resizer links are unwrapped to the original on cdn.evbuc.com', async () => {
  const { safeImage } = await import('../src/features/experience/complete/model.js')
  const wrapped = 'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196846294%2F2574990468831%2F1%2Foriginal.20261029-120309?auto=format%2Ccompress&q=75&sharp=10&s=a8067bcffb1ce987404c60deaf5bfb17'
  assert.equal(safeImage(wrapped), 'https://cdn.evbuc.com/images/1196846294/2574990468831/1/original.20261029-120309')
  assert.equal(safeImage('https://img.evbuc.com/https%3A%2F%2Fevil.example%2Fx.jpg'), 'https://img.evbuc.com/https%3A%2F%2Fevil.example%2Fx.jpg')
  assert.equal(safeImage('https://example.com/a.jpg'), 'https://example.com/a.jpg')
  assert.equal(safeImage('AU_ZVEGGxBKt5lA9v7WX1FlXFxh'), null)
})
