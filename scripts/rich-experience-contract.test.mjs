import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => fs.readFileSync(new URL(path, root), 'utf8')

test('signed-in GOOD TIMES defaults to the rich interactive command experience', () => {
  const source = read('src/main.jsx')
  assert.match(source, /else route=<><LazyCreativeLayer\/><LazyCommandApp\/><LazyPartyPulse\/><\/>/)
  assert.match(source, /LazyCreativeLayer = lazy/)
  assert.match(source, /LazyPartyPulse = lazy/)
  assert.doesNotMatch(source, /LazyNavigationBridge/)
})

test('rich visual overrides load after the canonical stabilization shell', () => {
  const source = read('src/main.jsx')
  const shell = source.indexOf("good-times-shell.css")
  const rich = source.indexOf("good-times-rich.css")
  assert.ok(shell >= 0, 'canonical shell import missing')
  assert.ok(rich > shell, 'rich visual layer must load after shell consolidation')
})

test('customer toolbar exposes Build My Night and Explore', () => {
  const source = read('src/features/experience/GoodTimesCommandApp.jsx')
  assert.match(source, /\['concierge', '✦', 'Build My Night'\]/)
  assert.match(source, /\['explore', '◇', 'Explore'\]/)
  assert.match(source, /BuildMyNightPanel/)
  assert.match(source, /ExploreTaxonomyBrowser/)
})

test('Party Board exposes Tonight and This Week and can seed Build My Night', () => {
  const source = read('src/features/experience/GoodTimesPartyPulse.jsx')
  assert.match(source, /PARTY BOARD/)
  assert.match(source, /Tonight/)
  assert.match(source, /This Week/)
  assert.match(source, /goodtimes:build-seed/)
  assert.match(source, /Build around this/)
  assert.match(source, /\/api\/data\?city=/)
})

test('Supabase creative assets are part of the customer visual layer', () => {
  const component = read('src/features/experience/GoodTimesCreativeLayer.jsx')
  const assets = read('src/features/experience/good-times-assets.js')
  const refresh = read('src/features/experience/good-times-creative-refresh.css')
  const css = read('src/features/experience/good-times-rich.css')
  assert.match(assets, /kollective\/animations\/GOODTIMES\.mp4/)
  assert.match(assets, /motion\/goodtimes\.jpg/)
  assert.match(assets, /approved=eq\.true&is_active=eq\.true/)
  assert.match(assets, /GOODTIMES_HOMESCREEN\.png/)
  assert.match(component, /loadGoodTimesAssetManifest/)
  assert.match(component, /data-creative-source="gt_asset_manifest"/)
  assert.doesNotMatch(component, /ChatGPT_Image_Feb_10_2026/)
  assert.doesNotMatch(refresh, /good_times\/graphics\/GOODTIMES_HOMESCREEN\.png/)
  assert.match(refresh, /data-creative-mode|motion-glass|gt2-category-grid/)
  assert.match(css, /gt-party-pulse/)
})

test('Party Board event selection prefills the interactive Build My Night concierge', () => {
  const source = read('src/features/experience/GoodTimesCommandApp.jsx')
  assert.match(source, /window\.addEventListener\('goodtimes:build-seed'/)
  assert.match(source, /setTab\('concierge'\)/)
  assert.match(source, /setConciergeQuery\(/)
})
