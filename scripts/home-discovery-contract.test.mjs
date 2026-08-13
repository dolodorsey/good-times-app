import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../src/features/experience/GoodTimesCommandApp.jsx', import.meta.url), 'utf8')
const responsive = await readFile(new URL('../src/features/experience/good-times-responsive-contract.css', import.meta.url), 'utf8')

test('Home rotates multiple unique featured experiences and exposes concerts', () => {
  assert.match(app, /setInterval\(\(\) => setHeroIndex/)
  assert.match(app, /images\.has\(image\)/)
  assert.match(app, /Upcoming concerts/)
  assert.match(app, /category:'concerts_live_music'/)
})

test('See-all navigation resets the inner scroll pane and search cannot cover results', () => {
  assert.match(app, /contentRef\.current\?\.scrollTo/)
  assert.match(app, /<main className="gt2-content" ref=\{contentRef\}>/)
  assert.match(responsive, /\.gt2-search\{position:relative!important;top:auto!important\}/)
})

test('Mobile navigation remains visible above content and safe areas', () => {
  assert.match(responsive, /visibility:visible!important/)
  assert.match(responsive, /z-index:9300!important/)
  assert.match(responsive, /padding-bottom:calc\(104px \+ env\(safe-area-inset-bottom,0px\)\)!important/)
})
