import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const v3 = fs.readFileSync(new URL('../src/features/experience/GoodTimesCommandAppV3.jsx', import.meta.url), 'utf8')
const support = fs.readFileSync(new URL('../fastlane/metadata/en-US/support_url.txt', import.meta.url), 'utf8').trim()
const project = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')

test('signed-out users can browse GOOD TIMES V3 without a floating auth overlay', () => {
  assert.match(main, /function SignedOutGuestExperience\(\)/)
  assert.match(main, /else if\(!hasSession\)\{route=<SignedOutGuestExperience\/>/)
  assert.match(main, /<LazyCommandApp onAuth=/)
  assert.doesNotMatch(main, /gt-guest-access/)
  assert.doesNotMatch(main, /function GuestAccessBar/)
  assert.doesNotMatch(main, /else if\(!hasSession\)\{route=<LazyOnboarding/)
})

test('guest mode uses consolidated V3 surfaces and keeps auth in Profile', () => {
  for (const id of ['home', 'discover', 'concierge', 'radar', 'vault']) {
    assert.match(v3, new RegExp(`\\['${id}'`))
  }
  assert.match(v3, /Sign in to save and personalize\./)
  assert.match(v3, /Browse freely\. Sign in when you want to save, follow and personalize\./)
  assert.match(v3, /Sign in or create account/)
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
