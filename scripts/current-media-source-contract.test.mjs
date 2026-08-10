import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8')
const media=fs.readFileSync(new URL('../src/current-media.css',import.meta.url),'utf8')
const client=fs.readFileSync(new URL('../src/features/intelligence/client.js',import.meta.url),'utf8')

test('launch and loading surfaces use the approved current GOOD TIMES media pack',()=>{
  assert.match(main,/kollective\/animations\/GOODTIMES\.mp4/)
  assert.match(main,/motion\/goodtimes\.jpg/)
  assert.doesNotMatch(main,/good_times\/graphics\/GOODTIMES_HOMESCREEN\.png/)
  assert.doesNotMatch(main,/good_times\/graphics\/GOOD_TIMES_ANIMATION\.mp4/)
  assert.match(media,/motion\/goodtimes\.jpg/)
  assert.doesNotMatch(media,/GOODTIMES_HOMESCREEN\.png/)
})

test('member Home falls back to canonical verified data before showing an empty city',()=>{
  assert.match(client,/requestLivePayload/)
  assert.match(client,/\/api\/data-fast\?/)
  assert.match(client,/\/api\/data\?/)
  assert.match(client,/Personalized gateway unavailable; falling back to canonical gateway/)
})
