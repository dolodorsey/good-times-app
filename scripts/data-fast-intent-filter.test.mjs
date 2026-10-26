import test from 'node:test'
import assert from 'node:assert/strict'
import {filterEventsForIntent} from '../api/data-fast.js'

const rows=[
  {title:'Career Expo',category_key:'business_professional'},
  {title:'Investors Meetup',category_key:'business_professional'},
  {title:'Nightclub Friday',category_key:'nightlife'},
  {title:'Halloween Dance Party',category_key:'day_parties_brunch'},
  {title:'Live Concert',category_key:'concerts_live_music'},
]

test('turnt intent excludes business inventory before ranking',()=>{
  const output=filterEventsForIntent(rows,['turnt'])
  assert.deepEqual(output.map(x=>x.title),['Nightclub Friday','Halloween Dance Party','Live Concert'])
  assert.ok(!output.some(x=>/career|investor/i.test(x.title)))
})

test('no intent leaves candidate inventory unchanged',()=>{
  assert.deepEqual(filterEventsForIntent(rows,[]),rows)
})
