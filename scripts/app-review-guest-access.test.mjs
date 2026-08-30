import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const v2 = fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV2.jsx', import.meta.url), 'utf8')
const support = fs.readFileSync(new URL('../fastlane/metadata/en-US/support_url.txt', import.meta.url), 'utf8').trim()
const project = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')

test('signed-out users can browse GOOD TIMES V2 without registration', () => {
  assert.match(main, /function SignedOutGuestExperience\(\)/)
  assert.match(main, /else if\(!hasSession\)\{route=<SignedOutGuestExperience\/>/)
  assert.match(main, /Browse freely\. Sign in to save, follow, get Radar alerts and use personalized Concierge\./)
  assert.match(main, />Sign in<\/button>/)
  assert.match(main, /<LazyCommandApp\/>/)
  assert.doesNotMatch(main, /else if\(!hasSession\)\{route=<LazyOnboarding/)
})

test('guest mode uses the consolidated V2 surfaces instead of legacy GT2 gating', () => {
  for (const id of ['home', 'discover', 'concierge', 'plans', 'saved']) {
    assert.match(v2, new RegExp(`\\['${id}'`))
  }
  assert.match(v2, /Sign in to save and personalize\./)
  assert.match(v2, /Browse freely\. Sign in when you want to save, follow and personalize\./)
  assert.doesNotMatch(main, /\.gt-guest-mode \.gt2-save/)
  assert.doesNotMatch(main, /\.gt-guest-mode \.gt2-detail-actions/)
})

test('App Store support URL points to the dedicated support surface', () => {
  assert.equal(support, 'https://thegoodtimesworldwide.com/support.html')
})

test('iOS release remains universal for iPhone and iPad', () => {
  const matches = project.match(/TARGETED_DEVICE_FAMILY = "1,2";/g) || []
  assert.ok(matches.length >= 2, 'Debug and Release should both target iPhone and iPad')
})
