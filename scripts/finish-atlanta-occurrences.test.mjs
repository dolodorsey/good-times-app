import test from 'node:test'
import assert from 'node:assert/strict'
import {dedupeEventOccurrences,occurrenceKey,inventoryCacheKey} from '../api/event-occurrences.js'
import {validClock,eventTimeFields} from '../api/event-time-display.js'
import handler from '../api/data-live.js'

const event=(patch={})=>({id:'one',city_key:'atlanta',event_name:'A Named Headliner',venue_name:'Fox Theatre',show_date:'2026-10-02',show_time:'20:00',ticket_url:'https://example.com/season',good_times_score:65,...patch})

test('a common ticket URL cannot collapse distinct dates',()=>{
  assert.equal(dedupeEventOccurrences([event(),event({id:'two',show_date:'2026-10-03'})]).length,2)
})
test('separate performances on the same date remain distinct',()=>{
  assert.equal(dedupeEventOccurrences([event(),event({id:'late',show_time:'22:00'})]).length,2)
})
test('the same occurrence from different ticket sources is merged',()=>{
  const best=event({id:'reviewed',good_times_score:80,ticket_url:'https://another.example.com/tickets'})
  assert.deepEqual(dedupeEventOccurrences([event(),best]),[best])
})
test('different shows, cities and rooms never collapse',()=>{
  assert.equal(dedupeEventOccurrences([event(),event({id:'show',event_name:'Another Headliner'}),event({id:'city',city_key:'houston'}),event({id:'room',venue_name:'The Loft'})]).length,4)
})
test('missing times are not merged on a shared ticket destination',()=>{
  assert.equal(dedupeEventOccurrences([event({id:'unknown1',show_time:null}),event({id:'unknown2',show_time:null})]).length,2)
})
test('doors and actual performance time are different evidence',()=>{
  assert.notEqual(occurrenceKey(event()),occurrenceKey(event({show_time:null,doors_time:'20:00'})))
})
test('explicit whole-hour AM/PM values normalize correctly',()=>{
  for(const [input,output] of [['8 PM','20:00'],['8PM','20:00'],['12 AM','00:00'],['12 PM','12:00'],['9:15 pm','21:15'],['21:15:59','21:15']])assert.equal(validClock(input),output)
  assert.equal(eventTimeFields({show_time:'8 PM'}).performance_time,'20:00')
})
test('ambiguous, invalid and doors-only text never becomes a showtime',()=>{
  for(const value of ['8','24:00','0 AM','13 PM','21:15:99','8:60 PM','Doors 7PM','TBA',null])assert.equal(validClock(value),null)
  assert.equal(eventTimeFields({doors_time:'7 PM'}).event_time,'Doors 7:00 PM · showtime TBA')
  assert.equal(eventTimeFields({doors_time:'7 PM'}).performance_time,null)
})
test('format variants for the same documented time share an occurrence identity',()=>{
  assert.equal(occurrenceKey(event({show_time:'8 PM'})),occurrenceKey(event({show_time:'20:00'})))
})
test('fallback cache identity includes city, night and both result limits',()=>{
  const keys=[inventoryCacheKey('atlanta','2026-09-16',10,20),inventoryCacheKey('atlanta','2026-09-16',20,20),inventoryCacheKey('atlanta','2026-09-16',10,30),inventoryCacheKey('atlanta','2026-09-17',10,20),inventoryCacheKey('houston','2026-09-16',10,20)]
  assert.equal(new Set(keys).size,5)
})

test('the real live handler preserves occurrences and cannot serve a differently sized fallback',async()=>{
  const original=globalThis.fetch
  const day=new Date(Date.now()+10*86400000).toISOString().slice(0,10)
  const next=new Date(Date.now()+11*86400000).toISOString().slice(0,10)
  const rows=[event({id:'show1',show_date:day,show_time:'8 PM'}),event({id:'show2',show_date:next}),event({id:'show3',show_date:next,show_time:'22:00'})].map(e=>({...e,event_type:'concert',image_url:'https://example.com/headliner.jpg',status:'confirmed',is_curated:true,updated_at:new Date().toISOString()}))
  const makeResponse=()=>({statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k]=v},end(v=''){this.body=v}})
  const call=async(limit)=>{const r=makeResponse();await handler({method:'GET',url:`/api/data-live?city=atlanta&event_limit=${limit}&venue_limit=7`},r);return r}
  globalThis.__GT_DATA_LIVE_CACHE_V8__?.clear()
  globalThis.fetch=async()=>new Response(JSON.stringify({events:rows,venues:[]}),{status:200})
  try{
    const full=await call(3),d=JSON.parse(full.body)
    assert.equal(full.statusCode,200);assert.equal(d.events.length,3)
    assert.equal(d.events.find(e=>e.source_id==='show1').performance_time,'20:00')
    assert.equal(full.headers['X-Good-Times-Live-Gateway'],'v9')
    const small=await call(1);assert.equal(JSON.parse(small.body).events.length,1)
    globalThis.fetch=async()=>{throw new Error('simulated source outage')}
    const unseen=await call(2);assert.equal(unseen.statusCode,503,'Do not borrow a differently sized cached payload')
    const recovered=await call(3);assert.equal(recovered.statusCode,200)
    assert.equal(JSON.parse(recovered.body).events.length,3)
    assert.equal(JSON.parse(recovered.body).degraded,true)
    assert.equal(recovered.headers['Cache-Control'],'no-store','Do not compound staleness at the CDN')
    const recoveredSmall=await call(1);assert.equal(JSON.parse(recoveredSmall.body).events.length,1)
  }finally{globalThis.fetch=original;globalThis.__GT_DATA_LIVE_CACHE_V8__?.clear()}
})
