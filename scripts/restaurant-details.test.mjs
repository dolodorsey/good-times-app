import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {browse} from '../api/browse.js'
import {RESTAURANT_PROFILE_FIELDS,normalizeRestaurantProfile,restaurantFactRows,restaurantLabel} from '../src/features/experience/complete/restaurant-facts.js'
import {restaurantActionLabel} from '../src/features/experience/complete/restaurant-actions.js'

const now=Date.parse('2026-09-28T16:00:00Z')
const id='679e93b9-2972-4daa-91b2-8775ab3db89e',other='07c94591-54b5-4094-8e3d-206db04782ef'
const venue={id,city_key:'atlanta',name:'Restaurant Detail QA',status:'active',is_verified:true,verification_status:'verified_current',freshness_expires_at:'2026-11-03T00:00:00Z',category_key:'dining_culinary',venue_category_key:'restaurant',subcategory_key:'restaurant_places',subcategory:'Restaurants',neighborhood:'Southwest Atlanta',address:'510 Fairburn Rd SW Suite 300, Atlanta, GA 30331',website:'https://example.test/restaurant',short_desc:'Restaurant detail QA fixture. This is not a production recommendation.',hero_image:null,quality_score:88}
const profile={entity_id:id,service_level:'fast_casual',cuisine_tags:['tapas'],meal_tags:['breakfast','lunch','dinner'],occasion_tags:['group_dining'],ownership_tags:['woman_owned'],needs_review:true}
const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}})
const request='/api/browse?kind=venue&id='+id

