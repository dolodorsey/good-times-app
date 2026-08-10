import test from 'node:test'
import assert from 'node:assert/strict'
import { patchTaxonomySource } from './apply-taxonomy-vs-guard.mjs'

const source = `
function hasSportsSignal(text){return /sports/.test(text)}
function inferCustomerTaxonomy(item) {
  const text = ''
  const fallbackSub = null
  const rawType = ''
  if (/\\b(vs\\.?|versus|boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text)) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }
  const concertSignal = rawType === 'concert' || /live music|music show|concert|symphony|dj set|night sets|\\br&b\\b|\\brnb\\b|hip hop|hip-hop|\\brap\\b|\\bjazz\\b|\\bgospel\\b|karaoke|open mic/.test(text)
}
`

const patched = patchTaxonomySource(source)

test('customer taxonomy patch permanently protects obvious real-world intents', () => {
  assert.match(patched, /farmers\? .*community_civic/)
  assert.match(patched, /mindful mondays\?.*wellness_fitness/)
  assert.match(patched, /voice of the customer program.*business_professional/)
  assert.match(patched, /travel business owner.*entrepreneurship/)
  assert.match(patched, /stadium tours\?.*tours_sightseeing/)
  assert.match(patched, /adult skating session.*family_kids/)
})

test('second intent cleanup protects tours, training, fitness, creator and game events', () => {
  assert.match(patched, /black atlanta bus tour.*tours_sightseeing/)
  assert.match(patched, /\\bzumba\\b.*wellness_fitness/)
  assert.match(patched, /creative industry mixer.*creative_creator/)
  assert.match(patched, /dynamics 365 fundamentals.*business_professional/)
  assert.match(patched, /handling challenging calls.*classes_workshops/)
  assert.match(patched, /ballistic bingo.*games_interactive/)
  assert.match(patched, /money talks: the real return of sustainable partnerships.*finance_investing/)
  assert.match(patched, /exploring atlanta.*food tour.*dining_culinary/)
})

test('high-confidence intent rules execute before broad concert classification', () => {
  assert.ok(patched.indexOf('High-confidence intent rules') < patched.indexOf('const concertSignal'))
})

test('taxonomy patch is idempotent when build scripts run repeatedly', () => {
  assert.equal(patchTaxonomySource(patched), patched)
})
