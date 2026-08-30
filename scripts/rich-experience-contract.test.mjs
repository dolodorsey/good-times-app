import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => fs.readFileSync(new URL(path, root), 'utf8')

test('signed-in GOOD TIMES defaults to one V3 app shell', () => {
  const source = read('src/main.jsx')
  assert.match(source, /const LazyCommandApp = lazy\(\(\) => import\('\.\/features\/experience\/GoodTimesCommandAppV3\.jsx'\)\)/)
  assert.match(source, /else \{route=<LazyCommandApp\/>/)
  assert.doesNotMatch(source, /LazyCreativeLayer/)
  assert.doesNotMatch(source, /LazyPartyPulse/)
  assert.doesNotMatch(source, /GoodTimesShellControl/)
  assert.doesNotMatch(source, /BuildMyNightRouteHost/)
})

test('V3 CSS is the final consumer visual authority', () => {
  const source = read('src/main.jsx')
  const hardening = source.indexOf('good-times-v2-hardening.css')
  const v3 = source.indexOf('good-times-v3.css')
  assert.ok(hardening >= 0, 'app geometry hardening import missing')
  assert.ok(v3 > hardening, 'V3 CSS must load last after inherited geometry')
})

test('top-level navigation removes Plans/Saved duplication', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  for (const label of ['Now','Discover','Concierge','Radar','Vault']) assert.match(source, new RegExp(`'${label}'`))
  assert.doesNotMatch(source, /\['plans'[^\n]*'Plans'/)
  assert.doesNotMatch(source, /\['saved'[^\n]*'Saved'/)
  assert.match(source, /gt4-vault-tabs/)
  assert.match(source, /vaultView==='plans'/)
  assert.match(source, /vaultView==='saved'/)
})

test('Discover restores category to subcategory to directory drilldown', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  const browser = read('src/features/experience/ExploreTaxonomyBrowser.jsx')
  assert.match(source, /ExploreTaxonomyBrowser/)
  assert.match(source, /selectedCategory=/)
  assert.match(source, /selectedSubcategory=/)
  assert.match(browser, /SUBCATEGORIES/)
  assert.match(browser, /loadExploreDirectory/)
  assert.match(browser, /onSubcategory/)
  assert.match(browser, /All categories/)
  assert.match(source, /directoryOpen=/)
  assert.match(browser, /onDirectoryOpen/)
})

test('every non-home and nested V3 state has a usable Back path', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  assert.match(source, /const goBack=/)
  assert.match(source, /Back to subcategories/)
  assert.match(source, /Back to categories/)
  assert.match(source, /Back to Now/)
  assert.match(source, /className="gt4-detail-back"/)
})

test('Discover keeps two-column mobile density and scan-safe subcategory type', () => {
  const css = read('src/features/experience/good-times-v3.css')
  assert.match(css, /\.gt4-discover \.gt2-category-grid,\.gt4-discover \.gt2-subcategory-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/)
  assert.match(css, /\.gt4-discover \.gt2-venue-grid,\.gt4-discover \.gt4-live-results>div\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/)
  assert.match(css, /\.gt4-discover \.gt2-subcategory-grid>button>strong\{[^}]*var\(--gt4-sans\)!important/)
  assert.match(css, /word-break:normal!important/)
})

test('V3 cards are vertical app-width results rather than clipped horizontal rails', () => {
  const css = read('src/features/experience/good-times-v3.css')
  assert.match(css, /\.gt4-stack\{display:grid;gap:8px\}/)
  assert.match(css, /\.gt4-card\{[^}]*width:100%/)
  assert.match(css, /grid-template-columns:112px minmax\(0,1fr\)/)
  assert.doesNotMatch(css, /\.gt4-stack[^}]*overflow-x:auto/)
})

test('City Radar is a dedicated product destination', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  assert.match(source, /GOOD TIMES RADAR/)
  assert.match(source, /Never hear about it late/)
  assert.match(source, /Follow \+ alerts/)
  assert.match(source, /Never Miss/)
  assert.match(source, /enqueueRadarAlert/)
  assert.doesNotMatch(read('src/main.jsx'), /LazyPartyPulse/)
})

test('GOOD TIMES Shake remains visible inside Concierge', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  assert.match(source, /GOOD TIMES SHAKE/)
  assert.match(source, /FOR YOU/)
  assert.match(source, /SURPRISE ME/)
  assert.match(source, /RANDOM/)
  assert.match(source, /SHAKE MY NIGHT/)
})

test('the premium product retains source-backed action surfaces and hard media rules', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  assert.match(source, /GOOD TIMES TAKE/)
  assert.match(source, /KNOW BEFORE YOU GO/)
  assert.match(source, /Plan around this ✦/)
  assert.match(source, /Plan a night here ✦/)
  assert.match(source, /hardenRecommendationResult/)
  assert.match(source, /GENERIC_MEDIA/)
})

test('legacy floating utilities cannot survive V3', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV3.jsx')
  const css = read('src/features/experience/good-times-v3.css')
  assert.match(source, /MutationObserver/)
  assert.match(source, /gt-mobile-utilities/)
  assert.match(source, /vercel-live-feedback/)
  assert.match(css, /pointer-events:none!important/)
})
