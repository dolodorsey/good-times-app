import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
const auth = fs.readFileSync(new URL('../src/features/auth/client.js', import.meta.url), 'utf8')
const onboarding = fs.readFileSync(new URL('../src/features/onboarding/GoodTimesOnboarding.jsx', import.meta.url), 'utf8')
const support = fs.readFileSync(new URL('../fastlane/metadata/en-US/support_url.txt', import.meta.url), 'utf8').trim()
const project = fs.readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8')

test('signed-out users must authenticate before GOOD TIMES customer app access', () => {
  assert.match(main, /function SignedOutMemberGate\(\)/)
  assert.match(main, /else if\(!hasSession\)\{route=<SignedOutMemberGate\/>/)
  assert.match(main, /return <LazyOnboarding onComplete=\{complete\}\/>/)
  assert.doesNotMatch(main, /SignedOutGuestExperience/)
  assert.doesNotMatch(main, /Continue as guest/)
  assert.doesNotMatch(main, /<LazyCommandApp onAuth=/)
})

test('GOOD TIMES supports Google OAuth and restores the returned session', () => {
  assert.match(onboarding, /Continue with Google/)
  assert.match(onboarding, /signInWithGoogle/)
  assert.match(auth, /provider', 'google'/)
  assert.match(auth, /export async function consumeOAuthRedirect/)
  assert.match(main, /consumeOAuthRedirect\(window\.location\.hash\)/)
  assert.match(main, /storeSession\(oauthSession\)/)
})

test('install prompt reaches signed-out web visitors but never native, recovery or direct-request routes', () => {
  assert.match(main, /\{installPrompt\?<GoodTimesInstallPrompt persistent=\{!readSession\(\)\}\/>:null\}/)
  assert.match(main, /const showInstallPrompt=!isNative&&!requestType&&!recoverySession/)
  assert.doesNotMatch(main, /readSession\(\)\?<GoodTimesInstallPrompt/)
})

test('App Store support URL points to the dedicated support surface', () => {
  assert.equal(support, 'https://thegoodtimesworldwide.com/support.html')
})

test('iOS release remains universal for iPhone and iPad', () => {
  const matches = project.match(/TARGETED_DEVICE_FAMILY = "1,2";/g) || []
  assert.ok(matches.length >= 2, 'Debug and Release should both target iPhone and iPad')
})
