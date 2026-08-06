import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('production bootstrap cannot double-mount or register a reload worker', () => {
  const main = read('src/main.jsx')
  assert.doesNotMatch(main, /React\.StrictMode/)
  assert.doesNotMatch(main, /navigator\.serviceWorker\.register/)
})

test('Build My Night uses the lightweight live concierge and always releases loading', () => {
  const client = read('src/features/intelligence/client.js')
  const live = read('src/features/experience/GoodTimesLiveApp.jsx')
  assert.match(client, /good-times-live-concierge/)
  assert.match(live, /persistFallbackPlan/)
  assert.match(live, /finally\s*\{[\s\S]*setBuilding\(false\)/)
  assert.match(live, /buildDateRange/)
  assert.match(live, /useState\('upcoming'\)/)
})

test('Explore retains all product taxonomy even when live counts fail', () => {
  const taxonomy = read('src/features/experience/live-taxonomy.js')
  const categoryMatches = taxonomy.match(/category\('/g) || []
  assert.equal(categoryMatches.length, 25)
  assert.match(taxonomy, /categories:\s*FALLBACK_TAXONOMY\.length/)
  assert.match(taxonomy, /subcategories:/)
  const live = read('src/features/experience/GoodTimesLiveApp.jsx')
  assert.match(live, /setTaxonomy\(mergeTaxonomy\(\)\)/)
  assert.match(live, /setCatalogError\(''\)/)
})

test('Explore counts come from the complete aggregate directory summary', () => {
  const catalog = read('api/catalog.js')
  assert.match(catalog, /v_gt_venue_taxonomy_directory_counts/)
  assert.doesNotMatch(catalog, /limit=10000/)
  assert.doesNotMatch(catalog, /countUnique\(/)
})

test('customer server APIs retry transient upstream failures', () => {
  const data = read('api/data.js')
  const catalog = read('api/catalog.js')
  assert.match(data, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/)
  assert.match(catalog, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/)
})

test('images have a same-origin resilient media path and fallback', () => {
  const live = read('src/features/experience/GoodTimesLiveApp.jsx')
  const stabilizer = read('public/gt-stabilizer.js')
  const media = read('api/media.js')
  assert.match(live, /\/api\/media\?url=/)
  assert.match(stabilizer, /\/api\/media\?url=/)
  assert.match(stabilizer, /sessionStorage/)
  assert.match(stabilizer, /attempt < 3/)
  assert.match(media, /image\/webp/)
})

test('retired service worker only unregisters itself', () => {
  const worker = read('public/sw.js')
  assert.match(worker, /registration\.unregister/)
  assert.doesNotMatch(worker, /navigate\(/)
  assert.doesNotMatch(worker, /FORCE_RELOAD/)
})
