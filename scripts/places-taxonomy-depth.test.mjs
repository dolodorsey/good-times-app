import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { humanize, labelFor } from '../src/features/experience/complete/model.js'
import { cuisinesFromText, restaurantCuisines, CUISINE_LABELS } from '../src/features/experience/complete/restaurant-cuisine.js'

test('raw taxonomy keys never reach customer labels', () => {
  assert.equal(humanize('afro_caribbean'), 'Afro-Caribbean')
  assert.equal(humanize('american_brasserie'), 'American Brasserie')
  assert.equal(humanize('Fine Dining'), 'Fine Dining')
  assert.equal(labelFor('attractions_experiences'), 'Attractions & Experiences')
  assert.equal(labelFor('travel_staycations'), 'Hotels & Staycations')
  assert.doesNotMatch(labelFor('fashion_beauty_shopping'), /_/)
})

test('cuisine lanes come only from reviewed tags or the venue sourced subcategory', () => {
  assert.deepEqual(cuisinesFromText('afro_caribbean'), ['caribbean'])
  assert.deepEqual(cuisinesFromText('thai_restaurant'), ['thai'])
  assert.deepEqual(cuisinesFromText('brewing_company'), [], 'brewing must not become wings')
  assert.deepEqual(cuisinesFromText('delivery'), [], 'delivery must not become deli')
  assert.deepEqual(cuisinesFromText('steakhouse'), ['steakhouse'], 'steakhouse must not become tea/cafe')
  assert.deepEqual(restaurantCuisines({ name: 'Sushi Palace', cuisine_tags: [], source_subcategory: 'restaurant' }), [], 'names are never used to guess cuisine')
  assert.deepEqual(restaurantCuisines({ cuisine_tags: ['seafood'], source_subcategory: 'steakhouse' }), ['seafood', 'steakhouse'])
  for (const key of restaurantCuisines({ cuisine_tags: ['italian'], source_subcategory: 'wine_bar_pizza' })) assert.ok(CUISINE_LABELS[key])
})

test('Places surfaces depth instead of dead ends', () => {
  const panel = fs.readFileSync('src/features/experience/CompactExplorePanel.jsx', 'utf8')
  assert.match(panel, /Coming soon/, 'empty subcategories stay visible but read as coming soon')
  assert.match(panel, /loadSubcategoryArt/, 'subcategory tiles use real venue photography')
  const v4 = fs.readFileSync('src/features/experience/GoodTimesCommandAppV4.jsx', 'utf8')
  assert.match(v4, /loadPlaceLaneArt/, 'Places lanes use distinct real venue photography')
  assert.match(v4, /gtc-lane-count/, 'Places lanes show verified place counts')
  const collections = fs.readFileSync('src/features/experience/complete/Collections.jsx', 'utf8')
  assert.match(collections, /CategoryPlacesFallback/, 'empty dated lanes fall back to verified places')
  const explorer = fs.readFileSync('src/features/experience/complete/RestaurantExplorer.jsx', 'utf8')
  assert.match(explorer, /Browse by cuisine/)
})

test('re-verification never upgrades unverified inventory', () => {
  const sql = fs.readFileSync('supabase/migrations/20261028063000_gt_venue_site_reverification_v1.sql', 'utf8')
  assert.match(sql, /v\.verification_status = 'verified_current'/)
  assert.match(sql, /v\.verified_at is not null/)
  assert.match(sql, /p_closed_signal is null/)
  assert.match(sql, /previous_freshness_expires_at/, 'every renewal is reversible')
})
