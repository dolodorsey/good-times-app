import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync('.github/workflows/ios-build.yml', 'utf8')

test('iOS release checks Apple developer agreement before expensive build work', () => {
  const preflight = workflow.indexOf('- name: Preflight Apple developer agreement and provisioning access')
  const xcode = workflow.indexOf('- name: Verify Xcode 26 toolchain')
  const install = workflow.indexOf('- name: Install dependencies')
  const webBuild = workflow.indexOf('- name: Build web app')

  assert.ok(preflight > -1, 'Apple agreement preflight must exist')
  assert.ok(xcode > preflight, 'Apple preflight must run before Xcode verification')
  assert.ok(install > preflight, 'Apple preflight must run before npm install')
  assert.ok(webBuild > preflight, 'Apple preflight must run before the web build')
})

test('Apple preflight uses real provisioning access and explicit agreement diagnostics', () => {
  for (const token of [
    'APP_STORE_CONNECT_KEY_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'APP_STORE_CONNECT_PRIVATE_KEY',
    'APPLE_TEAM_ID',
    'fastlane sigh',
    '--readonly',
    'good-times-apple-preflight.log',
    'Apple agreement required',
    'required agreement',
    'missing|expired',
  ]) {
    assert.ok(workflow.includes(token), `Missing Apple preflight contract token: ${token}`)
  }
})

test('full release still keeps the authoritative provisioning and signing path after preflight', () => {
  const preflight = workflow.indexOf('- name: Preflight Apple developer agreement and provisioning access')
  const profile = workflow.indexOf('- name: Create or download App Store provisioning profile')
  const archive = workflow.indexOf('- name: Build & Archive')
  const upload = workflow.indexOf('- name: Upload IPA to App Store Connect')

  assert.ok(profile > preflight, 'Final provisioning must remain after preflight')
  assert.ok(archive > profile, 'Archive must run only after final provisioning')
  assert.ok(upload > archive, 'App Store upload must remain after archive')
})
