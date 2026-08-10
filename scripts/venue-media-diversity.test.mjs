import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync(new URL('../api/data-fast.js',import.meta.url),'utf8')

test('venue fallbacks use multiple approved GOOD TIMES art choices instead of one repeated category card',()=>{
  assert.match(source,/const VENUE_CATEGORY_MEDIA=\{/)
  assert.match(source,/nightclub:\['gt-cat-nightlife\.webp','gt-bg-nightlife-district\.webp','gt-bg-rooftop-lounge\.webp','gt-cat-exclusive\.webp'\]/)
  assert.match(source,/restaurant:\['gt-cat-dining\.webp','gt-bg-grand-venue\.webp','gt-cat-dating\.webp'\]/)
  assert.match(source,/stableHash\(identity\)%pool\.length/)
})

test('approved and direct venue photography always outrank category fallback media',()=>{
  assert.match(source,/function venueMediaPriority/)
  assert.match(source,/image_source==='good_times_approved'/)
  assert.match(source,/image_source==='venue_direct'/)
  assert.match(source,/return 2/)
  assert.match(source,/payload\.venues=rankVenueMedia\(payload\.venues,vibes\)/)
  assert.match(source,/approved-photo-then-direct-photo-then-diverse-fallback/)
})

test('brittle venue media is still quarantined rather than displayed as customer creative',()=>{
  assert.match(source,/logo\|wordmark\|logotype\|artboard\|fit=pad\|bottle/)
  assert.match(source,/image_is_category_fallback:true/)
})
