import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync(new URL('../api/data-fast.js',import.meta.url),'utf8')
const intelligenceSource=fs.readFileSync(new URL('../api/good-times-intelligence.js',import.meta.url),'utf8')

test('personalized venue ranking uses canonical intelligence instead of an approved-photo jackpot',()=>{
  assert.match(source,/scoreGoodTimesVenue\(item\)/)
  assert.match(source,/applyGoodTimesVenueIntelligence/)
  assert.doesNotMatch(source,/hasApprovedGoodTimesVenueMedia\(item\)\) score \+= 180/)
  assert.match(intelligenceSource,/visual_quality: 10/)
  assert.match(intelligenceSource,/is_curator_submission/)
  assert.match(intelligenceSource,/is_stock/)
})

test('visual priority does not mutate ownership or verification fields',()=>{
  assert.doesNotMatch(source,/item\.is_black_owned\s*=/)
  assert.doesNotMatch(source,/item\.is_culture_pick\s*=/)
  assert.doesNotMatch(source,/item\.is_verified\s*=/)
})