for(const row of [null,[],{},profile])test('restaurant attributes require the exact entity: '+JSON.stringify(row),()=>assert.equal(normalizeRestaurantProfile(row,other),null))
test('restaurant output is allowlisted, bounded and never includes internal evidence',()=>{
 const p=normalizeRestaurantProfile({...profile,evidence:{private:'not public'},profile_confidence:99,profile_source:'internal',quality_score:100,booking_link:'https://wrong.test',cuisine_tags:['tapas','TAPAS',null,{},'<script>',...Array(20).fill('italian')]},id)
 assert.deepEqual(p.cuisine_tags,['tapas','italian']);assert.equal(p.partial,true)
 for(const key of ['evidence','profile_confidence','profile_source','quality_score','booking_link','entity_id'])assert.equal(p[key],undefined)
 assert.doesNotMatch(RESTAURANT_PROFILE_FIELDS,/evidence|profile_source|profile_confidence|\*/)
})
test('empty and malformed attributes collapse without invented defaults',()=>{
 assert.equal(normalizeRestaurantProfile({entity_id:id,service_level:null,cuisine_tags:'italian'},id),null)
 assert.deepEqual(restaurantFactRows(null),[])
 assert.deepEqual(restaurantFactRows({service_level:{bad:true},meal_tags:'dinner'}),[])
 assert.equal(restaurantLabel('<b>bad</b>'),'')
})
test('restaurant facts preserve the recorded service, cuisine, meal and ownership meaning',()=>{
 const rows=Object.fromEntries(restaurantFactRows(normalizeRestaurantProfile(profile,id)))
 assert.equal(rows.Service,'Fast casual');assert.equal(rows.Cuisine,'Tapas');assert.equal(rows.Meals,'Breakfast · Lunch · Dinner');assert.equal(rows.Ownership,'Woman-owned')
 assert.equal(rows['Dietary options'],undefined)
})
const actionCases=[
 [null,'Official website'],
 [{},'Official website'],
 [{booking_link:'https://resy.com/cities/atlanta-ga/venues/sargent'},'Reserve a table'],
 [{booking_link:'https://www.opentable.com/r/sozou-atlanta'},'Reserve a table'],
 [{booking_link:'https://order.toasttab.com/online/mister-burger-decatur'},'Order online'],
 [{booking_link:'https://order.online/store/-35849887?hideModal=true'},'Order online'],
 [{booking_link:'https://toastique.orderexperience.net/6a6826418b16e6cb9c008287/menu'},'Order online'],
 [{booking_link:'https://boskcafeandwine.com/menu',website:'https://boskcafeandwine.com/',restaurant_profile:{feature_tags:['online_ordering']}},'Order online'],
 [{booking_link:'https://boskcafeandwine.com/menu',website:'https://boskcafeandwine.com/'},'Check availability'],
 [{booking_link:'https://evil.resy.com/cities/atlanta-ga/venues/sargent'},'Check availability'],
 [{booking_link:'https://example.test/?next=https://order.toasttab.com/online/test'},'Check availability'],
 [{booking_link:'javascript:alert(1)'},'Check availability'],
 [{booking_link:'https://fake@resy.com/cities/atlanta-ga/venues/sargent'},'Check availability'],
 [{booking_link:'https://www.cottoitalian.com/reservations'},'Check availability'],
 [{booking_link:'https://resy.com/'},'Check availability']
]
for(const [i,[record,label]] of actionCases.entries())test('restaurant action label uses exact evidence '+i,()=>{
 const before=JSON.stringify(record);assert.equal(restaurantActionLabel(record),label);assert.equal(JSON.stringify(record),before)
})
test('venue-hosted ordering requires the same venue and a recorded ordering feature',()=>{
 assert.equal(restaurantActionLabel({booking_link:'https://other.test/menu',website:'https://venue.test/',restaurant_profile:{feature_tags:['online_ordering']}}),'Check availability')
 assert.equal(restaurantActionLabel({booking_link:'https://venue.test/menu',website:'https://venue.test/',restaurant_profile:{feature_tags:'online_ordering'}}),'Check availability')
})
test('venue hydration is exact-ID, read-only, bounded and additive',async()=>{
 const calls=[]
 const result=await browse(request,{now,fetcher:async(u,o)=>{const url=new URL(u);calls.push({url,options:o});return json(url.pathname.endsWith('/gt_venues')?[venue]:[{...profile,evidence:{private:true}}])}})
 assert.equal(calls.length,2);assert.equal(calls[1].url.searchParams.get('entity_id'),'eq.'+id);assert.equal(calls[1].url.searchParams.get('limit'),'1')
 assert.ok(calls.every(c=>c.options.method==='GET'&&c.options.cache==='no-store'&&c.options.signal))
 assert.equal(result.items[0].restaurant_profile.cuisine_tags[0],'tapas');assert.equal(result.items[0].restaurant_profile_state,'ready')
 assert.equal(result.items[0].quality_score,88);assert.equal(result.items[0].website,venue.website);assert.equal(result.items[0].restaurant_profile.evidence,undefined)
})
for(const patch of [{id:other},{city_key:'miami'},{status:'closed'},{is_verified:false},{verification_status:'needs_review'},{freshness_expires_at:'2020-01-01'},{freshness_expires_at:null}])test('ineligible venue cannot be rescued by restaurant metadata '+JSON.stringify(patch),async()=>{
 let reads=0;const result=await browse(request,{now,fetcher:async()=>{reads++;return json([{...venue,...patch}])}})
 assert.deepEqual(result.items,[]);assert.equal(reads,1)
})
test('a missing venue never triggers a profile fetch',async()=>{let reads=0;const result=await browse(request,{now,fetcher:async()=>{reads++;return json([])}});assert.deepEqual(result.items,[]);assert.equal(reads,1)})
test('wrong-entity metadata is discarded without discarding the venue',async()=>{const result=await browse(request,{now,fetcher:async u=>json(new URL(u).pathname.endsWith('/gt_venues')?[venue]:[{...profile,entity_id:other}])});assert.equal(result.items.length,1);assert.equal(result.items[0].restaurant_profile,null);assert.equal(result.items[0].restaurant_profile_state,'missing')})
test('optional enrichment failure leaves base detail and transaction links usable',async()=>{const result=await browse(request,{now,fetcher:async u=>new URL(u).pathname.endsWith('/gt_venues')?json([venue]):new Response('{}',{status:503})});assert.equal(result.ok,true);assert.equal(result.items[0].website,venue.website);assert.equal(result.items[0].restaurant_profile,null);assert.equal(result.items[0].restaurant_profile_state,'unavailable')})
test('base venue failure remains an error rather than a false empty result',async()=>{await assert.rejects(browse(request,{now,fetcher:async()=>new Response('{}',{status:503})}))})
test('restaurant detail migration protects public writes and requires current Atlanta venue visibility',()=>{
 const sql=fs.readFileSync('supabase/migrations/20260928091745_good_times_restaurant_detail_rls_v1.sql','utf8')
 assert.match(sql,/enable row level security/i);assert.match(sql,/revoke all[\s\S]*from public, anon, authenticated/i);assert.match(sql,/for select to anon, authenticated/i)
 assert.match(sql,/city_key = 'atlanta'/);assert.match(sql,/freshness_expires_at > now\(\)/);assert.equal((sql.match(/security_invoker = true/g)||[]).length,2)
 assert.doesNotMatch(sql,/create policy[\s\S]*for (all|insert|update|delete) /i)
})

