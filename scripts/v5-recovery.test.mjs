import test from 'node:test'
import assert from 'node:assert/strict'
import {mapShow,browse} from '../api/browse.js'
import {normalizePlanInput,composePlan,venueFits,editStops} from '../src/features/experience/complete/planner.js'
import {parsePlanIntent} from '../src/features/experience/complete/plan-intent.js'
import {discoveryWindow,filterDiscoveryEvents} from '../src/features/experience/complete/discovery-time.js'
import {persistPlan} from '../src/features/experience/complete/account.js'
import {calendarText,itineraryWarnings} from '../src/features/experience/complete/model.js'
const now=Date.parse('2026-10-09T16:00:00Z'),uuid=i=>`${String(i).padStart(8,'0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`
const prefs={date:'2026-10-09',start:'19:00',end:'01:00',people:4,vibes:['nightlife','chill','date'],budget:'$$$',adultOnly:false,allowUnknownHours:false}
const venue=(i,patch={})=>({id:uuid(i),name:'Fixture '+i,city_key:'atlanta',status:'active',is_verified:true,verification_status:'verified_current',category_key:'dining_culinary',subcategory:'restaurant',vibe_tags:['date'],neighborhood:'Midtown',price_range:'$$$',quality_score:90,hours:{periods:[{open:{day:5,time:'1700'},close:{day:6,time:'0300'}}]},website:'https://example.test/venue',...patch})
const show=(i,patch={})=>({id:uuid(i),event_name:'Live music '+i,city_key:'atlanta',venue_name:'Fixture venue',show_date:'2026-10-09',show_time:'20:00',event_type:'concert',category_key_v2:'concerts_live_music',status:'confirmed',updated_at:new Date(now).toISOString(),ticket_url:'https://example.test/event',...patch})
const json=x=>new Response(JSON.stringify(x),{status:200})
test('E2E-06 ghost tours cannot inherit concert; Bingo cannot inherit sports',()=>{assert.equal(mapShow(show(1,{event_name:'FrightNight Ghost Tours'}),now).category_key,'attractions_experiences');assert.equal(mapShow(show(2,{event_name:'BINGO Extravaganza',event_type:'sports',category_key_v2:'sports_watch'}),now),null)})
test('E2E-03 raw ineligible first page cannot falsely empty a later eligible feed',async()=>{let calls=0;const r=await browse('/api/browse?limit=1',{now,fetcher:async()=>json(++calls===1?[show(1,{category_key_v2:'needs_review'}),show(2)]:[show(2)])});assert.equal(r.items.length,1);assert.equal(r.items[0].id,uuid(2));assert.equal(r.diagnostics.scanned,2)})
test('E2E-05 upstream error remains failure',async()=>{await assert.rejects(browse('/api/browse',{now,fetcher:async()=>new Response('{}',{status:503})}))})
test('confirmed status is not fact verification and missing time remains unknown',()=>{const e=mapShow(show(1,{show_time:null}),now);assert.equal(e.is_verified,false);assert.equal(e.event_time,null);assert.equal(filterDiscoveryEvents([e],{mode:'tonight',now}).length,0)})
test('E2E-07 next calendar day belongs to Friday night; expired next day does not',()=>{const e=mapShow(show(1,{show_date:'2026-10-10',show_time:'00:30'}),now);assert.equal(filterDiscoveryEvents([e],{mode:'tonight',now}).length,1);assert.equal(filterDiscoveryEvents([e],{mode:'tonight',now:Date.parse('2026-10-10T05:30:00Z')}).length,0)})
test('month means remaining calendar month, not a rolling 30 days',()=>{assert.deepEqual(discoveryWindow('month',now),{from:'2026-10-09',to:'2026-10-31'})})
test('E2E-11 unknown hours and adult-only permissions are opt-in',()=>{const p=normalizePlanInput(prefs,now);assert.equal(p.adultOnly,false);assert.equal(p.allowUnknownHours,false);assert.equal(venueFits(venue(1,{hours:null}),p,1140).fits,false);assert.equal(venueFits(venue(1,{subcategory:'nightclubs'}),p,1140).fits,false)})
test('E2E-12 exact founder scenario preserves four people, ordered moods and uncertainty',()=>{const r=composePlan({...prefs,allowUnknownHours:true},{now,venues:[venue(1,{hours:null}),venue(2,{subcategory:'lounge',vibe_tags:['chill']})]});assert.equal(r.plan.group_size,4);assert.deepEqual(r.plan.vibe_profile.vibes,prefs.vibes);assert.ok(r.plan.stops.some(s=>s.status==='ACTION REQUIRED'));assert.ok(r.plan.stops.every(s=>s.duration_minutes&&s.departure_time&&s.fit_reason));assert.ok(r.plan.metadata.warnings.some(w=>/full requested window/.test(w)));assert.ok(r.plan.metadata.warnings.some(w=>/4 people/.test(w)))})
test('E2E-13 unknown numeric costs never count as free or within budget',()=>{assert.equal(composePlan({...prefs,budgetMax:5},{now,venues:[venue(1)]}).plan,null)})
test('numeric budget caps the total, not each stop separately',()=>{const cost={verified_cost:{currency:'USD',basis:'person',total:20,source_url:'https://example.test/menu',verified_at:new Date(now).toISOString()}};const r=composePlan({...prefs,budgetMax:25},{now,venues:[venue(1,{metadata:cost}),venue(2,{metadata:cost})]});assert.equal(r.plan.stops.length,1)})
test('E2E-14 sold out cancelled and expired events fail',()=>{for(const patch of [{is_sold_out:true},{status:'cancelled'},{show_date:'2026-10-08'}])assert.equal(mapShow(show(1,patch),now),null)})
test('E2E-15 clubs remain excluded even with a matching lead vibe',()=>{assert.equal(composePlan({...prefs,adultOnly:true,excludeNightlife:true},{now,venues:[venue(1,{category_key:'nightlife',subcategory:'nightclub',vibe_tags:['nightlife']})]}).plan,null)})
test('E2E-16 Ask parses editable date time group money and exclusions',()=>{const p=parsePlanIntent('Friday dinner for 4 people in Midtown, 7 PM to 1 AM, under $100 total, no clubs',prefs,now).values;assert.equal(p.date,'2026-10-09');assert.equal(p.start,'19:00');assert.equal(p.end,'01:00');assert.equal(p.people,4);assert.equal(p.budgetMax,100);assert.equal(p.budgetBasis,'group');assert.equal(p.excludeNightlife,true)})
test('hard dietary and accessibility requirements reject absent evidence',()=>{for(const p of [{dietary:['vegan']},{accessibility:['wheelchair_accessible']}])assert.equal(composePlan({...prefs,...p},{now,venues:[venue(1)]}).plan,null)})
test('E2E-17 timing edit invalidates previous hours assurance; pinned stop is protected',()=>{const plan=composePlan(prefs,{now,venues:[venue(1)]}).plan;const edited=editStops(plan,'time',0,'23:30');assert.equal(edited.stops[0].hours_verified,false);assert.equal(edited.stops[0].status,'ACTION REQUIRED');assert.throws(()=>editStops(editStops(plan,'lock',0),'remove',0))})
test('event finishing after requested finish is rejected',()=>{const e=mapShow(show(10,{show_time:'23:00',end_time:'02:00'}),now);assert.equal(composePlan({...prefs,anchorId:e.event_key},{now,events:[e]}).plan,null)})
test('E2E-18 retrying a saved plan id returns the one owned record',async()=>{const plan=composePlan(prefs,{now,venues:[venue(1)],requestId:uuid(20)}).plan,user=uuid(90);let count=0;const r=await persistPlan(plan,{user:{id:user},access_token:'fixture'},{fetcher:async(url,opts)=>{count++;if(opts.method==='POST'){assert.match(opts.headers.Prefer,/ignore-duplicates/);return json([])}assert.match(url,/user_id=eq/);return json([{...plan,user_id:user}])}});assert.equal(r.id,plan.id);assert.equal(count,2)})
test('E2E-19 calendar retains actual next-day date and no booking claims',()=>{const txt=calendarText({id:'fixture',itinerary_date:'2026-10-09',stops:[{name:'After midnight',date:'2026-10-10',time:'00:30'}]});assert.match(txt,/20261010T003000/);assert.match(txt,/not a reservation/)})
test('E2E-21 persistence rejects a different account response',async()=>{const plan=composePlan(prefs,{now,venues:[venue(1)],requestId:uuid(20)}).plan;await assert.rejects(persistPlan(plan,{user:{id:uuid(90)},access_token:'fixture'},{fetcher:async()=>json([{...plan,user_id:uuid(91)}])}),/not confirmed/)})

