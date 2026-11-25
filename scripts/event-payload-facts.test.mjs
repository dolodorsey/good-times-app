import test from 'node:test'
import assert from 'node:assert/strict'
import liveHandler from '../api/data-live.js'
import { browse, browseScope, mapShow, showQuery } from '../api/browse.js'
import { savedContent } from '../api/saved-content.js'
import { buildGatewayQueries } from '../api/data.js'
import { eventFacts, SHOW_PUBLIC_FIELDS } from '../api/event-facts.js'

const NOW = Date.now()
const DATE = new Date(NOW + 86400000).toISOString().slice(0, 10)
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VENUE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const fixture = (patch = {}) => ({
  id: ID, city_key: 'atlanta', event_name: 'Source-backed concert fixture', event_type: 'concert',
  category_key_v2: 'concerts_live_music', subcategory_key_v2: 'intimate_shows',
  venue_id: VENUE, venue_name: 'Fixture Hall', venue_address: '12 Source Street, Atlanta, GA',
  show_date: DATE, show_time: '8:00 PM', doors_time: '7:00 PM', end_date: DATE, end_time: '11:00 PM',
  timezone: 'America/New_York', artist_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  ticket_url: 'https://example.test/ticket/session-one', source_url: 'https://example.test/event/session-one',
  source: 'Fixture official calendar', provider_occurrence_id: 'session-one',
  image_url: '/venues/revel.webp', description: 'Recorded program description.', organizer: 'Fixture organizer',
  ticket_price_min: '12.50', ticket_price_max: '75.00', currency: 'USD', price_basis: 'per_ticket',
  admission_type: 'ticketed', is_free: false, free_status: 'verified_paid', is_sold_out: false,
  age_requirement: '21+', age_requirement_verified_at: new Date(NOW - 1000).toISOString(),
  status: 'confirmed', fact_verified_at: new Date(NOW - 1000).toISOString(),
  valid_until: new Date(NOW + 3600000).toISOString(), updated_at: new Date(NOW).toISOString(),
  is_featured: true, is_curated: true, display_priority: 7, good_times_score: 93, quality_score: 89,
  ...patch,
})
const json = value => new Response(JSON.stringify(value), { status: 200 })
const response = () => ({ statusCode: 0, body: '', setHeader() {}, end(value) { this.body = value } })

function assertFacts(event, row) {
  assert.equal(event.event_key, `show:${ID}`)
  assert.equal(event.id, ID)
  assert.equal(event.source_id, ID)
  assert.equal(event.source_table, 'gt_shows')
  for (const key of ['venue_id','venue_address','artist_id','timezone','currency','price_basis',
    'admission_type','free_status','is_free','is_sold_out','age_requirement','age_requirement_verified_at',
    'provider_occurrence_id','fact_verified_at','valid_until','is_featured','is_curated','display_priority']) {
    assert.equal(event[key], row[key], key)
  }
  assert.equal(event.event_time, '20:00')
  assert.equal(event.performance_time, '20:00')
  assert.equal(event.doors_time, '19:00')
  assert.equal(event.event_end_time, '23:00')
  assert.equal(event.event_end_date, DATE)
  assert.equal(event.show_time_raw, '8:00 PM')
  assert.equal(event.doors_time_raw, '7:00 PM')
  assert.equal(event.end_time_raw, '11:00 PM')
  assert.equal(event.ticket_price_min, 12.5)
  assert.equal(event.ticket_price_max, 75)
  assert.equal(event.source_url, row.source_url)
  assert.equal(event.ticket_url, row.ticket_url)
}

test('Home cache payload preserves canonical identity, venue, source facts and manual curation', async () => {
  const original = globalThis.fetch, row = fixture(), snapshot = JSON.stringify(row)
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /gt_public_live_inventory_cache_only_v1$/)
    assert.equal(JSON.parse(options.body).p_city, 'atlanta')
    return json({ ok: true, is_service_date_match: true, is_fresh: true, payload: { events: [row], venues: [] } })
  }
  try {
    const res = response()
    await liveHandler({ method: 'GET', url: '/api/data-live?city=atlanta' }, res)
    assert.equal(res.statusCode, 200)
    const payload = JSON.parse(res.body)
    assert.equal(payload.events.length, 1)
    assertFacts(payload.events[0], row)
    assert.equal(JSON.stringify(row), snapshot)
  } finally { globalThis.fetch = original }
})

