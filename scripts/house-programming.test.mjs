import test from 'node:test'
import assert from 'node:assert/strict'
import {HOUSE_SOURCE,HOUSE_VENUE_TBA,houseVenueTba,withHouseVenue,limitKeepingHouse} from '../api/house-programming.js'
import {mapShow} from '../api/browse.js'
import {customerReadyEvent} from '../api/data-live.js'
import {houseEvents,HOUSE_SOURCE as CLIENT_HOUSE_SOURCE} from '../src/features/experience/complete/kollective-programming.js'

const now=Date.parse('2026-09-27T20:00:00Z'),uuid=n=>String(n).padStart(8,'0')+'-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const clock={serviceDate:'2026-09-27',serviceMinute:16*60}
const show=(n=1,patch={})=>({id:uuid(n),event_name:'Kollective test',event_type:'nightlife',category_key_v2:'nightlife',show_date:'2026-10-01',show_time:'21:00',city_key:'atlanta',venue_name:'Test venue',ticket_url:'https://www.eventbrite.com/e/test-tickets-'+n,source_url:'https://www.eventbrite.com/e/test-tickets-'+n,image_url:'/venues/opium.jpg',status:'confirmed',updated_at:new Date(now).toISOString(),...patch})
const house=(n,patch={})=>show(n,{source:HOUSE_SOURCE,venue_name:null,venue_address:null,...patch})

test('client and API agree on the house source label',()=>assert.equal(CLIENT_HOUSE_SOURCE,HOUSE_SOURCE))

test('only house rows without a venue are venue-TBA',()=>{
  assert.equal(houseVenueTba(house(1)),true)
  assert.equal(houseVenueTba(house(1,{venue_name:'The Gallery'})),false)
  assert.equal(houseVenueTba(show(1,{venue_name:null})),false)
  assert.deepEqual(withHouseVenue(house(1)).venue_name,HOUSE_VENUE_TBA)
  assert.equal(withHouseVenue(house(1)).venue_tba,true)
  assert.equal(withHouseVenue(house(1,{venue_name:'The Gallery'})).venue_name,'The Gallery')
})

test('feed gate admits a house listing with venue TBA, never invents a venue',()=>{
  assert.equal(customerReadyEvent(house(2),clock),true)
  assert.equal(customerReadyEvent(show(2,{venue_name:null}),clock),false)
  assert.equal(customerReadyEvent(show(2,{venue_name:'TBA'}),clock),false)
})

test('house listing still needs image and ticket link',()=>{
  assert.equal(customerReadyEvent(house(3,{image_url:null}),clock),false)
  assert.equal(customerReadyEvent(house(3,{ticket_url:null}),clock),false)
})

test('browse/search maps a house venue-TBA row; non-house null venue stays ineligible',()=>{
  const e=mapShow(house(4),now)
  assert.ok(e,'house row should be eligible')
  assert.equal(e.venue_name,HOUSE_VENUE_TBA)
  assert.equal(e.venue_tba,true)
  assert.equal(mapShow(show(4,{venue_name:null}),now),null)
})

test('payload limit keeps every house row and preserves order',()=>{
  const rows=[...Array.from({length:6},(_,i)=>({id:'o'+i})),{id:'h1',source_name:HOUSE_SOURCE},{id:'o6'},{id:'h2',source_name:HOUSE_SOURCE}]
  const out=limitKeepingHouse(rows,4)
  assert.deepEqual(out.map(r=>r.id),['o0','o1','h1','h2'])
  assert.equal(limitKeepingHouse(rows,50),rows)
})

test('rail shows the next occurrence per house series only',()=>{
  const ev=(title,date,time='19:00',source=HOUSE_SOURCE)=>({title,event_date:date,event_time:time,source_name:source,event_key:title+date})
  const out=houseEvents([ev('KINGS OF THE COURT','2026-12-18'),ev('KINGS OF THE COURT','2026-11-20'),ev('BLACK BALL','2026-11-21','21:00'),ev('Other party','2026-11-01','20:00','Eventbrite ATL')])
  assert.deepEqual(out.map(e=>e.title+' '+e.event_date),['KINGS OF THE COURT 2026-11-20','BLACK BALL 2026-11-21'])
})
