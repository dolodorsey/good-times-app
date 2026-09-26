import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => fs.readFileSync(new URL(path, root), 'utf8')

test('signed-in GOOD TIMES defaults to one V4 app shell', () => {
  const source = read('src/main.jsx')
  assert.match(source, /const LazyCommandApp = lazy\(\(\) => import\('\.\/features\/experience\/GoodTimesCommandAppV4\.jsx'\)\)/)
  assert.match(source, /else \{route=<LazyCommandApp\/>/)
  assert.doesNotMatch(source, /LazyCreativeLayer/)
  assert.doesNotMatch(source, /LazyPartyPulse/)
  assert.doesNotMatch(source, /GoodTimesShellControl/)
  assert.doesNotMatch(source, /BuildMyNightRouteHost/)
})

test('V4 CSS is the final protected consumer visual authority', () => {
  const source = read('src/main.jsx')
  const v3 = source.indexOf('good-times-v3.css')
  const v4 = source.indexOf('good-times-v4.css')
  assert.ok(v3 >= 0, 'V3 compatibility layer missing')
  assert.ok(v4 > v3, 'V4 CSS must load last as protected visual authority')
})

test('permanent navigation is Home Discover Plan Saved Profile', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  const navLine = source.split('\n').find(line => line.startsWith('const NAV=')) || ''
  for (const label of ['Home','Discover','Plan','Saved','Profile']) assert.match(navLine, new RegExp(`'${label}'`))
  assert.doesNotMatch(navLine, /'Radar'/)
  assert.doesNotMatch(navLine, /'Vault'/)
  assert.doesNotMatch(navLine, /'Concierge'/)
  assert.match(source, /className={`\$\{tab===id\?'active':''\} \$\{id==='plan'\?'plan':''\}`}/)
})

test('Discover keeps taxonomy drilldown behind editorial discovery lanes', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  const browser = read('src/features/experience/ExploreTaxonomyBrowser.jsx')
  for (const lane of ['Eat Well','Turn Up','Be There','Stay Right','Do More']) assert.match(source, new RegExp(lane))
  assert.match(source, /ExploreTaxonomyBrowser/)
  assert.match(source, /selectedCategory=/)
  assert.match(source, /selectedSubcategory=/)
  assert.match(source, /directoryOpen=/)
  assert.match(browser, /SUBCATEGORIES/)
  assert.match(browser, /loadExploreDirectory/)
  assert.match(browser, /onSubcategory/)
  assert.match(browser, /onDirectoryOpen/)
})

test('Radar is first-class but cannot replace Plan in permanent navigation', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  assert.match(source, /GOOD TIMES RADAR/)
  assert.match(source, /Never hear/)
  assert.match(source, /about it late/)
  assert.match(source, /enqueueRadarAlert/)
  assert.match(source, /onClick=\{\(\)=>goTab\('radar'\)\}/)
  const navLine = source.split('\n').find(line => line.startsWith('const NAV=')) || ''
  assert.doesNotMatch(navLine, /radar/i)
})

test('Plan retains natural-language Concierge and guided itinerary builder', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  assert.match(source, /AI Concierge/)
  assert.match(source, /Custom Plan/)
  assert.match(source, /Build my night/)
  assert.match(source, /BuildMyNightPanel/)
  assert.match(source, /askGoodTimesConcierge/)
  assert.match(source, /hardenRecommendationResult/)
})

test('source-backed detail actions and media hardening remain present', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  assert.match(source, /GOOD TIMES TAKE/)
  assert.match(source, /Plan around this ✦/)
  assert.match(source, /Plan a night here ✦/)
  assert.match(source, /GENERIC_MEDIA/)
  assert.match(source, /safeMedia/)
  assert.match(source, /selectedVenue\.booking_link/)
  assert.match(source, /selectedEvent\.ticket_url/)
})

test('generated itinerary uses explicit status data instead of manufacturing confirmation', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  assert.match(source, /selectedPlan&&/)
  assert.match(source, /s\.status&&/)
  assert.doesNotMatch(source, /status:\s*['"]CONFIRMED['"]/)
})

test('V4 screen formula and protected responsive shell are encoded', () => {
  const source = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  const css = read('src/features/experience/good-times-v4.css')
  for (const phrase of ['A Better','Discover','Plan','Everything','Never hear']) assert.match(source, new RegExp(phrase))
  assert.match(css, /\.gt5-main\{[^}]*overflow-y:auto/)
  assert.match(css, /\.gt5-nav\{[^}]*position:absolute/)
  assert.match(css, /@media\(max-width:390px\)/)
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/)
})

test('legacy utility suppression remains inherited until old layers are retired', () => {
  const main = read('src/main.jsx')
  const v3 = read('src/features/experience/good-times-v3.css')
  assert.match(main, /good-times-v3\.css/)
  assert.match(v3, /pointer-events:none!important/)
})