test('edited dwell conflicts and out-of-window stops stay visibly unready',()=>{const w=itineraryWarnings({itinerary_date:'2026-10-09',vibe_profile:{start:'19:00',end:'23:00'},stops:[{date:'2026-10-09',time:'22:00',duration_minutes:60},{date:'2026-10-09',time:'22:30',duration_minutes:90}]});assert.ok(w.some(x=>/overlap/.test(x)));assert.ok(w.some(x=>/outside/.test(x)))})

test('Ask short corrections preserve unrelated choices and do not infer age consent',()=>{
 const initial=parsePlanIntent('Dinner and live music for four people in Midtown, 7 PM to 1 AM',prefs,now).values
 const noClubs=parsePlanIntent('no clubs',initial,now).values
 assert.deepEqual(noClubs.vibes,['food','music']);assert.equal(noClubs.people,4);assert.equal(noClubs.start,'19:00')
 const finish=parsePlanIntent('finish earlier at 11 PM',noClubs,now).values
 assert.equal(finish.start,'19:00');assert.equal(finish.end,'23:00');assert.equal(finish.area,'Midtown');assert.equal(finish.excludeNightlife,true)
 const add=parsePlanIntent('also a rooftop',finish,now).values
 assert.deepEqual(add.vibes,['food','music','rooftop'])
 assert.equal(parsePlanIntent('everyone is 21',add,now).values.adultOnly,false)
})
test('Ask invalid and ambiguous time corrections never silently change the window',()=>{
 for(const request of ['start at 13 PM','finish at 9:90 PM','later']){const r=parsePlanIntent(request,prefs,now);assert.equal(r.values.start,prefs.start);assert.equal(r.values.end,prefs.end);assert.ok(r.notes.length)}
})
test('Ask cheaper respects existing numeric limits and moves one price band',()=>{
 const r=parsePlanIntent('cheaper',{...prefs,budgetMax:100,budgetBasis:'group'},now)
 assert.equal(r.values.budget,'$$');assert.equal(r.values.budgetMax,100);assert.equal(r.values.budgetBasis,'group');assert.ok(r.notes.some(x=>x.includes('numeric limit')))
})
test('source-backed theatre identity overrides Sports and concert legacy types together with subcategory',()=>{
 for(const category of ['sports_watch','concerts_live_music']){const e=mapShow(show(77,{event_name:'“Sloshed at the Swamp (Encore!)” by Acting Under the Influence',venue_name:'Red Light Cafe',category_key_v2:category,subcategory_key_v2:'pro_home_games'}),now);assert.equal(e.category_key,'comedy_performing_arts');assert.equal(e.subcategory_key,'theater')}
 const tour=mapShow(show(78,{event_name:'FrightNight Ghost Tours',subcategory_key_v2:'arena_concerts'}),now);assert.equal(tour.category_key,'attractions_experiences');assert.equal(tour.subcategory_key,'tours_sightseeing')
})
test('corrected events remain reachable through their category and subcategory filters',async()=>{
 const raw=show(79,{event_name:'FrightNight Ghost Tours',category_key_v2:'concerts_live_music',subcategory_key_v2:'arena_concerts'})
 const result=await browse('/api/browse?category=attractions_experiences&subcategory=tours_sightseeing',{now,fetcher:async url=>{const q=new URL(url).searchParams.get('and');assert.doesNotMatch(q,/category_key_v2|subcategory_key_v2/);return json([raw])}})
 assert.equal(result.items.length,1);assert.equal(result.items[0].subcategory_key,'tours_sightseeing')
 const wrong=await browse('/api/browse?category=concerts_live_music',{now,fetcher:async()=>json([raw])});assert.equal(wrong.items.length,0)
})

