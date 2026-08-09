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
  assert.doesNotMatch(source, /showMemberTools\?<><LazyCompletionBridge\/><LazyNavigationBridge\//)
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
  const css = read('src/features/experience/good-times-rich.css')
  assert.match(component, /GOOD_TIMES_ANIMATION\.mp4/)
  assert.match(component, /GOODTIMES_HOMESCREEN\.png/)
  assert.match(component, /ChatGPT_Image_Feb_10_2026_03_52_56_AM\.png/)
  assert.match(css, /gt-party-pulse/)
  assert.match(css, /good_times\/graphics/)
})

test('Party Board event selection prefills the interactive Build My Night concierge', () => {
  const source = read('src/features/experience/GoodTimesCommandApp.jsx')
  assert.match(source, /window\.addEventListener\('goodtimes:build-seed'/)
  assert.match(source, /setTab\('concierge'\)/)
  assert.match(source, /setConciergeQuery\(/)
})
