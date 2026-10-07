import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8')
const hub=fs.readFileSync(new URL('../src/features/experience/complete/EntertainmentHub.jsx',import.meta.url),'utf8')
const details=fs.readFileSync(new URL('../src/features/experience/complete/Details.jsx',import.meta.url),'utf8')
const profileHub=fs.readFileSync(new URL('../src/features/experience/complete/ProfileHub.jsx',import.meta.url),'utf8')

test('protected bottom navigation uses Places and Entertainment without adding a sixth tab',()=>{
  assert.match(source,/const NAV=\[\['home','⌂','Home'\],\['places','⌕','Discover'\],\['entertainment','◇','Entertainment'\],\['plan','＋','Plan'\],\['profile','◎','Profile'\]\]/)
  const navLine=source.split('\n').find(x=>x.startsWith('const NAV='))||''
  assert.equal((navLine.match(/\],\[/g)||[]).length+1,5)
  assert.doesNotMatch(navLine,/'saved'/)
})

test('Places is persistent-entity discovery and does not render event results into the directory lane',()=>{
  assert.match(source,/const PLACE_CATEGORY_KEYS=new Set/)
  assert.match(source,/const placesTaxonomy=useMemo/)
  assert.match(source,/COMPLETE_UPGRADE&&tab==='places'/)
  assert.match(source,/eventsFirst=\{false\}/)
  assert.match(source,/Search Atlanta places/)
})

test('Entertainment is time-first and exposes the approved compact activity lanes',()=>{
  assert.match(source,/COMPLETE_UPGRADE&&tab==='entertainment'/)
  assert.match(source,/EntertainmentHub/)
  for(const label of ['Tonight','This Weekend','Upcoming','Nightlife','Concerts','Festivals + Events','Sports','Interactive','Family','Attractions'])assert.ok(hub.includes(label),`Entertainment marker missing: ${label}`)
  assert.match(hub,/gtc-entertainment-lanes/)
})

test('Saved functionality moved into Profile as My GOOD TIMES instead of being deleted',()=>{
  assert.match(source,/COMPLETE_UPGRADE&&tab==='profile'&&<ProfileHub/)
  assert.match(profileHub,/MyGoodTimesLibrary/)
  assert.match(details,/My GOOD TIMES/)
  for(const label of ['Plans','Places','Entertainment'])assert.ok(details.includes(label))
  for(const label of ['Library','Following','Preferences','Account'])assert.ok(profileHub.includes(label))
  assert.match(source,/onEntertainment=\{\(\)=>goTab\('entertainment'\)\}/)
})
