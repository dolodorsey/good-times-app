import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const growth = fs.readFileSync(new URL('../src/growth.js', import.meta.url), 'utf8')
const onboarding = fs.readFileSync(new URL('../src/features/onboarding/GoodTimesOnboarding.jsx', import.meta.url), 'utf8')
const prompt = fs.readFileSync(new URL('../src/features/experience/GoodTimesInstallPrompt.jsx', import.meta.url), 'utf8')

test('Instagram placement attribution captures medium, content and term', () => {
  assert.match(growth, /params\.get\('utm_medium'\)/)
  assert.match(growth, /params\.get\('utm_content'\)/)
  assert.match(growth, /params\.get\('utm_term'\)/)
})

test('first touch is persisted once and never overwritten; last touch expires', () => {
  assert.match(growth, /const ATTRIBUTION_KEY='gt_attribution_v1'/)
  assert.match(growth, /first:stored\.first\|\|touch,last:touch/)
  assert.match(growth, /LAST_TOUCH_TTL_MS=30\*24\*60\*60\*1000/)
})

test('attribution rides on growth and enterprise events', () => {
  assert.match(growth, /\.\.\.attributionMetadata\(ctx\)/)
  assert.match(growth, /content_key:ctx\.content\|\|undefined/)
  assert.match(growth, /'signup_complete','first_action'/)
  assert.match(growth, /eventName==='signup_complete'\)return 'signup'/)
})

test('email signup records signup_complete', () => {
  assert.match(onboarding, /recordSignupComplete\(\{ method: 'email', city \}\)/)
})

test('install prompt markets Atlanta only', () => {
  assert.doesNotMatch(prompt, /LAS VEGAS|>HOU<|>MIA</)
})

test('web visitors are not mistaken for native because @capacitor/core exists on web', () => {
  assert.match(prompt, /window\.Capacitor\?\.isNativePlatform\?\.\(\)/)
  assert.doesNotMatch(prompt, /\|\|window\.Capacitor\)\{setInstalled/)
})

test('floating install pill is signed-out only so it never covers the member bottom nav', () => {
  assert.match(prompt, /if\(!show\)return !persistent\?null:<button aria-label="Get GOOD TIMES app"/)
})
