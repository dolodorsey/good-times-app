import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('launch and onboarding use the owner-approved current GOOD TIMES media pack', () => {
  const main = read('src/main.jsx')
  const onboarding = read('src/features/onboarding/GoodTimesOnboarding.jsx')
  for (const source of [main, onboarding]) {
    assert.match(source, /motion\/goodtimes\.jpg/)
    assert.match(source, /kollective\/animations\/GOODTIMES\.mp4/)
    assert.doesNotMatch(source, /GOODTIMES_HOMESCREEN\.png/)
    assert.doesNotMatch(source, /GOOD_TIMES_ANIMATION\.mp4/)
  }
})
