import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires the existing rendered-UI CI environment':false
const FIXED=Date.parse('2026-09-28T00:30:00-04:00')
const SESSION={access_token:'gt-reference-fixture-access',refresh_token:'gt-reference-fixture-refresh',expires_at:4102444800,user:{id:'gt-reference-fixture-user',email:'reference.fixture@goodtimes.invalid'}}
const json=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)})
const placeCategories=[
 ['dining_culinary','Restaurants'],['nightlife','Nightlife Places'],['entertainment','Entertainment Venues'],
 ['attractions_experiences','Attractions'],['wellness_fitness','Wellness'],['family_kids','Family Places']
].map(([category_key,category_name],sort_order)=>({category_key,category_name,description:'Persistent place family.',sort_order,is_active:true}))
const subcategories=placeCategories.flatMap((c,i)=>Array.from({length:2},(_,j)=>({category_key:c.category_key,subcategory_key:`${c.category_key}_fixture_${j}`,subcategory_name:`${c.category_name} ${j+1}`,sort_order:j,is_active:true})))
const venues=Array.from({length:10},(_,i)=>{const c=placeCategories[i%placeCategories.length];const s=subcategories.find(x=>x.category_key===c.category_key);return{id:`0000000${i}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`.slice(-36),name:`QA Place ${i+1}`,city_key:'atlanta',category_key:c.category_key,subcategory_key:s.subcategory_key,subcategory:s.subcategory_name,venue_category_key:c.category_key,venue_subcategory:s.subcategory_name,neighborhood:i%2?'Midtown':'West Midtown',hero_image:'/venues/revel.webp',short_desc:'Deterministic QA place.',quality_score:90-i,status:'active',is_verified:true,verification_status:'verified_current',freshness_expires_at:'2026-10-28T00:00:00Z',latitude:33.77+i/1000,longitude:-84.39-i/1000,website:'https://example.invalid/place',address:'Fixture address, Atlanta'}})
const eventCats=['nightlife','concerts_live_music','festivals_major_activations','sports_watch','comedy_performing_arts','games_interactive','family_kids','attractions_experiences']
const events=Array.from({length:12},(_,i)=>({event_key:`show:1000000${i}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`.slice(0,41),id:`1000000${i}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`.slice(-36),title:`QA Entertainment ${i+1}`,event_date:i<8?'2026-09-28':'2026-10-02',event_time:`${String(18+(i%5)).padStart(2,'0')}:00`,city_key:'atlanta',venue_name:`QA Place ${(i%6)+1}`,category_key:eventCats[i%eventCats.length],subcategory_key:'fixture',image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/tickets',quality_score:90-i,is_verified:true,updated_at:'2026-09-28T03:00:00Z'}))
const counts=placeCategories.map(c=>({category_key:c.category_key,subcategory_key:null,place_count:venues.filter(v=>v.category_key===c.category_key).length})).concat(subcategories.map(s=>({category_key:s.category_key,subcategory_key:s.subcategory_key,place_count:venues.filter(v=>v.subcategory_key===s.subcategory_key).length})))
for(const vp of[{width:320,height:740},{width:390,height:844},{width:430,height:932},{width:834,height:1194}]){
 test(`Home/Places/Entertainment ${vp.width}: approved dense architecture remains usable`,{skip,timeout:70000},async()=>{
  const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH||undefined,headless:true,args:['--no-sandbox']})
  const ctx=await browser.newContext({viewport:vp,timezoneId:'America/New_York',reducedMotion:'reduce'})
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
  try{
   await ctx.addInitScript(({epoch,session})=>{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},{epoch:FIXED,session:SESSION})
   await ctx.route('**/api/**',route=>{const u=new URL(route.request().url()),p=u.pathname;if(p==='/api/health')return route.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true}));if(p.startsWith('/api/data'))return route.fulfill(json({ok:true,connected:true,city:'atlanta',events,venues,counts:{events:events.length,venues:venues.length}}));if(p==='/api/browse'){const kind=u.searchParams.get('kind')||'events';if(kind==='venue'){const id=u.searchParams.get('id');const item=[...venues].find(v=>v.id===id);return route.fulfill(json({ok:true,items:item?[item]:[],nextCursor:null,countType:'returned',asOf:new Date(FIXED).toISOString()}))}return route.fulfill(json({ok:true,items:events,nextCursor:null,countType:'returned',asOf:new Date(FIXED).toISOString()}));}if(p==='/api/sports-live')return route.fulfill(json({ok:true,items:[],nextCursor:null,asOf:new Date(FIXED).toISOString(),failedLeagues:[],partial:false}));if(p==='/api/saved-content')return route.fulfill(json({ok:true,items:[],asOf:new Date(FIXED).toISOString()}));return route.fulfill(json({ok:true}))})
   await ctx.route('**/rest/v1/**',route=>{const u=new URL(route.request().url()),table=u.pathname.split('/').at(-1);if(table==='gt_taxonomy_categories')return route.fulfill(json(placeCategories));if(table==='gt_taxonomy_subcategories')return route.fulfill(json(subcategories));if(table==='v_gt_venue_taxonomy_counts')return route.fulfill(json(counts));if(table==='v_gt_venue_taxonomy_directory'){const cat=String(u.searchParams.get('category_key')||'').replace(/^eq\./,'');const sub=String(u.searchParams.get('subcategory_key')||'').replace(/^eq\./,'');return route.fulfill(json(venues.filter(v=>(!cat||v.category_key===cat)&&(!sub||v.subcategory_key===sub))))}if(table==='v_gt_restaurant_entities')return route.fulfill(json(venues.filter(v=>v.category_key==='dining_culinary').map(v=>({...v,service_level:'upscale',cuisine_tags:['seafood'],occasion_tags:['date_night'],meal_tags:['dinner'],restaurant_vibe_tags:['high_energy'],feature_tags:['full_bar'],dietary_tags:[],ownership_tags:[],profile_confidence:90,needs_review:false})))) ;if(table==='gt_user_profiles')return route.fulfill(json([{id:'gt-reference-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES Reference QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['nightlife','dining']}]));return route.fulfill(json([]))})
   await ctx.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[],venues:[]})))
   await ctx.route('https://www.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<p>map fixture</p>'}))
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000});await page.locator('.gt5-app').waitFor({timeout:15000});await page.waitForTimeout(350)
   const nav=page.locator('.gt5-nav button')
   assert.deepEqual((await nav.allTextContents()).map(x=>x.replace(/^[^A-Za-z]+/,'').trim()),['Home','Places','Plan','Entertainment','Profile'])
   const homeModes=page.locator('.gt5-home-modes button');assert.deepEqual(await homeModes.allTextContents(),['For You','Upcoming','Tonight'])
   const homeCards=page.locator('.gtc-home .gtc-card');assert.ok(await homeCards.count()>=4,'Home should expose multiple useful choices')
   const cardBoxes=await homeCards.evaluateAll(items=>items.slice(0,6).map(x=>({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})))
   if(vp.width>=360)assert.ok(new Set(cardBoxes.slice(0,2).map(x=>Math.round(x.x))).size===2,'standard mobile must keep two-up Home density')
   assert.ok(cardBoxes.every(x=>x.h<280),'compact Home card regressed into oversized feature')
   await page.screenshot({path:path.join(OUT,`composition-${vp.width}-home.png`)})
   await homeModes.filter({hasText:/^Upcoming$/}).click();await page.locator('.gtc-events').waitFor();await page.locator('.gtc-events .gtc-card').nth(3).waitFor({state:'visible',timeout:10000});assert.ok(await page.locator('.gtc-events .gtc-card').count()>=4);await homeModes.filter({hasText:/^For You$/}).click()

   await nav.filter({hasText:/^Places$/}).click();await page.locator('.gtc-places').waitFor();assert.equal(await page.getByRole('textbox',{name:'Search Atlanta places'}).count(),1)
   assert.equal(await page.locator('.gtc-place-lanes>button').count(),6)
   const categoryBoxes=await page.locator('.gtc-place-lanes>button').evaluateAll(items=>items.slice(0,4).map(x=>({x:x.getBoundingClientRect().x,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,bg:getComputedStyle(x).backgroundImage})))
   if(vp.width>=360)assert.equal(new Set(categoryBoxes.slice(0,2).map(x=>Math.round(x.x))).size,2,'Places categories must be two-up on normal phones')
   assert.ok(categoryBoxes.every(x=>x.bg&&x.bg!=='none'),'Places entry lanes must remain photographic')
   await page.getByRole('button',{name:/Restaurants/}).click();await page.locator('.gtc-restaurants').waitFor();assert.ok(await page.locator('.gtc-restaurant-quick button').count()>=9);await page.locator('.gtc-restaurants .gtc-card').first().waitFor({timeout:10000});assert.ok(await page.locator('.gtc-restaurants .gtc-card').count()>=1)
   await page.screenshot({path:path.join(OUT,`composition-${vp.width}-places.png`)})
   await page.locator('.gtc-restaurants .gtc-card .gtc-card-open').first().click();await page.locator('.gtc-detail').waitFor();await page.locator('.gtc-place-intelligence').waitFor();assert.match(await page.locator('.gtc-place-intelligence').innerText(),/Service.*Cuisine.*Best for.*Meals.*Vibe.*Features/s);assert.match(await page.locator('.gtc-place-intelligence').innerText(),/Upscale.*Seafood.*Date Night.*Dinner.*High Energy.*Full Bar/s);await page.screenshot({path:path.join(OUT,`composition-${vp.width}-restaurant-detail.png`)});await page.locator('.gt5-detail-back').click();await page.locator('.gtc-restaurants').waitFor()

   await nav.filter({hasText:/^Entertainment$/}).click();await page.locator('.gtc-entertainment').waitFor();assert.equal(await page.locator('.gtc-entertainment-lane').count(),9)
   const lanes=await page.locator('.gtc-entertainment-lane').evaluateAll(items=>items.slice(0,4).map(x=>({x:x.getBoundingClientRect().x,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})))
   if(vp.width>=360)assert.equal(new Set(lanes.slice(0,2).map(x=>Math.round(x.x))).size,2,'Entertainment lanes must be two-up on normal phones')
   assert.deepEqual(await page.locator('.gtc-entertainment-time button').allTextContents(),['Tonight','This Weekend','Upcoming'])
   await page.locator('.gtc-entertainment-time button').filter({hasText:/^Upcoming$/}).click();await page.locator('.gtc-entertainment .gtc-card').first().waitFor({timeout:10000});assert.ok(await page.locator('.gtc-entertainment .gtc-card').count()>=4,'Upcoming Entertainment should surface multiple verified fixture options')
   await page.screenshot({path:path.join(OUT,`composition-${vp.width}-entertainment.png`)})

   await nav.filter({hasText:/^Profile$/}).click();await page.locator('.gtc-my-good-times').waitFor();assert.match(await page.locator('.gtc-my-good-times').innerText(),/Plans.*Places.*Entertainment/s)
   await page.screenshot({path:path.join(OUT,`composition-${vp.width}-profile.png`)})
   await page.locator('.gt5-bell').click();await page.locator('.gt5-radar').waitFor();await page.locator('.gt5-back').click();assert.equal(await page.locator('.gt5-app').getAttribute('data-screen'),'profile')
   const geometry=await page.evaluate(()=>({overflow:document.scrollingElement.scrollWidth-innerWidth,nav:[...document.querySelectorAll('.gt5-nav button')].map(x=>x.textContent.trim()),width:innerWidth}))
   assert.ok(geometry.overflow<=1);assert.deepEqual(errors,[])
   fs.writeFileSync(path.join(OUT,`composition-${vp.width}.json`),JSON.stringify({viewport:vp,cardBoxes,categoryBoxes,lanes,geometry,errors},null,2))
  }catch(error){await page.screenshot({path:path.join(OUT,`composition-${vp.width}-failure.png`)}).catch(()=>{});throw error}
  finally{await ctx.close();await browser.close()}
 })
}
