import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { titleKey, collapseByTitle, claim, collapseShows } from '../src/features/experience/complete/dedupe.js'

test('a show with several dates is one card with a more-dates count', () => {
  const rows = [
    { event_key: 'a1', title: 'DL Hughley', venue_name: 'The Punchline', event_date: '2026-11-13' },
    { event_key: 'a2', title: 'DL Hughley', venue_name: 'The Punchline', event_date: '2026-11-14' },
    { event_key: 'b1', title: 'Hawks vs Hornets', venue_name: 'State Farm Arena', event_date: '2026-11-20' },
    { event_key: 'c1', title: 'Chad Daniels', venue_name: 'The Punchline', event_date: '2026-11-13' },
  ]
  const out = collapseShows(rows)
  assert.deepEqual(out.map(r => r.event_key), ['a1', 'b1', 'c1'])
  assert.equal(out[0].more_dates, 1)
  assert.equal(out[1].more_dates, undefined)
})

test('screen-level claim never repeats an item across rails', () => {
  const used = new Set()
  const best = claim([{ event_key: 'x', title: 'Usher + Chris Brown: The R&B Tour' }], used)
  const tonight = claim([{ event_key: 'y', title: 'Usher + Chris Brown: The R&B Tour' }, { event_key: 'z', title: 'Gnarls Barkley' }], used)
  const places = claim([{ id: 'v1', name: 'Cosm Atlanta' }], used)
  const different = claim([{ id: 'v2', name: 'Cosm Atlanta' }, { id: 'v3', name: 'Puttshack Atlanta' }], used)
  assert.deepEqual(best.map(r => r.event_key), ['x'])
  assert.deepEqual(tonight.map(r => r.event_key), ['z'])
  assert.deepEqual(places.map(r => r.id), ['v1'])
  assert.deepEqual(different.map(r => r.id), ['v3'])
  assert.equal(titleKey({ title: 'Mary Mac’s Tea Room' }), titleKey({ title: 'Mary Mac’s Tea Room' }))
  assert.equal(collapseByTitle([{ id: 1, name: 'The Varsity' }, { id: 2, name: 'The Varsity' }]).length, 1)
})

test('Home and Entertainment use the screen dedupe; This Week tiles no longer repeat the category cards', () => {
  const home = fs.readFileSync('src/features/experience/complete/HomeScreen.jsx', 'utf8')
  assert.match(home, /claim\(bestRows/)
  assert.doesNotMatch(home, /weekTiles\.map/)
  assert.match(fs.readFileSync('src/features/experience/complete/EntertainmentHub.jsx', 'utf8'), /collapseShows\(rows\)/)
  assert.match(fs.readFileSync('src/features/experience/complete/Collections.jsx', 'utf8'), /collapseShows\(rows\)/)
})

test('Plan mood tiles each have their own art', () => {
  const src = fs.readFileSync('src/features/experience/complete/Planner.jsx', 'utf8')
  const art = src.match(/const MOOD_ART=\{([^}]+)\}/)[1].split(',').map(p => p.split(':').slice(1).join(':'))
  assert.equal(new Set(art).size, art.length)
})
