import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const support = fs.readFileSync(new URL('../fastlane/metadata/en-US/support_url.txt', import.meta.url), 'utf8').trim()
const project = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')

test('signed-out users can browse GOOD TIMES without registration', () => {
  assert.match(main, /function SignedOutGuestExperience\(\)/)
  assert.match(main, /else if\(!hasSession\)\{route=<SignedOutGuestExperience\/>/)
  assert.match(main, /Events, nightlife and local discovery are open without an account\./)
  assert.match(main, /Sign in \/ Create account/)
  assert.doesNotMatch(main, /else if\(!hasSession\)\{route=<LazyOnboarding/)
})

test('guest mode keeps account-only surfaces behind sign in', () => {
  for (const id of ['concierge', 'plans', 'vault']) {
    assert.match(main, new RegExp(`data-gt-tab="${id}"`))
  }
  assert.match(main, /\.gt-guest-mode \.gt2-save/)
  assert.match(main, /\.gt-guest-mode \.gt2-detail-actions button/)
})

test('App Store support URL points to the dedicated support surface', () => {
  assert.equal(support, 'https://thegoodtimesworldwide.com/support.html')
})

test('iOS release remains universal for iPhone and iPad', () => {
  const matches = project.match(/TARGETED_DEVICE_FAMILY = "1,2";/g) || []
  assert.ok(matches.length >= 2, 'Debug and Release should both target iPhone and iPad')
})