test('sports watch parties retain their own type without capturing TV titles',async()=>{
 const row=show(78,{event_name:'Red River Rivalry Watch Party',event_type:'party',category_key_v2:'nightlife',subcategory_key_v2:'late_night',venue_name:'Botica',description:'Red River Rivalry at Botica. The one game we all circle in Sharpie.'})
 const mapped=mapShow(row,now);assert.equal(mapped.category_key,'sports_watch');assert.equal(mapped.subcategory_key,'watch_parties')
 const result=await browse('/api/browse?category=sports_watch&subcategory=watch_parties',{now,fetcher:async()=>json([row])});assert.equal(result.items.length,1)
 for(const title of ['Game of Thrones Watch Party','Dream Watch Party']){const tv=mapShow(show(79,{event_name:title,event_type:'party',category_key_v2:'nightlife',subcategory_key_v2:'late_night'}),now);assert.equal(tv.category_key,'nightlife')}
 const described=mapShow(show(80,{event_name:'Alumni Watch Party',event_type:'party',description:'Join the chapter for college football.'}),now);assert.equal(described.category_key,'sports_watch');assert.equal(described.subcategory_key,'watch_parties')
})


test('reviewed event correction matches exact source, record and occurrence without declaring all facts verified',()=>{
 const raw=show(90,{id:'7e09a6d0-df5f-44ea-9352-e240215e78e6',event_name:'AFRO BEATS VS REGGAE | REGGAE ON THE ROOFTOP | FREE ENTRY TIL 11PM',show_date:'2026-10-10',show_time:'22:00',venue_name:'Cafe Circa',event_type:'party',category_key_v2:'nightlife',ticket_url:'https://www.eventbrite.com/e/reggae-vs-soca-reggae-on-the-rooftop-free-entry-til-11pm-tickets-2001072123589',age_requirement:'18+'})
 const fixed=mapShow(raw,now);assert.match(fixed.title,/^REGGAE VS SOCA/);assert.equal(fixed.age_requirement,'21+');assert.equal(fixed.is_verified,false);assert.equal(fixed.source_fact_corrections[0].original_title,raw.event_name);assert.equal(fixed.id,raw.id)
 for(const patch of [{id:uuid(91)},{show_date:'2026-10-11'},{ticket_url:'https://example.test/event'}])assert.equal(mapShow({...raw,...patch},now).title,raw.event_name)
})


test('organizer-cancelled occurrence cannot enter discovery or a new itinerary',()=>{
 const raw=show(92,{id:'89d0604e-fa2e-48f6-87f8-d62cf28054bd',event_name:'PRVCY Saturdays @ Embr Lounge',show_date:'2026-10-10',show_time:'22:00',venue_name:'Embr Lounge',ticket_url:'https://www.eventbrite.com/e/prvcy-saturdays-embr-lounge-tickets-1979600848427'})
 assert.equal(mapShow(raw,now),null)
 assert.ok(mapShow({...raw,show_date:'2026-10-17'},now))
})

test('organizer-postponed Drake occurrence is not an available plan candidate',()=>{assert.equal(mapShow(show(93,{id:'381bff7b-c1d3-46bd-b1f9-f373eaa34709',event_name:"We Should Link ATL: Bracket Party - DRAKE EDITION",show_date:'2026-10-10',ticket_url:'https://www.eventbrite.com/e/we-should-link-atl-bracket-party-drake-edition-tickets-1997844875804'}),now),null)})
