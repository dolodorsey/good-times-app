import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires the existing rendered-UI CI environment':false
const FIXED=Date.parse('2026-09-14T12:00:00Z')
const SESSION={access_token:'gt-reference-fixture-access',refresh_token:'gt-reference-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'gt-reference-fixture-user',email:'reference.fixture@goodtimes.invalid'}}
const json=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)})
const EVENT={event_key:'composition-fixture:event',title:'Evening city experience',event_date:'2026-09-14',event_time:'20:00',city_key:'atlanta',venue_name:'QA fixture venue',category_key:'nightlife',image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/no-transaction',quality_score:80,is_verified:true}
const VENUES=['restaurant','nightlife','concerts_live_music','hotel'].map((category,i)=>({id:`composition-fixture:${i}`,name:`QA ${category}`,city_key:'atlanta',category_key:category,hero_image:'/venues/revel.webp',short_desc:'Deterministic QA data only.',quality_score:80-i}))
for(const vp of[{width:320,height:740},{width:390,height:844},{width:430,height:932},{width:834,height:1194}]){
 test(`Home/Discover ${vp.width}: reference density retains all controls`,{skip,timeout:50000},async()=>{
  const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH||undefined,headless:true,args:['--no-sandbox']})
  const ctx=await browser.newContext({viewport:vp,timezoneId:'America/New_York'})
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
  try{
   await ctx.addInitScript(({epoch,session})=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};window.Date=FixedDate;localStorage.setItem('gt_session',JSON.stringify(session));localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife','grown'],age:'25-34'}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},{epoch:FIXED,session:SESSION})
   await ctx.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill(json(p==='/api/health'?{ok:true,service:'good-times',customer_ready:true,content_ready:true}:p.startsWith('/api/data')?{ok:true,connected:true,city:'atlanta',events:[EVENT,...['concerts_live_music','sports_watch','festivals_major_activations'].map((category,i)=>({...EVENT,event_key:`mixed:${i}`,title:`Upcoming ${category}`,category_key:category,image_url:null}))],venues:VENUES}:{ok:true}))})
   await ctx.route('**/rest/v1/**',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/gt_user_profiles'))return r.fulfill(json([{id:'gt-reference-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES Reference QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['nightlife','grown']}])) ;return r.fulfill(json([]))})
   await ctx.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[],venues:[]})))
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000});await page.locator('.gt5-app').waitFor({timeout:15000});await page.waitForTimeout(350)
   const nav=page.locator('.gt5-nav button')
   assert.deepEqual((await nav.allTextContents()).map(x=>x.replace(/^[^A-Za-z]+/,'').trim()),['Home','Discover','Plan','Saved','Profile'])
   const homeModes=page.locator('.gt5-home-modes button')
   assert.deepEqual(await homeModes.allTextContents(),['For You','Upcoming','Tonight'])
   for(const box of await homeModes.evaluateAll(items=>items.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))))assert.ok(box.h>=41.9,`home mode touch target too small: ${JSON.stringify(box)}`)
   await homeModes.filter({hasText:'Upcoming'}).click()
   await page.locator('.gt5-newsletter-upcoming').waitFor({timeout:5000})
   const upcomingRows=page.locator('.gt5-upcoming-row')
   assert.ok(await upcomingRows.count()>=4,'Upcoming should render the existing current fixture inventory as a list')
   const upcomingGeometry=await upcomingRows.evaluateAll(items=>items.slice(0,4).map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})))
   for(const box of upcomingGeometry){assert.ok(box.h<=100,`Upcoming row is oversized: ${JSON.stringify(box)}`);assert.ok(box.w<=vp.width)}
   if(vp.width===390)await page.screenshot({path:path.join(OUT,`composition-fixture-${vp.width}-upcoming.png`)})
   await homeModes.filter({hasText:'Tonight'}).click()
   await page.locator('.gt5-newsletter-tonight').waitFor({timeout:5000})
   assert.ok(await page.locator('.gt5-upcoming-row').count()>=1,'Tonight must reuse current event rows')
   if(vp.width===390)await page.screenshot({path:path.join(OUT,`composition-fixture-${vp.width}-tonight.png`)})
   await homeModes.filter({hasText:'For You'}).click()
   const quick=await page.locator('.gt5-home-quick button').evaluateAll(items=>items.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})))
   assert.equal(quick.length,6)
   for(const r of quick)assert.ok(r.w>=43.9&&r.h>=44,`quick action below 44px: ${JSON.stringify(r)}`)
   const feature=await page.locator('.gt5-highlight-grid .gt5-card').first().boundingBox(),dock=await page.locator('.gt5-nav').boundingBox()
   assert.ok(feature&&dock&&feature.y<dock.y-40,'featured content is pushed entirely below the first view')
   const highlights=page.locator('.gt5-highlight-grid .gt5-card')
   assert.equal(await highlights.count(),4,'Home must show a mixed set, not a single oversized feature')
   assert.deepEqual(await highlights.evaluateAll(cards=>cards.map(card=>card.dataset.category)),['concerts_live_music','sports_watch','festivals_major_activations','restaurant'])
   const headingFont=await highlights.first().locator('h3').evaluate(el=>getComputedStyle(el).fontFamily)
   assert.ok(!/Playfair|Georgia|Garamond/.test(headingFont),`legacy serif override returned: ${headingFont}`)
   if(vp.width>=390){const second=await highlights.nth(1).boundingBox();assert.ok(second.y+second.height<dock.y,'first two complete choices must fit above navigation')}
   const bell=page.locator('.gt5-bell');assert.ok(await bell.isVisible(),'Radar bell must not disappear on compact phones')
   await page.screenshot({path:path.join(OUT,`composition-fixture-${vp.width}-home.png`)})
   await nav.filter({hasText:'Discover'}).click();await page.locator('.gt5-lanes').waitFor({timeout:5000})
   assert.deepEqual(await page.locator('.gt5-lanes strong').allTextContents(),['Eat Well','Turn Up','Be There','Stay Right','Do More'])
   const lanes=await page.locator('.gt5-lanes button').evaluateAll(items=>items.map(x=>({top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom,height:x.getBoundingClientRect().height})))
   const navTop=(await page.locator('.gt5-nav').boundingBox()).y
   if(vp.width>=390&&vp.width<600)assert.ok(lanes.filter(x=>x.bottom<navTop).length>=3,'at least three complete editorial lanes should be visible on standard phones')
   await page.screenshot({path:path.join(OUT,`composition-fixture-${vp.width}-discover.png`)})
   await page.locator('.gt5-bell').click();await page.locator('.gt5-radar').waitFor({timeout:5000});await page.locator('.gt5-back').click();assert.equal(await page.locator('.gt5-app').getAttribute('data-screen'),'discover')
   const geometry=await page.evaluate(()=>{const r=document.querySelector('.gt5-nav').getBoundingClientRect();const b=document.querySelector('.gt5-bell').getBoundingClientRect();return{overflow:document.scrollingElement.scrollWidth-innerWidth,nav:{left:r.left,right:r.right,bottom:r.bottom},bell:{left:b.left,right:b.right,width:b.width,height:b.height},width:innerWidth,height:innerHeight}})
   assert.ok(geometry.overflow<=1);assert.ok(geometry.nav.left>=-2&&geometry.nav.right<=geometry.width+2&&geometry.nav.bottom<=geometry.height+2)
   assert.ok(geometry.bell.right<=geometry.width&&geometry.bell.width>=44&&geometry.bell.height>=44)
   assert.deepEqual(errors,[])
   fs.writeFileSync(path.join(OUT,`composition-fixture-${vp.width}.json`),JSON.stringify({viewport:vp,quick,lanes,geometry,errors},null,2))
  }catch(error){await page.screenshot({path:path.join(OUT,`composition-fixture-${vp.width}-failure.png`)}).catch(()=>{});throw error}
  finally{await ctx.close();await browser.close()}
 })
}
