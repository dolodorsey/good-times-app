import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as rules from '../supabase/functions/_shared/gt-source-occurrence.mjs';
import { laneOf, parsePage } from '../supabase/functions/gt-atlanta-priority-scout/scout-core.mjs';

const NOW = '2026-10-07T12:00:00Z';
const source = { id: 'source-a', source_name: 'Eventbrite ATL · Trains & Transportation',
  source_type: 'eventbrite', source_url: 'https://www.eventbrite.com/d/ga--atlanta/trains-and-transportation/' };
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/collector-legacy-occurrences.json', import.meta.url), 'utf8')).rows;
const base = { name: 'Live performance', date: '2026-10-31', time: '19:00', venue: 'Hertz Stage',
  address: '1280 Peachtree St NE, Atlanta, GA 30309', sourceUrl: 'https://www.eventbrite.com/e/a-show-tickets-1991234567890',
  ticket: 'https://www.eventbrite.com/e/a-show-tickets-1991234567890', raw: { '@type': 'Event', url: 'https://www.eventbrite.com/e/a-show-tickets-1991234567890' } };
const identity = (e = base) => rules.occurrenceIdentity(e, { sourceUrl: source.source_url });
const hash = (e = base) => rules.occurrenceHash(identity(e).key);
const existing = (e = base, extra = {}) => ({ id: 'kept-source-uuid', city: 'atlanta', event_name: e.name,
  event_date: e.date, event_time: e.time, venue_name: e.venue, venue_address: e.address,
  ticket_url: e.ticket, source_url: e.sourceUrl, raw_data: { jsonld: e.raw }, ...extra });

