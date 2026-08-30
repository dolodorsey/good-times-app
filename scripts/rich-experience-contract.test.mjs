import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => fs.readFileSync(new URL(path, root), 'utf8')

test('signed-in GOOD TIMES defaults to one V2 app shell', () => {
  const source = read('src/main.jsx')
  assert.match(source, /const LazyCommandApp = lazy\(\(\) => import\('\.\/features\/experience\/GoodTimesCommandAppV2\.jsx'\)\)/)
  assert.match(source, /else \{route=<LazyCommandApp\/>/)
  assert.doesNotMatch(source, /LazyCreativeLayer/)
  assert.doesNotMatch(source, /LazyPartyPulse/)
  assert.doesNotMatch(source, /GoodTimesShellControl/)
  assert.doesNotMatch(source, /BuildMyNightRouteHost/)
})

test('V2 hardening is the final visual authority', () => {
  const source = read('src/main.jsx')
  const base = source.indexOf('good-times-v2.css')
  const hardening = source.indexOf('good-times-v2-hardening.css')
  assert.ok(base >= 0, 'V2 base CSS import missing')
  assert.ok(hardening > base, 'V2 hardening must load after all older geometry')
})

test('customer navigation is concise and app-native', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV2.jsx')
  for (const label of ['Now','Discover','Concierge','Plans','Saved']) assert.match(source, new RegExp(`'${label}'`))
  assert.match(source, /gt3-mobile-nav/)
  assert.doesNotMatch(source, /\['dates'/)
  assert.doesNotMatch(source, /\['vault'/)
})

test('City Radar replaces the old persistent Party Board overlay', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV2.jsx')
  assert.match(source, /CITY RADAR/)
  assert.match(source, /GOOD TIMES RADAR/)
  assert.match(source, /Follow \+ alerts/)
  assert.match(source, /Never Miss/)
  assert.match(source, /enqueueRadarAlert/)
  assert.doesNotMatch(read('src/main.jsx'), /LazyPartyPulse/)
})

test('GOOD TIMES Shake remains visible inside Concierge', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV2.jsx')
  assert.match(source, /GOOD TIMES SHAKE/)
  assert.match(source, /FOR YOU/)
  assert.match(source, /SURPRISE ME/)
  assert.match(source, /RANDOM/)
  assert.match(source, /SHAKE MY NIGHT/)
})

test('the premium product retains source-backed action surfaces', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV2.jsx')
  assert.match(source, /GOOD TIMES TAKE/)
  assert.match(source, /KNOW BEFORE YOU GO/)
  assert.match(source, /Plan around this ✦/)
  assert.match(source, /Plan a night here ✦/)
  assert.match(source, /hardenRecommendationResult/)
})
