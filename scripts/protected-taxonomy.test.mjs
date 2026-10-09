/** GOOD TIMES product-preservation gate for the owner-approved Places / Entertainment split. */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8')

test('canonical app keeps the complete taxonomy source while Places and Entertainment own separate surfaces',()=>{
 const source=read('src/features/experience/GoodTimesCommandAppV4.jsx')
 const places=read('src/features/experience/complete/PlacesPages.jsx')
 assert.match(source,/<PlacesPages[^>]*taxonomy=\{taxonomy\}/,'Full live taxonomy must reach Places')
 for(const binding of ['taxonomy={taxonomy}','selectedCategory={category}','selectedSubcategory={sub}','onCategory={choose}','onSubcategory={setSub}','directoryOpen={directoryOpen}','onDirectoryOpen={setDirectoryOpen}','mapMode={mapMode}','onMapMode={setMapMode}'])assert.ok(places.includes(binding),`Protected Places binding missing: ${binding}`)
 assert.match(places,/<ExploreTaxonomyBrowser/)
 assert.match(places,/Browse all restaurant types & subcategories/)
 assert.match(source,/loadExploreTaxonomy\(/)
 assert.match(source,/const placesTaxonomy=useMemo\(\(\)=>taxonomy\.filter/)
 assert.match(source,/EntertainmentHub/)
 assert.match(source,/RestaurantExplorer/)
 assert.match(source,/const NAV=\[\['home','⌂','Home'\],\['places','⌕','Places'\],\['plan','＋','Plan'\],\['entertainment','◇','Entertainment'\],\['profile','◎','Profile'\]\]/)
})

test('category and subcategory sources stay authoritative instead of becoming a hardcoded replacement',()=>{
 const client=read('src/features/intelligence/client.js'),browser=read('src/features/experience/ExploreTaxonomyBrowser.jsx')
 for(const source of['gt_taxonomy_categories?','gt_taxonomy_subcategories?','v_gt_venue_taxonomy_directory?','v_gt_venue_taxonomy_counts?'])assert.ok(client.includes(source),`Canonical source removed: ${source}`)
 assert.match(client,/is_active=eq\.true/)
 assert.match(browser,/categoryRows\.map\(/);assert.match(browser,/subcategoryRows\.map\(/)
 assert.doesNotMatch(browser,/(?:categoryRows|subcategoryRows)\.slice\(/,'Do not truncate dynamic taxonomy')
 assert.match(browser,/This lane remains visible/)
})

const BASE=process.env.GT_UI_BASE
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires rendered UI CI; static checks still run':false
const epoch=Date.parse('2026-09-28T00:30:00-04:00')
const FAMILIES=[
 ['dining_culinary','Restaurants'],
 ['travel_staycations','Hotels & Stays'],
 ['attractions_experiences','Attractions'],
 ['wellness_fitness','Wellness'],
 ['fashion_beauty_shopping','Shopping'],
 ['family_kids','Family Places'],
]
const categories=FAMILIES.map(([category_key,category_name],sort_order)=>({category_key,category_name,sort_order,is_active:true}))
const subcategories=categories.flatMap((cat,i)=>Array.from({length:i===5?3:2},(_,j)=>({category_key:cat.category_key,subcategory_key:`guard_sub_${i}_${j}`,subcategory_name:`${cat.category_name} option ${j+1}`,sort_order:j,is_active:true})))
const venues=subcategories.filter(s=>s.subcategory_key!=='guard_sub_5_2').map((s,i)=>({id:`600000${String(i).padStart(2,'0')}-6666-4666-8666-666666666666`,name:`Catalog place ${i+1}`,city_key:'atlanta',category_key:s.category_key,subcategory_key:s.subcategory_key,subcategory:s.subcategory_name,venue_category_key:s.category_key,venue_subcategory:s.subcategory_name,neighborhood:'Midtown',short_desc:'Isolated regression fixture.',hero_image:'/venues/revel.webp',address:'Fixture address only',latitude:33.78,longitude:-84.38,quality_score:90-i,status:'active',is_verified:true,verification_status:'verified_current',freshness_expires_at:'2026-10-28T00:00:00Z',website:'https://example.invalid/place'}))
const counts=categories.map(c=>({category_key:c.category_key,subcategory_key:null,place_count:venues.filter(v=>v.category_key===c.category_key).length})).concat(subcategories.map(s=>({category_key:s.category_key,subcategory_key:s.subcategory_key,place_count:venues.filter(v=>v.subcategory_key===s.subcategory_key).length})))
const events=[{event_key:'show:77777777-7777-4777-8777-777777777777',id:'77777777-7777-4777-8777-777777777777',title:'Regression entertainment fixture',city_key:'atlanta',category_key:'concerts_live_music',event_date:'2026-09-28',event_time:'20:00',venue_name:'Fixture venue',image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/ticket',quality_score:90,is_verified:true,updated_at:'2026-09-28T03:00:00Z'}]
const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)})
for(const viewport of[{width:390,height:844},{width:1440,height:1000}]){
 test(`Places families, restaurant facets and Entertainment remain usable at ${viewport.width}px`,{skip,timeout:120000},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(BASE).hostname),'Fixtures must never target production')
  const browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})
  const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'America/New_York'}),page=await context.newPage(),errors=[],requests=[],traversed=[]
  const dir=path.join(process.env.GT_UI_ARTIFACTS||'ui-artifacts','protected-taxonomy',String(viewport.width));fs.mkdirSync(dir,{recursive:true});page.on('pageerror',e=>errors.push(e.message))
  const capture=name=>page.screenshot({path:path.join(dir,`${name}.png`),animations:'disabled'})
  try{
   await context.addInitScript(epoch=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify({access_token:'isolated-taxonomy-fixture',user:{id:'11111111-1111-4111-8111-111111111111'},expires_at:4102444800}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},epoch)
   await context.route('**/auth/v1/**',r=>r.fulfill(json({external:{google:true}})))
   await context.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/health')return r.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true}));if(p.startsWith('/api/data'))return r.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',events,venues:[],counts:{events:1,venues:0}}));if(p==='/api/browse')return r.fulfill(json({ok:true,items:events,nextCursor:null,asOf:new Date(epoch).toISOString()}));return r.fulfill(json({ok:true}))})
   await context.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').at(-1);requests.push({table:t,query:u.search});if(t==='gt_taxonomy_categories')return r.fulfill(json(categories));if(t==='gt_taxonomy_subcategories')return r.fulfill(json(subcategories));if(t==='v_gt_venue_taxonomy_counts')return r.fulfill(json(counts));if(t==='v_gt_venue_taxonomy_directory'){const key=String(u.searchParams.get('category_key')||'').replace(/^eq\./,''),sub=String(u.searchParams.get('subcategory_key')||'').replace(/^eq\./,'');return r.fulfill(json(venues.filter(v=>(!key||v.category_key===key)&&(!sub||v.subcategory_key===sub))))}if(t==='v_gt_restaurant_entities')return r.fulfill(json(venues.filter(v=>v.category_key==='dining_culinary').map(v=>({...v,service_level:'upscale',cuisine_tags:['seafood'],occasion_tags:['date_night'],meal_tags:['dinner'],restaurant_vibe_tags:['high_energy'],feature_tags:['full_bar'],dietary_tags:[],ownership_tags:[],profile_confidence:90,needs_review:false}))));if(t==='gt_user_profiles')return r.fulfill(json([{id:'22222222-2222-4222-8222-222222222222',auth_id:'11111111-1111-4111-8111-111111111111',full_name:'Taxonomy QA'}]));return r.fulfill(json([]))})
   await context.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[],venues:[]})))
   await context.route('https://www.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<p>map fixture</p>'}))
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000});await page.locator('.gt5-nav').getByRole('button',{name:'Places',exact:true}).click();await page.locator('.gt-compact-category-grid').waitFor({timeout:15000})
   assert.deepEqual(await page.locator('.gt-compact-category-grid strong').allTextContents(),FAMILIES.map(x=>x[1]));await capture('all-place-families')
   for(const [key,label] of FAMILIES){
    if(key==='dining_culinary'){
     await page.locator('[data-gt-category="dining_culinary"]').click();await page.locator('.gtc-restaurants').waitFor();assert.ok(await page.locator('.gtc-restaurant-quick button').count()>=9);await page.locator('.gtc-restaurants .gtc-card').first().waitFor({timeout:10000});assert.ok(await page.locator('.gtc-restaurants .gtc-card').count()>=1);traversed.push(key);await page.getByRole('navigation',{name:'Place shortcuts'}).getByRole('button',{name:'All Places',exact:true}).click();await page.locator('.gt-compact-category-grid').waitFor();continue
    }
    await page.locator(`[data-gt-category="${key}"]`).click();const grid=page.locator(`[data-gt-subcategories="${key}"]`);await grid.waitFor();const subs=subcategories.filter(s=>s.category_key===key);assert.deepEqual(await grid.locator('button strong').allTextContents(),[`All ${label}`,...subs.map(s=>s.subcategory_name)])
    const sub=subs[0],venue=venues.find(v=>v.subcategory_key===sub.subcategory_key);await grid.getByRole('button',{name:new RegExp(sub.subcategory_name)}).click();await page.locator('.gt2-venue-grid h3').filter({hasText:venue.name}).waitFor();traversed.push(key)
    if(key==='family_kids'){await capture('family-directory');await page.locator('.gt2-venue-grid .gtc-card-open').first().click();await page.locator('.gtc-detail').waitFor();await page.getByRole('button',{name:'Back to results'}).click();assert.match(await page.locator('.gt-compact-subcategories summary').innerText(),new RegExp(sub.subcategory_name),'Detail return lost selected subcategory summary');assert.ok(await page.locator('.gt2-venue-grid h3').filter({hasText:venue.name}).count()>=1,'Detail return lost retained result set');await page.locator('.gt2-explore-toggle').getByRole('button',{name:'Map',exact:true}).click();await page.locator('.gt30-map iframe').waitFor();await capture('family-map');await page.locator('.gt2-explore-toggle').getByRole('button',{name:'Directory',exact:true}).click();await page.locator('.gt-compact-subcategories summary').click();await grid.getByRole('button',{name:new RegExp(subs[2].subcategory_name)}).click();await page.getByRole('heading',{name:'No verified matches yet'}).waitFor();assert.equal(await grid.locator('button strong').count(),4,'Empty subcategory removed')}
    await page.getByRole('button',{name:'‹ All categories',exact:true}).click();await page.locator('.gt-compact-category-grid').waitFor()
   }
   assert.equal(traversed.length,FAMILIES.length)
   await page.locator('.gt5-nav').getByRole('button',{name:'Entertainment',exact:true}).click();await page.locator('[data-page="14"]').waitFor();assert.equal(await page.getByRole('navigation',{name:'Entertainment categories'}).locator('button').count(),10);
   assert.deepEqual(errors,[]);for(const name of['gt_taxonomy_categories','gt_taxonomy_subcategories','v_gt_venue_taxonomy_directory'])assert.ok(requests.some(r=>r.table===name),`Missing source request ${name}`)
   fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({scope:'isolated fixture; not production auth/catalog proof',viewport,place_families_checked:FAMILIES.length,journeys_checked:traversed.length,restaurant_facets_checked:true,entertainment_lanes_checked:9,map_checked:true,detail_return_checked:true,empty_subcategory_retained:true,errors,requests},null,2))
  }catch(e){await capture('failure').catch(()=>{});throw e}finally{await context.close();await browser.close()}
 })
}
