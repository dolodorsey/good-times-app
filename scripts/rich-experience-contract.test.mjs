import {UX_NAV,HOME_MODES} from '../src/features/experience/good-times-ux-model.js'
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
  assert.deepEqual(UX_NAV.map(row=>row[2]),['Home','Entertainment','Plan','Venues','Profile']);assert.equal(navLine,'const NAV=UX_NAV')
  assert.doesNotMatch(navLine, /'Radar'/)
  assert.doesNotMatch(navLine, /'Vault'/)
  assert.doesNotMatch(navLine, /'Concierge'/)
  assert.match(source, /className={`\$\{tab===id\?'active':''\} \$\{id==='plan'\?'plan':''\}`}/)
})

test('Entertainment and Venues are distinct searchable catalog surfaces',()=>{
  const source=read('src/features/experience/GoodTimesCommandAppV4.jsx'),screen=read('src/features/experience/GoodTimesUXScreens.jsx')
  assert.match(source,/DirectoryView/);assert.match(source,/directoryQueries/);assert.match(source,/visitedViews/)
  for(const marker of ['api/discovery-search','category','onQuery','next','AbortController'].filter(x=>x!=='next'))assert.ok(screen.includes(marker))
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

test('Plan separates Click Shake Ask while preserving the existing verified concierge client',()=>{
  const source=read('src/features/experience/GoodTimesCommandAppV4.jsx'),planner=read('src/features/experience/GoodTimesPlannerStudio.jsx')
  for(const marker of ['ClickThroughPlanner','ShakePlanner','AskPlanner','validateDraft','buildPlanPrompt'])assert.ok(planner.includes(marker))
  assert.match(source,/askGoodTimesConcierge/);assert.match(source,/hardenRecommendationResult/);assert.match(source,/conciergeLock/)
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
  for(const marker of ['HomeView','DirectoryView','GoodTimesPlannerStudio','ProfileLibrary','Never hear'])assert.ok(source.includes(marker))
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
