import test from 'node:test'
import assert from 'node:assert/strict'
import { rankEvents } from '../api/data-live.js'

const clock={serviceDate:'2026-09-17',serviceMinute:12*60}
const base={
  city_key:'atlanta',
  show_date:'2026-09-19',
  event_type:'concert',
  venue_name:'Atlanta Venue',
  status:'confirmed',
  image_url:'https://example.com/event.jpg',
  ticket_url:'https://example.com/tickets',
  updated_at:new Date().toISOString(),
  quality_score:70,
}

test('future-date GOOD TIMES headline selection respects featured editorial priority before generic intelligence score',()=>{
  const generic={...base,id:'generic',event_name:'Generic High Score Event',display_priority:50,is_featured:false,is_curated:true,quality_score:95}
  const headline={...base,id:'headline',event_name:'Verified Atlanta Headline',display_priority:2,is_featured:true,is_curated:true,quality_score:65}
  const ranked=rankEvents([generic,headline],clock)
  assert.equal(ranked[0].id,'headline')
})

test('future-date featured headlines keep lower display_priority first',()=>{
  const second={...base,id:'second',event_name:'Second Headline',display_priority:8,is_featured:true,is_curated:true}
  const first={...base,id:'first',event_name:'First Headline',display_priority:1,is_featured:true,is_curated:true}
  assert.deepEqual(rankEvents([second,first],clock).map(item=>item.id),['first','second'])
})

test('service-date nightlife behavior remains intact',()=>{
  const concert={...base,id:'concert',show_date:'2026-09-17',event_name:'Featured Concert',event_type:'concert',show_time:'20:00',display_priority:1,is_featured:true}
  const nightlife={...base,id:'nightlife',show_date:'2026-09-17',event_name:'Late Night Party',event_type:'nightlife',show_time:'23:00',display_priority:50,is_featured:false}
  assert.equal(rankEvents([concert,nightlife],clock)[0].id,'nightlife')
})
