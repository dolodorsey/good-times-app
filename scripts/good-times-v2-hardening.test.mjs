import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8')
const pkg=JSON.parse(read('package.json'))
const main=read('src/main.jsx')
const app=read('src/features/experience/GoodTimesCommandAppV2.jsx')
const css=read('src/features/experience/good-times-v2-hardening.css')
const media=read('src/features/experience/good-times-media-uniqueness.js')

test('production build no longer mutates canonical source before compiling',()=>{
  assert.equal(pkg.scripts.dev,'vite')
  assert.equal(pkg.scripts.build,'npm run test && vite build')
  assert.doesNotMatch(pkg.scripts.build,/scripts\/(apply|run)-/)
  assert.doesNotMatch(pkg.scripts['ios:build'],/scripts\/(apply|run)-/)
  assert.doesNotMatch(pkg.scripts['android:build'],/scripts\/(apply|run)-/)
})

test('GOOD TIMES is locked to an app-width shell even on desktop',()=>{
  assert.match(css,/body\.gt-app-mode #root/)
  assert.match(css,/max-width:460px!important/)
  assert.match(css,/height:min\(920px,calc\(100dvh - 28px\)\)!important/)
  assert.match(css,/\.gt3-desktop-nav\{display:none!important\}/)
  assert.match(css,/\.gt3-mobile-nav[\s\S]*display:grid!important/)
  assert.match(main,/good-times-v2-hardening\.css/)
})

test('legacy visual overlays are not mounted around V2',()=>{
  assert.doesNotMatch(main,/LazyCreativeLayer/)
  assert.doesNotMatch(main,/LazyPartyPulse/)
  assert.doesNotMatch(main,/GoodTimesShellControl/)
  assert.doesNotMatch(main,/BuildMyNightRouteHost/)
  assert.doesNotMatch(main,/LazyUtilityMenu/)
})

test('all canonical advertising inventory areas are rendered',()=>{
  for(const key of ['home_radar_strip','home_feed_1','discover_inline','concierge_inline','saved_partner']){
    assert.match(app,new RegExp(`placement=\\"${key}\\"`))
  }
  assert.match(app,/PARTNER PLACEMENT/)
  assert.match(app,/SPONSORED/)
})

test('Radar follow and alert controls are visible in the live product',()=>{
  assert.match(app,/Follow \+ alerts/)
  assert.match(app,/Following ✓/)
  assert.match(app,/Never Miss/)
  assert.match(app,/Just announced/)
  assert.match(app,/Presales/)
  assert.match(app,/Selling fast/)
})

test('display inventory has a final media uniqueness gate',()=>{
  assert.match(media,/function mediaFingerprint/)
  assert.match(media,/hardenDisplayInventory/)
  assert.match(media,/seenMedia/)
  assert.match(media,/GENERIC_MEDIA/)
  assert.match(app,/hardenDisplayInventory/)
  assert.match(app,/hardenRecommendationResult/)
})
