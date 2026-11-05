import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cleanTitle, collapseRuns, runLine, rankMarquee, marqueeScore, matchupTeams } from '../src/features/experience/complete/model.js'
import { hardenDisplayInventory } from '../src/features/experience/good-times-media-uniqueness.js'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('club calendar sentences become readable card titles', () => {
  assert.equal(cleanTitle('Franky Rizardo headlines at District Atlanta on Friday, November 6, 2026'), 'Franky Rizardo')
  assert.equal(cleanTitle('San Pacho is dropping the heat on Atlanta on Friday, December 11'), 'San Pacho')
  assert.equal(cleanTitle('Krewella New Album Tour at District Atlanta on Friday, December 4'), 'Krewella New Album Tour')
  assert.equal(cleanTitle('SIDEQUEST | Saturday November 7th 2026 | District Atlanta'), 'SIDEQUEST')
  assert.equal(cleanTitle('Chomp &amp; Stomp'), 'Chomp & Stomp')
})

test('real event names that merely mention a place are left alone', () => {
  assert.equal(cleanTitle('Hawks vs Lakers'), 'Hawks vs Lakers')
  assert.equal(cleanTitle('Georgia Tech vs Louisville'), 'Georgia Tech vs Louisville')
  assert.equal(cleanTitle('Usher + Chris Brown: The R&B Tour'), 'Usher + Chris Brown: The R&B Tour')
})

test('a multi-night run is one card that names its other dates', () => {
  const nights = ['2026-11-05', '2026-11-06', '2026-11-08', '2026-11-10', '2026-11-11'].map(event_date => ({ event_key: event_date, event_date, title: 'Usher + Chris Brown: The R&B Tour', venue_name: 'Mercedes-Benz Stadium' }))
  const runs = collapseRuns(nights)
  assert.equal(runs.length, 1)
  assert.equal(runs[0].event_date, '2026-11-05')
  assert.equal(runLine(runs[0]), 'Also Nov 6, 8, 10, 11')
})

test('the same title at a different venue stays a separate card', () => {
  const rows = [{ event_date: '2026-11-05', title: 'Open Night', venue_name: 'A' }, { event_date: '2026-11-06', title: 'Open Night', venue_name: 'B' }]
  assert.equal(collapseRuns(rows).length, 2)
})

test('the top of the city leads over a member pick-up party', () => {
  const stadium = { title: 'Usher + Chris Brown: The R&B Tour', venue_name: 'Mercedes-Benz Stadium', category_key: 'concerts_live_music', is_featured: true }
  const pickup = { title: 'November Vinofile VIP+ Pick-Up Party', venue_name: 'City Winery Atlanta', category_key: 'concerts_live_music', good_times_score: 80 }
  assert.ok(marqueeScore(stadium) > marqueeScore(pickup))
  assert.equal(rankMarquee([pickup, stadium])[0].title, stadium.title)
})

test('matchup art only applies to real sports matchups', () => {
  assert.deepEqual(matchupTeams({ category_key: 'sports_watch', title: 'Hawks vs Lakers' }), ['Hawks', 'Lakers'])
  assert.equal(matchupTeams({ category_key: 'comedy_performing_arts', title: 'Roast vs Toast' }), null)
  assert.equal(matchupTeams({ category_key: 'sports_watch', title: 'SEC Championship' }), null)
})

test('another night of a show keeps its art, but a different event cannot reuse it', () => {
  const art = 'https://example.com/tour.jpg'
  const { events } = hardenDisplayInventory([
    { event_key: 'a', title: 'The Show', venue_name: 'Arena', event_date: '2026-11-05', image_url: art },
    { event_key: 'b', title: 'The Show', venue_name: 'Arena', event_date: '2026-11-06', image_url: art },
    { event_key: 'c', title: 'Other Show', venue_name: 'Arena', event_date: '2026-11-07', image_url: art },
  ], [])
  assert.equal(events[0].image_url, art)
  assert.equal(events[1].image_url, art)
  assert.equal(events[2].image_url, null)
})

test('every Nightlife entry point lands on one destination with one switch', () => {
  const app = read('src/features/experience/GoodTimesCommandAppV4.jsx')
  assert.match(app, /collection\.category==='nightlife'&&<NightlifeSwitch view="events"/)
  assert.match(app, /<LaneHero lane="nightlife"\/><NightlifeSwitch view="places"/)
  assert.match(read('src/features/experience/complete/EntertainmentHub.jsx'), /\['nightlife','Bars & Lounges'/)
})

test('official calendars reach customers, Eventbrite buckets stay behind the editorial selector', () => {
  const sql = read('supabase/migrations/20261105213000_gt_official_calendar_inventory_v1.sql')
  assert.match(sql, /gt_is_official_calendar_source\(source\)/)
  assert.match(sql, /!~\* '\(university\|eventbrite\|allevents\|instagram\|perplexity\|scout\)'/)
  assert.match(sql, /status in \('confirmed','tentative'\)/)
  assert.match(sql, /image_url is not null/)
  assert.match(sql, /ticket_url is not null/)
})

test('Black Pages load cannot lock customers out while verified inventory is cached', () => {
  const guard = read('public/gt-service-guard.js')
  assert.match(guard, /cachedInventoryReady/)
  assert.match(guard, /degraded-cached-inventory/)
})
