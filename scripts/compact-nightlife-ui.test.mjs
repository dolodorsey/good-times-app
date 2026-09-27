import test, {after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_COMPACT_UI_BASE
const BASELINE=process.env.GT_COMPACT_BASELINE==='1'
const OUT=process.env.GT_COMPACT_ARTIFACTS||'ui-artifacts/compact-pilot'
const skip=!BASE?'set GT_COMPACT_UI_BASE to a loopback build':false
if(BASE)assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(BASE).hostname),'Fixtures are forbidden on non-loopback origins')
const {chromium}=BASE?await import('playwright-core'):{chromium:null}
const uuid=index=>`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`
const media='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/'
const categories=[['nightlife','Nightlife'],['concerts_live_music','Concerts & Live Music'],['festivals_major_activations','Festivals & Major Activations'],['comedy_performing_arts','Comedy & Performing Arts'],['arts_museums_culture','Arts, Museums & Culture'],['entertainment','Entertainment'],['dining_culinary','Food & Drink'],['sports_watch','Sports & Watch Experiences'],['day_parties_brunch','Day Parties & Brunch'],['family_kids','Family & Kids'],['wellness_fitness','Wellness & Fitness'],['travel_staycations','Travel, Hotels & Staycations'],['qa_future_category','Future Category — QA']].map(([category_key,category_name],index)=>({category_key,category_name,sort_order:index,is_active:true}))
const subcategories=[['nightclubs','Clubs'],['lounges','Lounges'],['weekly_parties','Weekly Parties'],['after_parties','After-Parties'],['hookah_nights','Hookah Nights'],['rooftop_nights','Rooftops'],['late_night','Late Night']].map(([subcategory_key,subcategory_name],index)=>({category_key:'nightlife',subcategory_key,subcategory_name,sort_order:index,is_active:true}))
subcategories.push({category_key:'qa_future_category',subcategory_key:'qa_future_type',subcategory_name:'Future Empty Type — QA',sort_order:0,is_active:true})
const supplied=[['Opium','West Midtown',media+'OPIUM_ATL.jpg'],['Revel Atlanta','West Midtown',media+'REVEL.webp'],['Seven Midtown','Midtown','https://sevenmidtown.com/wp-content/uploads/2025/02/20250124_Seven_067-1.jpg'],['Utopia','Downtown',media+'UTOPIA_DOWNTOWN.webp']]
const venues=Array.from({length:30},(_,index)=>({id:uuid(index+1),city_key:'atlanta',name:supplied[index]?.[0]||(index===28?'Beyond First Page Club':index===29?'Recovery Club':`QA Club ${index+1}`),neighborhood:supplied[index]?.[1]||'Atlanta',category_key:'nightlife',category_name:'Nightlife',subcategory:'Clubs',subcategory_key:'nightclubs',venue_category_key:'nightclub',venue_subcategory:'Nightclubs',hero_image:supplied[index]?.[2]||null,short_desc:'Deterministic QA record, not a live inventory claim.',quality_score:90,latitude:index===2?null:33.78+index*.001,longitude:index===2?null:-84.4,website:'https://example.test/venue',booking_link:'https://example.test/reserve',status:'active',taxonomy_confidence:99,vibe_tags:['nightlife'],is_verified:true,verification_status:'verified_current',freshness_expires_at:new Date(Date.now()+86400000).toISOString()}))
const restaurant={...venues[0],id:uuid(90),name:'QA Restaurant with Cocktails',category_key:'dining_culinary',category_name:'Food & Drink',subcategory_key:'indian',subcategory:'Indian',venue_category_key:'restaurant'}
const counts=[...categories.map(row=>({category_key:row.category_key,subcategory_key:null,place_count:row.category_key==='nightlife'?30:0})),...subcategories.map(row=>({category_key:row.category_key,subcategory_key:row.subcategory_key,place_count:row.subcategory_key==='nightclubs'?30:0}))]
const SESSION={access_token:'gt-compact-fixture-access',refresh_token:'gt-compact-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:uuid(999),email:'compact.fixture@goodtimes.invalid'}}
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})
fs.mkdirSync(OUT,{recursive:true})
const fixtureBrowsers=[]
after(async()=>{await Promise.allSettled(fixtureBrowsers.map(browser=>browser.close()))})

