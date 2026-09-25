import {UX_NAV,HOME_MODES} from '../src/features/experience/good-times-ux-model.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'

const source=readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../src/features/experience/good-times-v4.css',import.meta.url),'utf8')
const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')

const canonicalNav="const NAV=UX_NAV"

test('GOOD TIMES permanent bottom navigation cannot regress',()=>{
  assert.ok(source.includes(canonicalNav));assert.deepEqual(UX_NAV.map(x=>x[2]),['Home','Entertainment','Plan','Venues','Profile'])
  const navLine=source.split('\n').find(line=>line.startsWith('const NAV='))||''
  assert.equal(navLine.includes("'radar'"),false,'Radar must not replace Plan in the permanent bottom navigation')
  assert.equal(navLine.includes("'vault'"),false,'Vault is the editorial Saved surface, not a permanent nav label')
  assert.equal(navLine.includes("'concierge'"),false,'Concierge is the Plan experience, not a permanent nav label')
})

test('V4 is the routed consumer authority',()=>{
  assert.ok(main.includes("GoodTimesCommandAppV4.jsx"),'main.jsx must route the canonical experience to V4')
  assert.ok(main.includes("good-times-v4.css"),'main.jsx must load the protected V4 design authority last')
})

test('founder UX upgrade preserves premium identity and independent planning methods',()=>{
  const screens=readFileSync(new URL('../src/features/experience/GoodTimesUXScreens.jsx',import.meta.url),'utf8'),planner=readFileSync(new URL('../src/features/experience/GoodTimesPlannerStudio.jsx',import.meta.url),'utf8')
  for(const phrase of ['Your city.','More good times.','Worth your time','Your city. Your teams.','My Plans'])assert.ok(screens.includes(phrase))
  for(const phrase of ['Build it. Shake it. Ask us.','ClickThroughPlanner','ShakePlanner','AskPlanner'])assert.ok(planner.includes(phrase))
})

test('V4 design tokens and shell protections exist',()=>{
  for(const token of ['--gt5-canvas','--gt5-gold2','--gt5-serif','--gt5-sans','.gt5-main','.gt5-nav','.gt5-hero','.gt5-overlay']){
    assert.ok(css.includes(token),`required design-system token/selector missing: ${token}`)
  }
  assert.ok(css.includes('position:absolute;left:0;right:0;bottom:0'),'bottom nav must remain outside the scroll pane and anchored to the app shell')
  assert.ok(css.includes('min-height:44px')||css.includes('height:44px'),'protected touch geometry must retain 44px controls')
})

test('repository governance documents exist',()=>{
  for(const path of ['../docs/GOOD_TIMES_PRODUCT_UI_CONSTITUTION.md','../docs/GOOD_TIMES_PRODUCTION_SOP.md','../docs/GOOD_TIMES_SCREEN_CONTRACTS.md']){
    assert.ok(existsSync(new URL(path,import.meta.url)),`missing governance document: ${path}`)
  }
})
