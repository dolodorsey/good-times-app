import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const assets=fs.readFileSync(new URL('../src/features/experience/good-times-assets.js',import.meta.url),'utf8')
const layer=fs.readFileSync(new URL('../src/features/experience/GoodTimesCreativeLayer.jsx',import.meta.url),'utf8')
const explore=fs.readFileSync(new URL('../src/features/experience/ExploreTaxonomyBrowser.jsx',import.meta.url),'utf8')
const builder=fs.readFileSync(new URL('../src/features/experience/BuildMyNightPanel.jsx',import.meta.url),'utf8')
const party=fs.readFileSync(new URL('../src/features/experience/GoodTimesPartyPulse.jsx',import.meta.url),'utf8')
const fast=fs.readFileSync(new URL('../api/data-fast.js',import.meta.url),'utf8')
const refresh=fs.readFileSync(new URL('../src/features/experience/good-times-creative-refresh.css',import.meta.url),'utf8')
const responsive=fs.readFileSync(new URL('../src/features/experience/good-times-responsive-contract.css',import.meta.url),'utf8')

test('creative layer reads only approved active Supabase manifest rows across approved buckets',()=>{
  assert.match(assets,/gt_asset_manifest\?select=/)
  assert.match(assets,/storage_bucket/)
  assert.match(assets,/approved=eq\.true&is_active=eq\.true/)
  assert.match(assets,/kollective\/animations\/GOODTIMES\.mp4/)
  assert.match(assets,/motion\/goodtimes\.jpg/)
  assert.match(assets,/GT_STORAGE_ROOT/)
  assert.match(layer,/loadGoodTimesAssetManifest/)
  assert.match(layer,/GT_APPROVED_DEFAULTS/)
  assert.match(layer,/data-creative-source="gt_asset_manifest"/)
})

test('Explore taxonomy controls use approved category-specific art instead of arbitrary venue photography',()=>{
  assert.match(responsive,/@import '\.\/good-times-creative-refresh\.css'/)
  assert.match(explore,/data-creative-mode="supabase-category-art"/)
  assert.match(explore,/categoryHue/)
  assert.match(explore,/manifestAssetForCategory/)
  assert.match(explore,/--gt-cat-image/)
  assert.doesNotMatch(layer,/ChatGPT_Image_Feb_10_2026/)
})

test('Build My Night keeps the complete click-through planner and source-backed route request',()=>{
  assert.match(builder,/LIVE ROUTE BUILDER/)
  assert.match(builder,/STEPS = \['Mood','Anchor','Details','Route'\]/)
  assert.match(builder,/What should the night feel like\?/)
  assert.match(builder,/gt2-builder-anchors/)
  assert.match(builder,/gt2-builder-pickers/)
  assert.match(builder,/gt2-builder-live-route/)
  assert.match(builder,/current source-backed events and verified places/)
  assert.match(builder,/--gt-vibe-art/)
})

test('GOOD TIMES toolbar uses the actual Supabase navigation artwork',()=>{
  for(const asset of ['nav-icon-now.webp','nav-icon-dates.webp','nav-icon-build-my-night.webp','nav-icon-itinerary.webp','nav-icon-explore.webp','nav-icon-vault.webp']) assert.match(refresh,new RegExp(asset.replaceAll('.','\\.')))
})

test('party discovery leads with venue variety before repeating the same club',()=>{
  assert.match(fast,/diversifyEventsByVenue/)
  assert.match(fast,/venue_diversity:true/)
  assert.match(party,/diversifyPartyRows/)
  assert.match(party,/One strongest move per venue first/)
})

test('unsafe Google Places image endpoints and retired creative are blocked by media resolver',()=>{
  assert.match(assets,/maps\.googleapis\.com\/maps\/api\/place\/photo/)
  assert.match(assets,/GOODTIMES_HOMESCREEN\.png/)
  assert.match(assets,/GOODTIMES_SCREENS\.png/)
  assert.match(assets,/safeCustomerImage/)
})

test('home and build surfaces use current cinematic layer rather than raw stale category art',()=>{
  assert.match(refresh,/\.gt2-hero\{/)
  assert.match(refresh,/motion\/goodtimes\.jpg/)
  assert.doesNotMatch(refresh,/good_times\/graphics\/GOODTIMES_HOMESCREEN\.png/)
  assert.match(refresh,/\.gt2-concierge-hero\{/)
  assert.match(refresh,/\.gt2-builder\{/)
})
