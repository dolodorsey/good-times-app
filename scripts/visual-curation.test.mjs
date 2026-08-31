import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { diversifyEventsByVenue } from '../api/data-fast.js'

const explore=fs.readFileSync(new URL('../src/features/experience/ExploreTaxonomyBrowser.jsx',import.meta.url),'utf8')
const builder=fs.readFileSync(new URL('../src/features/experience/BuildMyNightPanel.jsx',import.meta.url),'utf8')
const refresh=fs.readFileSync(new URL('../src/features/experience/good-times-creative-refresh.css',import.meta.url),'utf8')

const event=(id,venue,time='22:00')=>({event_key:id,event_date:'2026-08-09',event_time:time,venue_name:venue})

test('same-night curation shows one venue each before repeating a venue',()=>{
  const rows=[event('u1','Utopia'),event('u2','Utopia','23:00'),event('v1','Vision'),event('j1','Josephine'),event('u3','Utopia','21:00'),event('p1','P Sports Bar')]
  const curated=diversifyEventsByVenue(rows)
  assert.deepEqual(curated.slice(0,4).map(item=>item.venue_name),['Utopia','Vision','Josephine','P Sports Bar'])
  assert.deepEqual(curated.slice(4).map(item=>item.event_key),['u2','u3'])
})

test('Explore category controls avoid misleading venue photos and preserve exact inventory counts',()=>{
  assert.match(explore,/data-creative-mode="taxonomy-icons"/)
  assert.match(explore,/categoryHue/)
  assert.doesNotMatch(explore,/--gt-cat-image/)
  assert.match(explore,/category\.count/)
})

test('Build My Night exposes a dense working brief instead of decorative preview art',()=>{
  assert.match(builder,/Four choices\. One complete route\./)
  assert.match(builder,/gt4-night-fields/)
  assert.match(builder,/When/)
  assert.match(builder,/People/)
  assert.match(builder,/Vibe/)
  assert.match(builder,/Budget/)
  assert.match(builder,/Update route/)
})

test('toolbar uses six image-backed navigation controls from the Supabase pack',()=>{
  const matches=refresh.match(/good-times-backgrounds\/nav-icon-[^)']+/g)||[]
  assert.equal(new Set(matches).size,6)
})
