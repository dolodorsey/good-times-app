import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync(new URL('../api/data-fast.js',import.meta.url),'utf8')

test('personalized venue ranking rewards approved GOOD TIMES photography',()=>{
  assert.match(source,/APPROVED_VENUE_MEDIA/)
  assert.match(source,/hasApprovedGoodTimesVenueMedia/)
  assert.match(source,/hasApprovedGoodTimesVenueMedia\(item\)\) score \+= 180/)
})

test('visual priority does not mutate ownership or verification fields',()=>{
  assert.doesNotMatch(source,/item\.is_black_owned\s*=/)
  assert.doesNotMatch(source,/item\.is_culture_pick\s*=/)
  assert.doesNotMatch(source,/item\.is_verified\s*=/)
})