function fakeDb(rows, error = null) {
  const calls = [];
  return { calls, from(table) {
    assert.equal(table, 'gt_sourced_events');
    const filters = [];
    const field = (row, key) => key.startsWith('raw_data->occurrence_identity->>')
      ? row.raw_data?.occurrence_identity?.[key.split('->>').at(-1)] : row[key];
    const q = {
      select() { return q; },
      ilike(key, value) { calls.push(['ilike', key, value]); filters.push((r) => String(field(r, key) ?? '').toLowerCase() === value.toLowerCase()); return q; },
      eq(key, value) { calls.push(['eq', key, value]); filters.push((r) => field(r, key) === value); return q; },
      in(key, value) { filters.push((r) => value.includes(field(r, key))); return q; },
      like(key, value) {
        const re = new RegExp('^' + value.split('%').map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
        filters.push((r) => re.test(field(r, key) ?? '')); return q;
      },
      async limit(limit) { return { data: rows.filter((r) => filters.every((f) => f(r))).slice(0, limit), error }; },
    };
    return q;
  } };
}

// Execute the production parser functions after removing only runtime imports and
// the server entrypoint. No network or Deno server runs in these parser fixtures.
function parser(functionName, parserName) {
  const path = new URL(`../supabase/functions/${functionName}/index.ts`, import.meta.url);
  const code = fs.readFileSync(path, 'utf8').split('Deno.serve(')[0]
    .replace(/^import[\s\S]*?;\n/gm, '');
  class Clock extends Date { constructor(value) { super(value === undefined ? NOW : value); } static now() { return +new Date(NOW); } }
  const imports = { classifyEvent: rules.classifyEvent, collectorDateParts: rules.eventDateParts,
    findExistingOccurrence: rules.findExistingOccurrence, OccurrenceIdentityConflict: rules.OccurrenceIdentityConflict,
    sourcedEventRecord: rules.sourcedEventRecord, uniqueOccurrences: rules.uniqueOccurrences, Date: Clock };
  return new Function(...Object.keys(imports), `${stripTypeScriptTypes(code)}; return ${parserName};`)(...Object.values(imports));
}
const eventbriteParser = parser('gt-atlanta-eventbrite-refresh', 'parseEventbrite');
const officialParser = parser('gt-atlanta-source-refresh', 'parseEvents');
const html = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;

test('Transportation and tour discovery labels cannot classify the acting audit as sports or a concert', () => {
  const o = { '@type': 'Event', name: 'THE ACTORS DISTRICT | FREE AUDIT| MODEx STUDIO', startDate: '2026-10-31',
    url: base.sourceUrl, location: { name: 'MODEx Studio', address: { streetAddress: '3005 Peachtree Rd', addressLocality: 'Atlanta', addressRegion: 'GA', addressCountry: 'US' } } };
  const event = eventbriteParser(html(o), source.source_url).accepted[0];
  assert.equal(event.eventType, 'play');
  assert.equal(rules.classifyEvent('Trains and Transportation Expo'), 'festival');
  assert.equal(rules.classifyEvent('Atlanta stadium tours'), 'special_event');
  assert.equal(rules.classifyEvent('Business matchmaking and game night'), 'special_event');
  assert.equal(rules.classifyEvent('Sports watch party'), 'sports');
  assert.equal(rules.classifyEvent('Community match', 'SportsEvent'), 'sports');
});

test('Known sports team prefixes and WNBA playoffs override a generic concert venue lane/type', () => {
  for (const title of ['Atlanta Dream Playoffs: Semifinals Game 2', 'WNBA Playoffs Game 2', 'Atlanta Hawks vs Miami Heat', 'Atlanta United FC vs Nashville SC']) {
    assert.equal(rules.classifyEvent(title, 'MusicEvent'), 'sports');
    assert.equal(laneOf({ name: title, '@type': 'MusicEvent' }, { lane: 'concert' }), 'sports');
  }
  assert.equal(laneOf({ name: 'Ali Siddiq' }, { lane: 'concert' }), 'comedy');
  assert.equal(laneOf({ name: 'Hamilton' }, { lane: 'concert' }), 'play');
  assert.equal(laneOf({ name: 'An artist without a category' }, { lane: 'concert' }), 'concert');
});

test('Priority scout retains its existing source approval and publication safeguards', () => {
  const o = { '@type': 'Event', name: 'Atlanta Dream Playoffs Game 2', startDate: '2026-10-31T19:00:00-04:00',
    url: 'https://arena.example/events/dream', image: 'https://arena.example/dream.jpg',
    location: { name: 'State Farm Arena', address: { addressLocality: 'Atlanta', addressRegion: 'GA' } },
    offers: { url: 'https://tickets.example/dream' } };
  const policy = { official: true, canonical_venue: 'State Farm Arena', source_url: 'https://arena.example/events', lane: 'concert' };
  const accepted = parsePage(html(o), policy.source_url, policy, new Date(NOW)).events[0];
  assert.equal(accepted.eventType, 'sports');
  assert.equal(accepted.publication, true);
  assert.equal(parsePage(html(o), policy.source_url, { ...policy, official: false }, new Date(NOW)).events[0].publication, false);
  assert.equal(parsePage(html({ ...o, startDate: '2026-10-31' }), policy.source_url, policy, new Date(NOW)).events[0].publication, false);
  assert.equal(parsePage(html({ ...o, eventStatus: 'EventCancelled' }), policy.source_url, policy, new Date(NOW)).events[0].publication, false);
});

test('A parent Eventbrite ticket ID never collapses two performances or an unknown time into a session', async () => {
  const events = [base, { ...base, time: '21:30' }, { ...base, time: null }, { ...base, time: '00:00' }];
  const unique = await rules.uniqueOccurrences(events, { sourceUrl: source.source_url });
  assert.equal(unique.entries.size, 4);
  for (const { identity: i } of unique.entries.values()) {
    assert.equal(i.provider_event_id, '1991234567890');
    assert.equal(i.provider_occurrence_id, null);
  }
  assert.notEqual(await hash(base), await hash({ ...base, venue: 'Another venue' }));
  assert.notEqual(await hash(base), await hash({ ...base, address: 'Another full address' }));
});

test('Refreshes of the same occurrence keep their source UUID and editorial state', async () => {
  const original = existing(base, { dedup_hash: await hash(), is_verified: true, is_published: false, published_to_gt: true,
    source_id: 'original-registry-uuid', source_name: 'Original source', legacy_quarantined_at: NOW, legacy_quarantine_reason: 'manual_hold',
    raw_data: { jsonld: base.raw, promotion: { publisher: 'set_based_v2' }, occurrence_identity: identity(),
      locked_fields: ['event_type'], source_confirmations: ['Original source'] } });
  const found = await rules.findExistingOccurrence(fakeDb([original]), base, identity(), await hash());
  assert.equal(found.id, original.id);
  const update = rules.sourcedEventRecord({ event: { ...base, eventType: 'concert' }, source, identity: identity(), dedupHash: await hash(), existing: found, observedAt: NOW, collectedVia: 'test' });
  for (const key of ['id', 'is_verified', 'is_published', 'published_to_gt', 'legacy_quarantined_at', 'legacy_quarantine_reason', 'event_type']) assert.equal(Object.hasOwn(update, key), false, key);
  assert.equal(update.source_id, 'original-registry-uuid');
  assert.deepEqual(update.raw_data.promotion, original.raw_data.promotion);
  assert.equal(update.raw_data.source_observation.observed_at, NOW);
  assert.equal(update.raw_data.source_observation.editorial_verification, 'not_performed_by_collector');
  assert.deepEqual(update.raw_data.source_confirmations, ['Original source', source.source_name]);
  assert.equal((await rules.uniqueOccurrences([base, base], { sourceUrl: source.source_url })).entries.size, 1);
});

test('New structured observations are pending, including official and repeatedly discovered sources', async () => {
  for (const sourceType of ['eventbrite', 'official', 'venue', 'comedy_club']) {
    const record = rules.sourcedEventRecord({ event: base, source: { ...source, source_type: sourceType }, identity: identity(), dedupHash: await hash(), observedAt: NOW, collectedVia: 'test' });
    assert.equal(record.is_verified, false);
    assert.equal(record.is_published, false);
    assert.equal(record.published_to_gt, false);
  }
});

test('Cancellation and postponement observations refresh the same source UUID without self-publishing new intake', async () => {
  const o = { '@type': 'Event', name: 'Scheduled performance', startDate: '2026-10-31T19:00:00-04:00',
    url: base.sourceUrl, location: { name: 'Hertz Stage', address: { streetAddress: '1280 Peachtree St NE', addressLocality: 'Atlanta', addressRegion: 'GA', addressCountry: 'US' } } };
  const scheduled = eventbriteParser(html(o), source.source_url).accepted[0];
  const original = existing(scheduled, { is_verified: true, is_published: true, published_to_gt: true });
  for (const status of ['EventCancelled', 'EventPostponed']) {
    const parsed = eventbriteParser(html({ ...o, eventStatus: `https://schema.org/${status}` }), source.source_url);
    assert.equal(parsed.rejected.length, 0);
    const observed = parsed.accepted[0];
    const i = identity(observed);
    const dedupHash = await rules.occurrenceHash(i.key);
    const found = await rules.findExistingOccurrence(fakeDb([original]), observed, i, dedupHash);
    assert.equal(found.id, original.id);
    const update = rules.sourcedEventRecord({ event: observed, source, identity: i, dedupHash, existing: found, observedAt: NOW, collectedVia: 'test' });
    assert.equal(update.raw_data.jsonld.eventStatus, `https://schema.org/${status}`);
    assert.equal(Object.hasOwn(update, 'published_to_gt'), false);
    const intake = rules.sourcedEventRecord({ event: observed, source, identity: i, dedupHash, observedAt: NOW, collectedVia: 'test' });
    assert.equal(intake.is_published, false);
    assert.equal(intake.is_verified, false);
  }
});

test('Explicit native session IDs survive a schedule correction, but contradictory same-batch sessions are held', async () => {
  const native = { ...base, raw: { ...base.raw, performanceId: 'performance-123' } };
  const changed = { ...native, date: '2026-11-01', time: '20:00' };
  assert.equal(identity(native).provider_occurrence_id, 'eventbrite:performance-123');
  assert.equal(await hash(native), await hash(changed));
  assert.equal(rules.matchesExistingOccurrence(existing(native), changed, identity(changed)), true);
  const result = await rules.uniqueOccurrences([native, changed], { sourceUrl: source.source_url });
  assert.equal(result.entries.size, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(result.rejected, 2);
  const otherNative = { ...native, raw: { ...native.raw, performanceId: 'performance-456' } };
  assert.equal(rules.matchesExistingOccurrence(existing(native), otherNative, identity(otherNative)), false);
  assert.equal(await rules.findExistingOccurrence(fakeDb([existing(native)]), otherNative, identity(otherNative), await hash(otherNative)), null);
});

test('An exact title/date cannot overwrite a different city, venue, provider or time', async () => {
  const variants = [existing(base, { city: 'miami' }), existing({ ...base, time: '21:00' }), existing({ ...base, time: null }),
    existing({ ...base, venue: 'Another room' }), existing({ ...base, address: 'Another full address' }),
    existing({ ...base, raw: { ...base.raw, url: 'https://www.eventbrite.com/e/other-tickets-1999999999999' }, ticket: 'https://www.eventbrite.com/e/other-tickets-1999999999999', sourceUrl: 'https://www.eventbrite.com/e/other-tickets-1999999999999' })];
  const db = fakeDb(variants.map((r, i) => ({ ...r, id: `different-${i}` })));
  assert.equal(await rules.findExistingOccurrence(db, base, identity(), await hash()), null);
  assert.ok(db.calls.filter((c) => c[0] === 'ilike').every((c) => c[1] === 'city' && c[2] === 'atlanta'));
});

test('Ambiguous legacy records and bounded-read overflows hold the observation instead of selecting a first UUID', async () => {
  await assert.rejects(() => rules.findExistingOccurrence(fakeDb([existing(), existing(base, { id: 'second-uuid' })]), base, identity(), 'new-hash'), /multiple_existing_occurrence_ids/);
  await assert.rejects(() => rules.findExistingOccurrence(fakeDb(Array.from({ length: 101 }, (_, i) => existing(base, { id: `uuid-${i}` }))), base, identity(), 'new-hash'), /identity_lookup_exceeded_safe_bound/);
  await assert.rejects(() => rules.findExistingOccurrence(fakeDb([], new Error('database unavailable')), base, identity(), 'new-hash'), /database unavailable/);
});

test('Real legacy JSON-LD records keep their UUID even when old source-refresh stored UTC as local time', async () => {
  for (const row of fixture) {
    const e = rules.legacyOccurrence(row);
    const i = rules.occurrenceIdentity(e, { sourceUrl: source.source_url });
    const found = await rules.findExistingOccurrence(fakeDb([row]), e, i, await rules.occurrenceHash(i.key));
    assert.equal(found.id, row.id);
    assert.equal(rules.matchesExistingOccurrence({ ...row, city: 'miami' }, e, i), false);
  }
  const aquarium = fixture.find((r) => r.venue_name === 'Georgia Aquarium');
  assert.equal(aquarium.event_time, '23:30');
  assert.equal(rules.legacyOccurrence(aquarium).time, '19:30');
  const alliance = fixture.find((r) => r.venue_name === 'Hertz Stage');
  assert.equal(alliance.event_time, '19:00');
  assert.equal(rules.legacyOccurrence(alliance).time, '14:00');
  assert.equal(officialParser(html(alliance.raw_data.jsonld), alliance.source_url)[0].time, '14:00');
  assert.equal(officialParser(html(aquarium.raw_data.jsonld), aquarium.source_url)[0].time, '19:30');
});

test('Local date parsing preserves date-only precision and explicitly converts UTC across the calendar boundary', () => {
  assert.deepEqual(rules.eventLocalParts('2026-10-31'), { date: '2026-10-31', time: null });
  assert.deepEqual(rules.eventLocalParts('2026-10-31T00:30:00Z'), { date: '2026-10-30', time: '20:30' });
  assert.deepEqual(rules.eventLocalParts('20261031T003000Z'), { date: '2026-10-30', time: '20:30' });
  assert.equal(rules.eventLocalParts('2026-02-30'), null);
  assert.equal(rules.eventLocalParts('2026-10-31T24:01'), null);
  assert.equal(rules.eventDateParts('2026-10-06', new Date(NOW)), null);
  assert.equal(rules.eventDateParts('2030-10-31', new Date(NOW)), null);
});

test('Structured offer facts preserve explicit prices and unknowns without inferring free admission', () => {
  const observed = (offers, extra = {}) => rules.structuredObservationFacts({ offers, ...extra });
  const unknownPrice = { price_min: null, price_max: null, currency: null, price_basis: null };
  const prices = ({ price_min, price_max, currency, price_basis }) => ({ price_min, price_max, currency, price_basis });
  assert.deepEqual(prices(observed({ price: 0, priceCurrency: 'USD' })), { price_min: 0, price_max: 0, currency: 'USD', price_basis: null });
  assert.equal(observed({ price: 0, priceCurrency: 'USD' }).isAccessibleForFree, null);
  assert.equal(observed({ price: 0, priceCurrency: 'USD' }, { isAccessibleForFree: false }).isAccessibleForFree, false);
  assert.equal(observed({}, { isAccessibleForFree: 'true' }).isAccessibleForFree, null);
  assert.deepEqual(prices(observed({ lowPrice: '25.50', highPrice: 89, priceCurrency: 'usd' })), { price_min: 25.5, price_max: 89, currency: 'USD', price_basis: null });
  assert.deepEqual(prices(observed({ lowPrice: 25, priceCurrency: 'USD' })), { price_min: 25, price_max: null, currency: 'USD', price_basis: null });
  assert.deepEqual(prices(observed([{ price: '10', priceCurrency: 'USD' }, { price: 40, priceCurrency: 'USD' }])), { price_min: 10, price_max: 40, currency: 'USD', price_basis: null });
  for (const offers of [undefined, {}, { price: 'Free', priceCurrency: 'USD' }, { price: true, priceCurrency: 'USD' },
    { price: '$20', priceCurrency: 'USD' }, { price: Infinity, priceCurrency: 'USD' }, { price: -1, priceCurrency: 'USD' },
    { price: 20 }, { lowPrice: 50, highPrice: 10, priceCurrency: 'USD' },
    { price: 20, lowPrice: 10, priceCurrency: 'USD' },
    [{ price: 10, priceCurrency: 'USD' }, { price: 20, priceCurrency: 'CAD' }],
    [{ price: 10, priceCurrency: 'USD' }, { priceCurrency: 'USD' }]]) assert.deepEqual(prices(observed(offers)), unknownPrice);
  assert.equal(observed([{ availability: 'InStock' }, { availability: 'SoldOut' }]).availability, null);
  assert.equal(observed([{ availability: 'SoldOut' }, { availability: 'SoldOut' }]).availability, 'SoldOut');
});

test('Each current JSON-LD event supplies its own latest price snapshot, including explicit withdrawals', () => {
  const o = { '@type': 'MusicEvent', name: 'Priced show', startDate: '2026-10-31T19:00:00-04:00',
    url: 'https://arena.example/events/priced-show', image: 'https://arena.example/show.jpg',
    location: { name: 'State Farm Arena', address: { addressLocality: 'Atlanta', addressRegion: 'GA' } },
    offers: { url: 'https://tickets.example/show', price: 65, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    isAccessibleForFree: false };
  const policy = { official: true, canonical_venue: 'State Farm Arena', source_url: 'https://arena.example/events', lane: 'concert' };
  const event = parsePage(html([o, { ...o, name: 'Separate offer', offers: { price: 99, priceCurrency: 'USD' } }]), policy.source_url, policy, new Date(NOW)).events[0];
  assert.equal(event.raw.price_min, 65);
  assert.deepEqual(event.raw.source_observation.facts, rules.structuredObservationFacts(o));
  assert.equal(event.raw.source_observation.observed_at, new Date(NOW).toISOString());
  const previous = existing(base, { raw_data: { source_observation: { version: 2, facts: { price_min: 99, currency: 'USD' } } } });
  const updated = rules.sourcedEventRecord({ event: { ...base, raw: { ...base.raw, offers: {} } }, source,
    identity: identity(), dedupHash: 'unused', existing: previous, observedAt: NOW, collectedVia: 'test' });
  assert.equal(updated.raw_data.source_observation.facts.price_min, null);
  assert.equal(updated.raw_data.source_observation.facts.currency, null);
  assert.equal(updated.raw_data.source_observation.facts.isAccessibleForFree, null);
  assert.equal(Object.hasOwn(updated, 'is_verified'), false);
});
