import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8')
const css=fs.readFileSync(new URL('../src/features/experience/good-times-this-week.css',import.meta.url),'utf8')

test('This Week is a live editorial quick view, not a hard-coded flyer',()=>{
  assert.match(app,/function ThisWeekOverlay/)
  assert.match(app,/events=\{week\}/)
  assert.match(app,/venues=\{homeVenues\}/)
  assert.match(app,/compactWeekRange\(events\)/)
  assert.match(app,/FOOD \+ DRINK/)
  assert.match(app,/NIGHTLIFE/)
  assert.match(app,/SPORTS/)
  assert.match(app,/CULTURE/)
  assert.match(app,/SEE EVERYTHING/)
  assert.doesNotMatch(app,/SEP 18|SEP 24|2024/)
})

test('Home exposes This Week without removing the six-action compact layout',()=>{
  assert.match(app,/\['▤','This Week','this-week'\]/)
  const quick=app.match(/\[\['🍴','Restaurants','dining'\][\s\S]*?\]\]\.map\(\(\[icon,label,value\]\)/)
  assert.ok(quick,'six compact home actions should remain data-driven')
  assert.match(app,/setWeeklyOpen\(true\)/)
})

test('This Week is a focused modal surface with mobile and desktop contracts',()=>{
  assert.match(css,/\.gt-week\{position:fixed;inset:0/)
  assert.match(css,/\.gt-week-grid\{display:grid;grid-template-columns:1fr/)
  assert.match(css,/@media\(min-width:680px\)/)
  assert.match(css,/grid-template-columns:1fr 1fr/)
  assert.match(css,/env\(safe-area-inset-bottom/)
})