test('browse and saved hydration use the same facts and retain canonical bookmark keys', async () => {
  const row = fixture(), observed = []
  const fetcher = async url => { observed.push(new URL(url)); return json([row]) }
  const browsed = await browse('/api/browse?city=atlanta', { now: NOW, fetcher })
  const saved = await savedContent('/api/saved-content?items=' + encodeURIComponent(JSON.stringify([
    { kind: 'event', id: 'show:' + ID },
  ])), { now: NOW, fetcher })
  assertFacts(browsed.items[0], row)
  assertFacts(saved.items[0], row)
  for (const url of observed) {
    assert.equal(url.searchParams.get('city_key'), 'eq.atlanta')
    assert.equal(url.searchParams.get('select'), SHOW_PUBLIC_FIELDS)
  }
  assert.equal(observed[1].searchParams.get('id'), 'in.(' + ID + ')')
})

test('every public show projection includes new facts without an unbounded select', () => {
  const query = showQuery(browseScope('/api/browse', NOW), null, NOW)
  const legacy = new URL('https://example.test/' + buildGatewayQueries({ today: DATE }).eventPath)
  for (const projection of [query.get('select'), legacy.searchParams.get('select')]) {
    assert.equal(projection, SHOW_PUBLIC_FIELDS)
    assert.equal(projection.includes('*'), false)
    for (const key of ['venue_id','venue_address','doors_time','end_date','end_time','ticket_price_min',
      'ticket_price_max','free_status','age_requirement_verified_at','provider_occurrence_id','valid_until']) {
      assert.ok(projection.split(',').includes(key), key)
    }
  }
})

test('an inherited boolean or zero price never becomes an admission claim', () => {
  for (const isFree of [undefined, null, false, true]) {
    const event = mapShow(fixture({ event_name: 'Free entry fixture', free_status: null, is_free: isFree,
      ticket_price_min: 0, ticket_price_max: null, currency: null, price_basis: null }), NOW)
    assert.equal(event.is_free, null)
    assert.equal(event.free_status, 'unknown')
    assert.equal(event.is_free_raw, typeof isFree === 'boolean' ? isFree : null)
    assert.equal(event.ticket_price_min, 0)
    assert.equal(event.currency, null)
    assert.equal(event.price_basis, null)
  }
  assert.equal(eventFacts({ free_status: 'verified_free', is_free: false }).is_free, true)
  assert.equal(eventFacts({ free_status: 'verified_paid', is_free: true }).is_free, false)
  assert.equal(eventFacts({ free_status: 'conditional_free', is_free: true }).is_free, null)
})

test('legacy 18+ requires its own evidence marker, while source values remain inspectable', () => {
  const unknown = eventFacts(fixture({ age_requirement: '18+', age_requirement_verified_at: null }))
  assert.equal(unknown.age_requirement, null)
  assert.equal(unknown.age_requirement_raw, '18+')
  assert.ok(unknown.fact_verified_at, 'a generic fact review must not certify inherited age')
  assert.equal(eventFacts(fixture({ age_requirement: '18+' })).age_requirement, '18+')
  assert.equal(eventFacts({ age_requirement: 'All ages' }).age_requirement, 'All ages')
  assert.equal(eventFacts({ age_requirement: '21+' }).age_requirement, '21+')
})

test('missing relationships, unknown times and invalid amounts stay unknown', () => {
  const event = eventFacts({ venue_id: null, proposed_venue_id: VENUE, venue_name: 'Fixture Hall',
    show_time: 'Varies by session', doors_time: 'TBA', end_time: 'Unknown',
    ticket_price_min: '', ticket_price_max: false })
  assert.equal(event.venue_id, null)
  assert.equal(event.event_end_date, null)
  assert.equal(event.event_end_time, null)
  assert.equal(event.show_time_raw, 'Varies by session')
  assert.equal(event.end_time_raw, 'Unknown')
  assert.equal(event.ticket_price_min, null)
  assert.equal(event.ticket_price_max, null)
  assert.equal(event.timezone, null)
})