// These fixtures are loopback-only visual/interaction evidence, never a production login.
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const render=!!BASE&&!!chromium&&['localhost','127.0.0.1','[::1]'].includes(new URL(BASE).hostname)
const response=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)})
for(const width of [320,390,834,1440])test('rendered restaurant facts / retry / return at '+width,{skip:!render,timeout:60000},async()=>{
 const browser=process.env.GT_UI_CHROME_PATH?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']}):await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
 const ctx=await browser.newContext({viewport:{width,height:width===1440?1000:900},isMobile:width<600,hasTouch:width<600})
 try{
  let state='ready',actionLink=null;const errors=[]
  const currentVenue={...venue,freshness_expires_at:new Date(Date.now()+86400000).toISOString()}
  const session={access_token:'gt-restaurant-fixture-access',refresh_token:'gt-restaurant-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'gt-restaurant-fixture-user',email:'restaurant.qa@goodtimes.invalid'}}
  await ctx.addInitScript(s=>{localStorage.setItem('gt_session',JSON.stringify(s));localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['food'],age:'25-34'}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},session)
  await ctx.route('**/api/data**',r=>r.fulfill(response({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:0,venues:1},events:[],venues:[currentVenue]})))
  await ctx.route('**/api/browse**',r=>{const url=new URL(r.request().url());return r.fulfill(response({ok:true,items:url.searchParams.get('kind')==='venue'?[{...currentVenue,booking_link:actionLink,restaurant_profile:state==='ready'?normalizeRestaurantProfile(profile,id):null,restaurant_profile_state:state}]:[],nextCursor:null,countType:'returned'}))})
  await ctx.route('**/rest/v1/**',r=>{
   const table=new URL(r.request().url()).pathname.split('/').at(-1)
   const data=table==='gt_taxonomy_categories'?[{category_key:'dining_culinary',category_name:'Food & Drink',sort_order:1,is_active:true}]:table==='gt_taxonomy_subcategories'?[{category_key:'dining_culinary',subcategory_key:'restaurant_places',subcategory_name:'Restaurants',sort_order:1,is_active:true}]:table==='v_gt_venue_taxonomy_directory'?[{...currentVenue,category_name:'Food & Drink',taxonomy_confidence:95}]:table==='v_gt_venue_taxonomy_counts'?[{category_key:'dining_culinary',subcategory_key:'restaurant_places',place_count:1}]:table==='v_gt_restaurant_entities'?[{...currentVenue,...profile}]:table==='gt_user_profiles'?[{id:'qa-profile',auth_id:session.user.id,full_name:'Restaurant QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['food']}]:[]
   return r.fulfill(response(data))
  })
  await ctx.route('**/auth/v1/**',r=>r.fulfill(response(session.user)))
  await ctx.route('**/functions/v1/**',r=>r.fulfill(response({ok:true,events:[],venues:[currentVenue]})))
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)))
  await page.goto(BASE,{waitUntil:'domcontentloaded'});await page.locator('.gt5-nav').waitFor({timeout:30000})
  await page.locator('.gt5-nav button').filter({hasText:'Places'}).click()
  const open=()=>page.getByRole('button',{name:'View Restaurant Detail QA',exact:true}).first().click()
  await open();const dialog=page.getByRole('dialog',{name:'Restaurant Detail QA',exact:true})
  await dialog.locator('.gtc-detail-facts').getByText('Tapas',{exact:true}).waitFor()
  assert.match(await dialog.locator('.gtc-detail-facts').innerText(),/Breakfast · Lunch · Dinner/)
  assert.equal(await dialog.getByRole('link',{name:/Official website/}).getAttribute('href'),venue.website)
  const folder=path.join(OUT,'restaurant-details',String(width));fs.mkdirSync(folder,{recursive:true})
  await page.screenshot({path:path.join(folder,'01-detail-top.png')})
  await dialog.locator('.gtc-detail-facts').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(folder,'02-restaurant-facts.png')})
  const overflow=await dialog.evaluate(el=>({dialog:el.scrollWidth-el.clientWidth,body:document.documentElement.scrollWidth-innerWidth}))
  assert.ok(overflow.dialog<=2&&overflow.body<=2,JSON.stringify(overflow))
  await dialog.getByRole('tab',{name:'Information',exact:true}).click();await dialog.getByRole('link',{name:/View source/}).waitFor()
  await dialog.getByRole('tab',{name:'Overview',exact:true}).click();await dialog.locator('.gtc-detail-facts').getByText('Tapas',{exact:true}).waitFor()
  await dialog.getByRole('button',{name:'Back to results',exact:true}).click()
  assert.equal(await page.locator('.gt5-nav button').count(),5);await page.screenshot({path:path.join(folder,'03-return-to-places.png')})
  state='unavailable';await open();await dialog.getByRole('button',{name:'Retry details',exact:true}).waitFor()
  assert.equal(await dialog.getByRole('link',{name:/Official website/}).count(),1)
  state='ready';await dialog.getByRole('button',{name:'Retry details',exact:true}).click();await dialog.locator('.gtc-detail-facts').getByText('Tapas',{exact:true}).waitFor()
  assert.equal(await dialog.getByRole('button',{name:'Retry details',exact:true}).count(),0)
  await dialog.getByRole('button',{name:'Back to results',exact:true}).click()
  state='missing';await open();assert.equal(await dialog.locator('.gtc-detail-facts').getByText('Cuisine',{exact:true}).count(),0)
  assert.doesNotMatch(await dialog.innerText(),/undefined|\[object Object\]/)
  for(const [label,url,file] of [
   ['Order online','https://order.toasttab.com/online/mister-burger-decatur','04-order-action.png'],
   ['Reserve a table','https://resy.com/cities/atlanta-ga/venues/sargent','05-reservation-action.png']
  ]){
   await dialog.getByRole('button',{name:'Back to results',exact:true}).click()
   actionLink=url;state='ready';await open()
   const link=dialog.getByRole('link',{name:label,exact:true});await link.waitFor()
   assert.equal(await link.getAttribute('href'),url)
   await page.screenshot({path:path.join(folder,file)})
   const actionOverflow=await dialog.evaluate(el=>({dialog:el.scrollWidth-el.clientWidth,body:document.documentElement.scrollWidth-innerWidth}))
   assert.ok(actionOverflow.dialog<=2&&actionOverflow.body<=2,JSON.stringify(actionOverflow))
  }
  assert.deepEqual(errors,[])
  fs.writeFileSync(path.join(folder,'receipt.json'),JSON.stringify({width,scope:'loopback-layout-and-interaction-fixture',facts:true,retry:true,missing:true,back:true,order_action:true,reservation_action:true,overflow,errors},null,2))
 }finally{await ctx.close();await browser.close()}
})
