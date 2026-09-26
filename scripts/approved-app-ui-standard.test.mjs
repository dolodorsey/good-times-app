import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const app=fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8')
const css=fs.readFileSync(new URL('../src/features/experience/good-times-approved-ui-standard.css',import.meta.url),'utf8')
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')

test('approved GOOD TIMES UI keeps the protected five-destination app contract',()=>{
  assert.match(app,/const NAV=\[\['home','⌂','Home'\],\['discover','⌕','Discover'\],\['plan','＋','Plan'\],\['saved','▣','Saved'\],\['profile','◎','Profile'\]\]/)
  assert.doesNotMatch(app,/\['upcoming'[^\]]*'Upcoming'\].*const NAV/)
  assert.match(app,/openEvent=e=>/)
  assert.match(app,/toggleSave=async\(type,id\)=>/)
  assert.match(app,/toggleFollow=async\(type,item\)=>/)
  assert.match(app,/shareExperience=async\(type,item\)=>/)
  assert.match(app,/runConcierge=async/)
})

test('Upcoming is a secondary in-app newsletter view over existing live inventory',()=>{
  assert.match(app,/\['for-you','For You'\],\['upcoming','Upcoming'\],\['tonight','Tonight'\]/)
  assert.match(app,/const upcomingEvents=useMemo\(\(\)=>activeEvents\.filter/)
  assert.match(app,/function UpcomingNewsletter/)
  assert.match(app,/function UpcomingRow/)
  assert.match(app,/events=\{upcomingEvents\}/)
  assert.match(app,/onOpen=\{openEvent\}/)
  assert.match(app,/onSave=\{toggleSave\}/)
  assert.doesNotMatch(app,/SEP 18|SEP 24|2024|2025/)
})

test('approved UI standard loads last and enforces compact app-first visual rules',()=>{
  const approved=main.indexOf("good-times-approved-ui-standard.css")
  const customer=main.indexOf("good-times-customer-enhancements.css")
  assert.ok(approved>customer,'approved standard must be the final GOOD TIMES UI authority')
  assert.match(css,/\.gt5-home-modes/)
  assert.match(css,/\.gt5-upcoming-row/)
  assert.match(css,/min-height:82px/)
  assert.match(css,/\.gt5-section h2\{font-size:21px/)
  assert.match(css,/\.gt5-home-hero\{min-height:348px/)
  assert.match(css,/font-family:var\(--gt5-sans\)/)
  assert.match(css,/\.gt5-hero h1,.gt5-detail-body h1,.gt5-itinerary-hero h1\{font-family:var\(--gt5-serif\)\}/)
})
