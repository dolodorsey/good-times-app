import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {composePlan} from '../src/features/experience/complete/planner.js'

const hours={periods:Array.from({length:7},(_,day)=>({open:{day,time:'1000'},close:{day,time:'2359'}}))}
const venue=(id,name,quality)=>({
  id,city_key:'atlanta',name,category_key:'dining_culinary',subcategory:'restaurant',
  neighborhood:'Midtown',status:'active',is_verified:true,verification_status:'verified_current',
  quality_score:quality,hours,age_range:null,price_range:'$$',vibe_tags:['food','date']
})
const venues=[
  venue('00000000-0000-4000-8000-000000000001','Alpha Kitchen',100),
  venue('00000000-0000-4000-8000-000000000002','Bravo Kitchen',99),
  venue('00000000-0000-4000-8000-000000000003','Charlie Kitchen',98),
  venue('00000000-0000-4000-8000-000000000004','Delta Kitchen',97),
]
const raw={date:'2026-10-02',start:'19:00',end:'23:30',people:2,vibes:['food'],area:'Midtown',budget:'$$',allowUnknownHours:false}
const now=Date.parse('2026-09-30T12:00:00Z')

test('planner diversifies among similarly strong eligible places across fresh requests',()=>{
  const firstStops=new Set()
  for(let i=0;i<16;i+=1){
    const result=composePlan(raw,{venues,events:[],now,requestId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`})
    assert.equal(result.ok,true)
    assert.ok(result.plan?.stops?.length)
    firstStops.add(result.plan.stops[0].name)
  }
  assert.ok(firstStops.size>1,'fresh requests should not always return the same opening restaurant')
})

test('planner avoids recently suggested venue when a comparable alternative exists',()=>{
  const result=composePlan({...raw,avoidIds:[venues[0].id]},{venues,events:[],now,requestId:'00000000-0000-4000-8000-999999999999'})
  assert.equal(result.ok,true)
  assert.ok(result.plan?.stops?.length)
  assert.notEqual(result.plan.stops[0].object_id,venues[0].id)
})

test('P0 customer fixes stay wired into the customer shell',async()=>{
  const [app,planner,hub,profile,collections,css,main]=await Promise.all([
    readFile(new URL('../src/features/experience/GoodTimesCommandAppV4.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/features/experience/complete/Planner.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/features/experience/complete/EntertainmentHub.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/features/experience/complete/ProfileHub.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/features/experience/complete/Collections.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/features/experience/good-times-complete.css',import.meta.url),'utf8'),
    readFile(new URL('../src/main.jsx',import.meta.url),'utf8'),
  ])
  assert.match(app,/refreshStoredSession/)
  assert.match(app,/setInterval\(\(\)=>void sync\(\),30000\)/)
  assert.match(planner,/refreshStoredSession/)
  assert.match(planner,/avoidIds:recentPlanIds\(\)/)
  assert.match(planner,/gtc-itinerary-back/)
  assert.match(hub,/export function InteractiveCollection/)
  assert.match(hub,/\['games_interactive','Interactive'.*'interactive'/)
  assert.doesNotMatch(profile,/\{signalCount\} signals/)
  assert.doesNotMatch(profile,/Stage:/)
  assert.doesNotMatch(collections,/more available/)
  assert.doesNotMatch(collections,/Recommended on page/)
  assert.match(css,/box-sizing:border-box/)
  assert.match(css,/@media\(max-width:520px\)/)
  assert.match(main,/setShowLaunch\(false\),2000/)
})
