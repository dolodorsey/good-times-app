import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { topPlaces, nightlifeKind, ownerTypeLabel } from '../src/features/experience/complete/top-places.js'
import { isHiddenListing } from '../api/house-programming.js'
import { badgeFor, offerActions, inCategory, FREE_CATEGORIES } from '../src/features/experience/complete/free-in-the-a.js'
import { askLocal } from '../src/features/experience/complete/planner-ask.js'

test('owner Top Places lead, in owner order, without adding venues', () => {
  const feed = [{ name: 'Zed Cafe' }, { name: 'Magic City' }, { name: 'Revel Atlanta' }, { name: 'Opium' }]
  assert.deepEqual(topPlaces(feed).map(v => v.name), ['Opium', 'Revel Atlanta', 'Magic City', 'Zed Cafe'])
  assert.deepEqual(topPlaces([{ name: 'B', editorial_rank: 2 }, { name: 'A', editorial_rank: 1 }]).map(v => v.name), ['A', 'B'])
  assert.equal(topPlaces([]).length, 0)
})

test('owner-stated venue types are what customers see', () => {
  assert.equal(ownerTypeLabel({ name: 'Opium' }), 'Nightclub')
  assert.equal(ownerTypeLabel({ name: 'Utopia Restaurant Underground' }), 'Lounge')
  assert.equal(nightlifeKind({ name: 'Magic City' }), 'Strip Club')
  assert.equal(nightlifeKind({ name: 'X', category_key: 'nightclub', subcategory: "Gentleman's Clubs" }), 'Strip Club')
  assert.equal(nightlifeKind({ name: 'Some Grill', category_key: 'restaurant', subcategory: 'rooftop_dining' }), null, 'restaurants keep cuisine labels')
})

test('Toy Distro is removed from the app everywhere house rows are mapped', () => {
  assert.ok(isHiddenListing({ event_name: 'Christmas Eve Toy Distro' }))
  assert.ok(!isHiddenListing({ event_name: 'Santa in Atlanta' }))
  for (const f of ['api/data-live.js', 'api/data.js', 'api/browse.js', 'api/house.js']) assert.match(fs.readFileSync(f, 'utf8'), /isHiddenListing/, f)
  assert.doesNotMatch(fs.readFileSync('src/features/experience/complete/HomeScreen.jsx', 'utf8'), /From The|Kollective<\/em>/, 'no "From The Kollective" label')
})

test('FREE IN THE A shows only real redemption paths and honest badges', () => {
  assert.equal(badgeFor({ offer_type: 'free' }), 'FREE')
  assert.equal(badgeFor({ offer_type: 'discount', actual_value: '20% off' }), '20% OFF')
  assert.deepEqual(offerActions({ kind: 'offer', offer_type: 'free' }), [], 'no claim link and no source → no CTA')
  assert.equal(offerActions({ kind: 'offer', offer_type: 'giveaway', claim_url: 'https://x.com/enter' })[0].label, 'Enter Giveaway')
  assert.equal(FREE_CATEGORIES.length, 8)
  assert.equal(inCategory([{ category: 'birthday' }, { category: 'deals' }], 'birthday').length, 1)
  const sql = fs.readFileSync('supabase/migrations/20261110060000_gt_free_in_the_a_v1.sql', 'utf8')
  assert.match(sql, /can be approved only after it is verified/)
  assert.match(sql, /gt_offers_giveaway_no_social_gate/)
})

test('Ask GOOD TIMES answers instantly from the verified feed only', () => {
  const venues = [{ id: 'v1', name: 'Opium', category_key: 'nightclub' }, { id: 'v2', name: 'Sozou', category_key: 'restaurant', subcategory: 'sushi', price_range: '$$$' }]
  const r = askLocal('date night sushi', venues, [])
  assert.deepEqual(r.venues.map(v => v.name), ['Sozou'])
  assert.equal(askLocal('', venues, []).venues.length, 0)
})
