import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupeCustomerEvents, inferCustomerTaxonomy } from '../api/data.js'

test('band names containing country are not treated as country music', () => {
  const taxonomy = inferCustomerTaxonomy({
    event_type: 'concert',
    event_name: 'Black Country, New Road',
    venue_name: 'Variety Playhouse',
    genre: null,
    subcategory_key_v2: null,
  })
  assert.equal(taxonomy.category, 'concerts_live_music')
  assert.notEqual(taxonomy.subcategory, 'country')
})

test('explicit country genre still maps to country music', () => {
  const taxonomy = inferCustomerTaxonomy({
    event_type: 'concert',
    event_name: 'Summer Tour',
    venue_name: 'Variety Playhouse',
    genre: 'country',
  })
  assert.deepEqual(taxonomy, { category: 'concerts_live_music', subcategory: 'country' })
})

test('unrelated reviewed subcategories do not leak into concert taxonomy', () => {
  const taxonomy = inferCustomerTaxonomy({
    event_type: 'concert',
    event_name: 'Saturday Night Sets',
    venue_name: 'Chattahoochee Food Works',
    subcategory_key_v2: 'shopping_markets',
  })
  assert.deepEqual(taxonomy, { category: 'concerts_live_music', subcategory: 'intimate_shows' })
})

test('non-sports watch parties do not appear under sports', () => {
  const taxonomy = inferCustomerTaxonomy({
    event_type: 'nightlife',
    event_name: 'RHOA Reunion Watch Party',
    venue_name: 'Aye Tea Elle',
    category_key_v2: 'sports_watch',
    subcategory_key_v2: 'watch_parties',
  })
  assert.deepEqual(taxonomy, { category: 'nightlife', subcategory: 'late_night' })
})

test('sports watch parties remain under sports', () => {
  const taxonomy = inferCustomerTaxonomy({
    event_type: 'special_event',
    event_name: 'Falcons Watch Party',
    venue_name: 'Sports & Social',
  })
  assert.deepEqual(taxonomy, { category: 'sports_watch', subcategory: 'watch_parties' })
})

test('duplicate listings sharing the same ticket destination collapse to one event', () => {
  const rows = [
    {
      id: 'a', event_name: 'Velvet After Dark: Volume IV', show_date: '2026-08-13', venue_name: 'Apache XLR',
      ticket_url: 'https://www.eventbrite.com/e/velvet-after-dark-volume-iv-tickets-1993798804897?aff=one',
      good_times_score: 65, display_priority: 34, is_curated: true,
    },
    {
      id: 'b', event_name: 'Velvet After Dark: An Intimate Night of Live Music', show_date: '2026-08-13', venue_name: 'Apache XLR',
      ticket_url: 'https://www.eventbrite.com/e/velvet-after-dark-volume-iv-tickets-1993798804897?aff=two',
      good_times_score: 67, display_priority: 34, is_curated: true,
    },
  ]
  const deduped = dedupeCustomerEvents(rows)
  assert.equal(deduped.length, 1)
  assert.equal(deduped[0].id, 'b')
})

test('Ticketmaster search links keep distinct artist searches separate', () => {
  const rows = [
    { id:'a', event_name:'Artist One', show_date:'2026-09-01', venue_name:'Arena', ticket_url:'https://www.ticketmaster.com/search?q=artist+one&city=atlanta', good_times_score:60 },
    { id:'b', event_name:'Artist Two', show_date:'2026-09-02', venue_name:'Arena', ticket_url:'https://www.ticketmaster.com/search?q=artist+two&city=atlanta', good_times_score:60 },
  ]
  assert.equal(dedupeCustomerEvents(rows).length, 2)
})