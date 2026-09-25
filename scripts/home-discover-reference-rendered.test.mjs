import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {installUXCatalogFixtures,openUXTab,PRIMARY_LABELS,assertVisibleTargets} from './ux-render-fixtures.mjs'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires the rendered UI environment':false
const FIXED=Date.parse('2026-09-14T12:00:00Z')
const SESSION={access_token:'gt-reference-fixture-access',expires_at:4102444800,user:{id:'gt-reference-fixture-user',email:'reference.fixture@goodtimes.invalid'}}
const json=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)})
const EVENTS=['nightlife','concerts_live_music','sports_watch','festivals_major_activations'].map((category,i)=>({event_key:`composition:${i}`,title:`Upcoming ${category}`,event_date:'2026-09-14',event_time:'20:00',city_key:'atlanta',venue_name:'QA fixture venue',category_key:category,image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/no-transaction',quality_score:90-i,is_verified:true}))
const VENUES=['restaurant','nightlife','concerts_live_music','hotel'].map((category,i)=>({id:`composition-venue:${i}`,name:`QA ${category}`,city_key:'atlanta',category_key:category,hero_image:'/venues/revel.webp',short_desc:'Deterministic QA data only.',quality_score:80-i}))
for(const viewport of[{width:320,height:740},{width:390,height:844},{width:430,height:932},{width:834,height:1194}]){
 test(`Home and split discovery ${viewport.width}: density, search and touch targets`,{skip,timeout:50000},async()=>{
  const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']}),ctx=await browser.newContext({viewport,timezoneId:'America/New_York'}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
  try{
   await ctx.addInitScript(({epoch,session})=>{const Native=Date;window.Date=class extends Native{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},{epoch:FIXED,session:SESSION})
   await ctx.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill(json(p==='/api/health'?{ok:true,service:'good-times',customer_ready:true,content_ready:true}:p.startsWith('/api/data')?{ok:true,connected:true,city:'atlanta',events:EVENTS,venues:VENUES}:{ok:true}))})
   await ctx.route('**/rest/v1/**',r=>r.fulfill(json(r.request().url().includes('gt_user_profiles')?[{id:'reference-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES Reference QA',home_city:'atlanta',last_city:'atlanta'}]:[])))
   await ctx.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[],venues:[]})))
   await installUXCatalogFixtures(ctx,EVENTS,VENUES)
   await page.goto(BASE,{waitUntil:'domcontentloaded'});await page.locator('.gt-ux-home .gt-ux-card').first().waitFor({timeout:15000})
   assert.deepEqual(await page.locator('.gt5-nav button small').allTextContents(),PRIMARY_LABELS)
   const modes=page.locator('.gt-ux-home-modes button')
   assert.deepEqual(await modes.allTextContents(),['For You','Upcoming','Tonight','Sports'])
   const controls=await assertVisibleTargets(page,'.gt-ux-home-modes button')
   const picks=page.locator('.gt-ux-home .gt-ux-card-grid').first().locator('.gt-ux-card')
   assert.equal(await picks.count(),5,'Home presents a varied shortlist, not an oversized single promotion')
   const categories=await picks.locator('.gt-ux-card-info>small').allTextContents()
   assert.ok(new Set(categories).size>=4,'Top picks must retain category diversity')
   const boxes=await picks.evaluateAll(items=>items.map(el=>{const b=el.getBoundingClientRect();return{w:b.width,h:b.height,y:b.y}})),dock=await page.locator('.gt5-nav').boundingBox()
   // Two complete, readable choices above the dock on standard phones.
   if(viewport.width>=390&&viewport.width<600)for(const b of boxes.slice(0,2))assert.ok(b.y+b.h<=dock.y,`Top picks buried below the opening view: ${JSON.stringify(b)}`)
   for(const b of boxes)assert.ok(b.w<=225&&b.h<=290,`Oversized top pick: ${JSON.stringify(b)}`)
   const titleFont=await picks.first().locator('h3').evaluate(el=>getComputedStyle(el).fontFamily)
   assert.ok(!/Playfair|Georgia|Garamond/.test(titleFont),'Card titles must stay readable sans-serif')
   await page.screenshot({path:path.join(OUT,`composition-${viewport.width}-home.png`)})
   await modes.filter({hasText:/^Upcoming$/}).click();await page.getByText('Coming up in Atlanta',{exact:true}).waitFor()
   const rows=page.locator('.gt-ux-rows .gt-ux-card');assert.equal(await rows.count(),4)
   for(const b of await rows.evaluateAll(items=>items.map(el=>({h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width}))))assert.ok(b.h<=100&&b.w<=viewport.width,`Upcoming list density regressed: ${JSON.stringify(b)}`)
   await page.screenshot({path:path.join(OUT,`composition-${viewport.width}-upcoming.png`)})
   await modes.filter({hasText:/^Tonight$/}).click();await page.getByText('Tonight in Atlanta',{exact:true}).waitFor();assert.equal(await rows.count(),4)
   await modes.filter({hasText:/^Sports$/}).click();await page.getByText('Home games only',{exact:true}).waitFor()
   await openUXTab(page,'Entertainment')
   assert.equal(await page.getByRole('searchbox',{name:'Search entertainment'}).count(),1)
   assert.equal(await page.locator('.gt-ux-directory:visible .gt-ux-card').count(),4)
   await assertVisibleTargets(page,'.gt-ux-directory:visible .gt-ux-chips button')
   await page.getByRole('searchbox',{name:'Search entertainment'}).fill('concerts')
   await page.waitForTimeout(500);await page.locator('.gt-ux-directory[aria-busy=false]:visible').waitFor()
   assert.equal(await page.locator('.gt-ux-directory:visible .gt-ux-card').count(),1)
   await openUXTab(page,'Venues')
   assert.equal(await page.getByRole('searchbox',{name:'Search venues'}).inputValue(),'')
   assert.ok((await page.locator('.gt-ux-directory:visible .gt-ux-chips').innerText()).includes('Rooftops'))
   assert.equal(await page.locator('.gt-ux-directory:visible .gt-ux-card').count(),4)
   await page.screenshot({path:path.join(OUT,`composition-${viewport.width}-venues.png`)})
   await openUXTab(page,'Entertainment');assert.equal(await page.getByRole('searchbox',{name:'Search entertainment'}).inputValue(),'concerts','Independent search state must survive tab switches')
   await page.locator('.gt5-bell').click();await page.locator('.gt5-radar').waitFor();await page.locator('.gt5-back').click()
   assert.equal(await page.locator('.gt5-app').getAttribute('data-screen'),'entertainment','Radar must return to the originating destination')
   const geometry=await page.evaluate(()=>{const n=document.querySelector('.gt5-nav').getBoundingClientRect(),b=document.querySelector('.gt5-bell').getBoundingClientRect();return{overflow:document.scrollingElement.scrollWidth-innerWidth,navBottom:n.bottom,navRight:n.right,bellWidth:b.width,bellHeight:b.height,width:innerWidth,height:innerHeight}})
   assert.ok(geometry.overflow<=1&&geometry.navBottom<=geometry.height+2&&geometry.navRight<=geometry.width+2);assert.ok(geometry.bellWidth>=44&&geometry.bellHeight>=44);assert.deepEqual(errors,[])
   fs.writeFileSync(path.join(OUT,`composition-${viewport.width}.json`),JSON.stringify({evidenceType:'isolated-render-fixture',viewport,geometry,controls,errors},null,2))
  }catch(error){await page.screenshot({path:path.join(OUT,`composition-${viewport.width}-failure.png`)}).catch(()=>{});throw error}
  finally{await ctx.close();await browser.close()}
 })
}
