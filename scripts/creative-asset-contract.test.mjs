import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const assets=fs.readFileSync(new URL('../src/features/experience/good-times-assets.js',import.meta.url),'utf8')
const layer=fs.readFileSync(new URL('../src/features/experience/GoodTimesCreativeLayer.jsx',import.meta.url),'utf8')
const explore=fs.readFileSync(new URL('../src/features/experience/ExploreTaxonomyBrowser.jsx',import.meta.url),'utf8')
const refresh=fs.readFileSync(new URL('../src/features/experience/good-times-creative-refresh.css',import.meta.url),'utf8')
const responsive=fs.readFileSync(new URL('../src/features/experience/good-times-responsive-contract.css',import.meta.url),'utf8')

test('creative layer reads only approved active Supabase manifest rows',()=>{
  assert.match(assets,/gt_asset_manifest\?select=/)
  assert.match(assets,/approved=eq\.true&is_active=eq\.true/)
  assert.match(layer,/data-creative-source="gt_asset_manifest"/)
  assert.match(layer,/GOOD_TIMES_ANIMATION\.mp4/)
  assert.match(layer,/GOODTIMES_HOMESCREEN\.png/)
})

test('retired screenshot collage is no longer the rendered Explore treatment',()=>{
  assert.match(responsive,/@import '\.\/good-times-creative-refresh\.css'/)
  assert.match(refresh,/background-image:none!important/)
  assert.match(explore,/data-creative-mode="motion-glass"/)
  assert.match(explore,/--gt-cat-hue/)
  assert.doesNotMatch(layer,/ChatGPT_Image_Feb_10_2026/)
})

test('unsafe Google Places image endpoints and retired creative are blocked by media resolver',()=>{
  assert.match(assets,/maps\.googleapis\.com\/maps\/api\/place\/photo/)
  assert.match(assets,/GOODTIMES_SCREENS\.png/)
  assert.match(assets,/safeCustomerImage/)
})

test('home and build surfaces use current cinematic layer rather than raw stale category art',()=>{
  assert.match(refresh,/\.gt2-hero\{/)
  assert.match(refresh,/var\(--gt-current-home\)!important/)
  assert.match(refresh,/\.gt2-concierge-hero,\.gt2-builder/)
})
