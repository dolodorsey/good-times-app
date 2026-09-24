import test from 'node:test'
import assert from 'node:assert/strict'
import { inferCustomerTaxonomy } from '../api/data.js'

const cases = [
  ['film festival', {event_name:'The 39th Annual Out On Film Festival',event_type:'festival',venue_name:'Midtown Art Cinema',category_key_v2:'arts_museums_culture',subcategory_key_v2:'film_screenings'}, 'arts_museums_culture','film_screenings'],
  ['reviewed exhibition', {event_name:'The Mary Experience',event_type:'festival',venue_name:'SCAD Film Studios',category_key_v2:'arts_museums_culture',subcategory_key_v2:'exhibitions'}, 'arts_museums_culture','exhibitions'],
  ['reviewed live improv', {event_name:"Wild 'N Out Live",event_type:'concert',venue_name:'State Farm Arena',category_key_v2:'comedy_performing_arts',subcategory_key_v2:'improv'}, 'comedy_performing_arts','improv'],
  ['multi-activity music festival', {event_name:'Sunday in the Park ft. Tunes from the Tombs',event_type:'concert',venue_name:'Oakland Cemetery',category_key_v2:'festivals_major_activations',subcategory_key_v2:'music_festivals'}, 'festivals_major_activations','music_festivals'],
  ['5K guard remains stronger', {event_name:'Music Festival & 5K Run',event_type:'festival',category_key_v2:'festivals_major_activations',subcategory_key_v2:'music_festivals'}, 'wellness_fitness','runs_races'],
  ['comedian is not a concert', {event_name:'John Oliver',event_type:'comedy',venue_name:'Fox Theatre',category_key_v2:'concerts_live_music',subcategory_key_v2:'theater_concerts'}, 'comedy_performing_arts','stand_up'],
  ['arena is not intimate', {event_name:'aespa',event_type:'concert',venue_name:'State Farm Arena',category_key_v2:'concerts_live_music',subcategory_key_v2:'intimate_shows'}, 'concerts_live_music','arena_concerts'],
  ['home game is not a watch party', {event_name:'Hawks vs Rockets',event_type:'sports',venue_name:'State Farm Arena',category_key_v2:'sports_watch',subcategory_key_v2:'pro_home_games'}, 'sports_watch','pro_home_games'],
]
for (const [label,input,category,subcategory] of cases) {
  test(label, () => assert.deepEqual(inferCustomerTaxonomy(input),{category,subcategory}))
}
test('unknown inventory remains unclassified instead of inventing facts', () => {
  assert.deepEqual(inferCustomerTaxonomy({event_name:'Unclassified Listing'}),{category:null,subcategory:null})
})
