import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const v4 = await readFile(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx', import.meta.url), 'utf8')
const intelligence = await readFile(new URL('../src/features/intelligence/client.js', import.meta.url), 'utf8')

test('V5 uses learned intelligence without sacrificing editorial priority', () => {
  assert.match(v4, /loadUserIntelligenceProfile/)
  assert.match(v4, /personalizedScore/)
  assert.match(v4, /display_priority/)
  assert.match(v4, /is_featured/)
  assert.match(v4, /events=\{rankedEvents\}/)
  assert.match(intelligence, /gt_user_intelligence_profiles/)
})

test('V5 exposes provenance and uses non-overclaiming commerce actions', () => {
  assert.match(v4, /TRUST & SOURCE/)
  assert.match(v4, /View source ↗/)
  assert.match(v4, /Check Tickets/)
  assert.match(v4, /Check availability/)
  assert.doesNotMatch(v4, />Get Tickets</)
  assert.doesNotMatch(v4, />Reserve \/ Book</)
})

test('V5 shares events and places while feeding taste intelligence', () => {
  assert.match(v4, /shareContent/)
  assert.match(v4, /shareExperience\('event'/)
  assert.match(v4, /shareExperience\('venue'/)
  assert.match(v4, /signalType:'share'/)
  assert.match(v4, /signalType:'follow'/)
})

test('V5 avoids double-writing the save taste signal', () => {
  const toggleStart = v4.indexOf('const toggleSave=')
  const toggleEnd = v4.indexOf('const toggleFollow=', toggleStart)
  const toggleSave = v4.slice(toggleStart, toggleEnd)
  const saveSignals = toggleSave.match(/signalType:'save'/g) || []
  assert.equal(saveSignals.length, 0, 'toggleSave must rely on saveItem to write the single canonical save signal')
})


test('My Preferences is a real editor, not a toast-only control', () => {
  assert.match(v4, /VIBE_OPTIONS/)
  assert.match(v4, /openPreferences/)
  assert.match(v4, /savePreferences/)
  assert.match(v4, /updatePreferences/)
  assert.match(v4, /Save Preferences/)
  assert.doesNotMatch(v4, /onClick=\{\(\)=>setToast\('Your preferences shape GOOD TIMES recommendations\.'\)\}/)
})