async function open(width,height){
 const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']})
 fixtureBrowsers.push(browser)
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'})
 const requests=[],saved=[],errors=[];let recoveryFailed=false
 // Catch every data write and all API calls: fixture runs cannot publish real telemetry or bookings.
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname
  if(p.startsWith('/rest/v1/')){
   const table=p.split('/').at(-1)
   if(table==='gt_taxonomy_categories')return route.fulfill(json(categories))
   if(table==='gt_taxonomy_subcategories')return route.fulfill(json(subcategories))
   if(table==='v_gt_venue_taxonomy_counts')return route.fulfill(json(counts))
   if(table==='v_gt_venue_taxonomy_directory'){
    requests.push(url.toString())
    const category=url.searchParams.get('category_key')?.replace(/^eq\./,''),sub=url.searchParams.get('subcategory_key')?.replace(/^eq\./,'')
    const and=url.searchParams.get('and')||'',search=and.match(/name\.ilike\."\*([^\"]*)\*"/)?.[1]?.toLowerCase()||''
    if(search==='recovery'&&!recoveryFailed){recoveryFailed=true;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture unavailable"}'})}
    let selected=[...venues,restaurant].filter(row=>(!category||row.category_key===category)&&(!sub||row.subcategory_key===sub)&&(!search||`${row.name} ${row.neighborhood} ${row.category_name} ${row.subcategory}`.toLowerCase().includes(search)))
    const after=and.match(/id\.gt\.([0-9a-f-]{36})/)?.[1]
    if(after)selected=selected.filter(row=>row.id>after)
    const limit=Number(url.searchParams.get('limit')||2500)
    return route.fulfill(json(selected.slice(0,limit)))
   }
   if(table==='gt_user_profiles')return route.fulfill(json([{id:uuid(998),auth_id:SESSION.user.id,full_name:'GOOD TIMES QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['nightlife']}]))
   if(table==='gt_saved_items'){
    if(req.method()==='POST'){const data=req.postDataJSON();saved.splice(0,saved.length,{...data,id:uuid(997)});return route.fulfill({...json(saved),status:201})}
    if(req.method()==='DELETE'){saved.length=0;return route.fulfill({status:204,body:''})}
    return route.fulfill(json(saved))
   }
   return route.fulfill(json([]))
  }
  if(p.startsWith('/api/'))return route.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true,connected:true,degraded:false,city:'atlanta',events:[],venues:venues.slice(0,4),counts:{events:0,venues:4},fixture:true}))
  if(p.includes('/functions/v1/'))return route.fulfill(json({ok:true,events:[],venues:venues.slice(0,4),message:'QA fixture only'}))
  if(p.includes('/auth/v1/'))return route.fulfill(json(SESSION))
  if(req.method()!=='GET'&&req.method()!=='HEAD')return route.fulfill({status:204,body:''})
  return route.continue()
 })
 await ctx.addInitScript(session=>{localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},SESSION)
 const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(String(error)))
 await page.goto(BASE+(BASE.includes('?')?'&':'?')+'gt_compact='+(BASELINE?'0':'1'),{waitUntil:'domcontentloaded',timeout:60000})
 await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000}).catch(async error=>{await page.screenshot({path:path.join(OUT,`${width}x${height}-boot-failure.png`)});fs.writeFileSync(path.join(OUT,`${width}x${height}-boot-failure.json`),JSON.stringify({fixture:true,errors,body:await page.locator('body').innerText()},null,2));throw error})
 await page.locator('.gt5-nav button').filter({hasText:'Discover'}).click()
 await page.locator('[data-gt-category="nightlife"]').waitFor({state:'visible',timeout:30000})
 return {browser,ctx,page,requests,errors}
}
async function photo(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:false});await page.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:55,fullPage:false})}
for(const {width,height}of [{width:390,height:844},{width:430,height:932},{width:1440,height:900}]){
 test(`${BASELINE?'baseline':'compact'} Nightlife ${width}x${height}`,{skip,timeout:150000},async()=>{
  const {browser,ctx,page,requests,errors}=await open(width,height)
  try{
   await photo(page,`${width}x${height}-discover-FIXTURE`)
   assert.equal(await page.locator('[data-gt-category]').count(),categories.length)
   await page.locator('[data-gt-category="nightlife"]').click()
   await page.locator('.gt2-subcategory-grid button').filter({hasText:'Clubs'}).first().waitFor({state:'visible'})
   await photo(page,`${width}x${height}-subcategories-FIXTURE`)
   await page.locator('.gt2-subcategory-grid button').filter({hasText:'Clubs'}).first().click()
   await page.locator('.gt2-venue-grid .gt5-card').first().waitFor({state:'visible',timeout:15000})
   await page.waitForTimeout(700)
   await page.locator('.gt5-main').evaluate(el=>{el.scrollTop=0})
   await photo(page,`${width}x${height}-clubs-FIXTURE`)
   if(BASELINE)return
   assert.equal(await page.locator('.gt5-app').getAttribute('data-compact'),'true')
   assert.equal(await page.locator('.gt5-intents').count(),0)
   const metrics=await page.evaluate(()=>{
    const main=document.querySelector('.gt5-main').getBoundingClientRect(),nav=document.querySelector('.gt5-nav').getBoundingClientRect()
    const cards=[...document.querySelectorAll('.gtc-venue-grid .gt5-card')]
    const complete=cards.filter(card=>{const r=card.getBoundingClientRect();return r.top>=main.top&&r.bottom<=Math.min(main.bottom,nav.top)})
    return {gridWidth:document.querySelector('.gtc-venue-grid').getBoundingClientRect().width,minCardWidth:Math.min(...cards.map(card=>card.getBoundingClientRect().width)),columns:getComputedStyle(document.querySelector('.gtc-venue-grid')).gridTemplateColumns.split(' ').length,visibleComplete:complete.length,overflow:document.documentElement.scrollWidth-innerWidth,labels:[...document.querySelectorAll('.gt5-nav button')].map(button=>button.innerText.replace(/^[^A-Za-z]+/,'').trim())}
   })
   fs.writeFileSync(path.join(OUT,`${width}x${height}-geometry.json`),JSON.stringify(metrics,null,2))
   assert.equal(metrics.columns,metrics.gridWidth>=1100?4:metrics.gridWidth>=700?3:metrics.gridWidth<=307?1:2)
   assert.ok(metrics.minCardWidth>=150,`Card width ${metrics.minCardWidth}px is unreadable`)
   assert.ok(metrics.overflow<=1,`horizontal overflow ${metrics.overflow}`)
   assert.ok(metrics.visibleComplete>=4,`only ${metrics.visibleComplete} complete entries at ${width}`)
   assert.deepEqual(metrics.labels,['Home','Discover','Plan','Saved','Profile'])
   assert.equal(await page.locator('.gtc-venue-grid .gt5-card').count(),24)
   assert.equal(await page.getByText('QA Restaurant with Cocktails',{exact:true}).count(),0)
   const search=page.getByRole('textbox',{name:'Search venues and categories'})
   assert.ok(requests.some(url=>url.includes('subcategory_key=eq.nightclubs')&&url.includes('limit=25')))
   await page.locator('.gtc-venue-grid .gt5-save').first().click()
   await page.locator('.gtc-venue-grid .gt5-save.active').first().waitFor({state:'visible'})
   assert.equal(await page.locator('.gt5-detail').count(),0,'Save also opened detail')
   await page.locator('.gtc-venue-grid .gt5-card').first().click({position:{x:70,y:70}})
   await page.locator('.gt5-detail').waitFor({state:'visible'})
   await photo(page,`${width}x${height}-detail-FIXTURE`)
   await page.locator('.gt5-detail-back').click()
   assert.equal(await page.locator('.gtc-venue-grid .gt5-card').count(),24)
   await page.getByRole('button',{name:'Load more venues',exact:true}).click()
   await page.waitForFunction(()=>document.querySelectorAll('.gtc-venue-grid .gt5-card').length===30)
   await page.locator('.gt5-main').evaluate(el=>{el.scrollTop=0})
   await page.locator('.gt2-explore-toggle button').filter({hasText:'Map'}).click()
   await page.getByRole('combobox',{name:'Show venue on map'}).waitFor({state:'visible'})
   assert.match(await page.locator('.gtc-map iframe').getAttribute('src'),/marker=/)
   await page.locator('.gt2-explore-toggle button').filter({hasText:'Directory'}).click()
   await search.fill('Beyond First Page')
   await page.waitForFunction(()=>document.querySelectorAll('.gtc-venue-grid .gt5-card').length===1&&document.querySelector('.gtc-venue-grid').textContent.includes('Beyond First Page Club'))
   await search.fill('Recovery')
   await page.locator('.gtc-error').waitFor({state:'visible'})
   assert.equal(await page.getByText('No venues match this selection',{exact:true}).count(),0)
   await photo(page,`${width}x${height}-retry-FIXTURE`)
   await page.locator('.gtc-error button').click()
   await page.waitForFunction(()=>document.querySelector('.gtc-venue-grid')?.textContent.includes('Recovery Club'))
   await search.fill('no such entry')
   await page.getByText('No venues match this selection',{exact:true}).waitFor({state:'visible'})
   await page.locator('.gt5-nav button').filter({hasText:'Home'}).click()
   await page.locator('.gt5-nav button').filter({hasText:'Discover'}).click()
   await page.locator('[data-gt-category="qa_future_category"]').waitFor({state:'visible'})
   assert.equal(await page.getByRole('textbox',{name:'Search venues and categories'}).inputValue(),'')
   await page.locator('[data-gt-category="qa_future_category"]').click()
   await page.locator('[data-gt-subcategory="qa_future_type"]').click()
   await page.getByText('No venues match this selection',{exact:true}).waitFor({state:'visible'})
   assert.deepEqual(errors,[])
   fs.writeFileSync(path.join(OUT,`${width}x${height}-metrics.json`),JSON.stringify({fixture:true,metrics,requests,errors,tests:'category reachability, two-column density, independent save, detail return, scoped pagination, map selection, beyond-first-page search, error/retry, empty state, clean reentry'},null,2))
  }finally{await ctx.close();await browser.close()}
 })
}
