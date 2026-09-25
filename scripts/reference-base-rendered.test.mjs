import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const BASE=process.env.GT_UI_BASE
const OUT=path.join(process.env.GT_UI_ARTIFACTS||'ui-artifacts','reference-base')
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires the rendered UI environment':false
const epoch=Date.parse('2026-09-24T16:00:00Z')
const session={access_token:'reference-isolated-test-token',user:{id:'reference-isolated-user'},expires_at:4102444800}
const profile={id:'reference-profile',auth_id:session.user.id,full_name:'Reference QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:[]}
const categories=['nightlife','concerts_live_music','sports_watch','festivals_major_activations']
const events=categories.map((category_key,i)=>({event_key:`reference-event-${i}`,title:['Evening Live Experience','A Night of Live Music','Atlanta Game Night','Weekend Culture Festival'][i],category_key,city_key:'atlanta',event_date:'2026-09-24',event_time:'21:00',venue_name:'Reference test venue',quality_score:90-i,is_verified:true,image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/reference-only'}))
const venues=['restaurant','nightclub','hotel'].map((category_key,i)=>({id:`reference-venue-${i}`,name:['Reference Dining Room','Reference Music Lounge','Reference City Stay'][i],category_key,city_key:'atlanta',neighborhood:'Midtown',short_desc:'Isolated layout-test record. Not a real venue recommendation.',hero_image:'/venues/revel.webp',quality_score:90-i,price_range:'$$',address:'Reference address — not a booking',booking_link:'https://example.invalid/reference-only'}))
const plan={id:'reference-plan',user_id:session.user.id,name:'Atlanta Night Out',status:'draft',itinerary_date:'2026-09-24',city_id:'atlanta',stops:venues.map((v,i)=>({id:v.id,name:v.name,time:['19:30','21:00','23:00'][i],role:['Dinner','Drinks','Stay'][i],address:v.address,image_url:v.hero_image,status:'SELECTED'}))}
const saved=[{id:'reference-save-venue',user_id:profile.id,item_type:'venue',item_id:venues[0].id,saved_at:'2026-09-24T12:00:00Z'},{id:'reference-save-event',user_id:profile.id,item_type:'event',item_id:events[0].event_key,saved_at:'2026-09-24T12:00:00Z'}]
const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)})
for(const viewport of [{width:390,height:844},{width:834,height:1194},{width:1440,height:900}]){
 test(`reference-base nine screens ${viewport.width}`,{skip,timeout:120000},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(BASE).hostname),'Isolated fixture proof must never write to a production origin')
  const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH||undefined,headless:true,args:['--no-sandbox']})
  const context=await browser.newContext({viewport,timezoneId:'America/New_York',reducedMotion:'reduce'})
  const page=await context.newPage(),errors=[],proof=[]
  const dir=path.join(OUT,String(viewport.width));fs.mkdirSync(dir,{recursive:true})
  page.on('pageerror',e=>errors.push(e.message))
  async function capture(name,scroller='.gt5-main'){
   const scroll=page.locator(scroller).last()
   if(await scroll.count())await scroll.evaluate(e=>{e.scrollTop=0})
   await page.waitForTimeout(150)
   const report=await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth-innerWidth,screen:document.querySelector('.gt5-app')?.dataset.screen}))
   assert.ok(report.horizontalOverflow<=1,`${name} page overflow ${report.horizontalOverflow}`)
   for(const position of ['top','bottom']){
    if(position==='bottom'&&await scroll.count())await scroll.evaluate(e=>{e.scrollTop=e.scrollHeight})
    await page.waitForTimeout(100)
    const filename=`${name}-${position}.png`,buffer=await page.screenshot({animations:'disabled'})
    fs.writeFileSync(path.join(dir,filename),buffer)
    proof.push({screen:name,position,filename,sha256:createHash('sha256').update(buffer).digest('hex'),...report})
   }
   if(await scroll.count())await scroll.evaluate(e=>{e.scrollTop=0})
  }
  async function tab(label,selector){await page.locator('.gt5-nav button').filter({hasText:new RegExp(`^${label}$`)}).click();await page.locator(`${selector}:visible`).waitFor()}
  try{
   await context.addInitScript(({session,epoch})=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1');localStorage.setItem('gt:pwa-dismissed',String(epoch))},{session,epoch})
   await context.route('**/auth/v1/**',route=>route.fulfill(json({external:{google:true}})))
   await context.route('**/api/**',route=>{const u=new URL(route.request().url()),p=u.pathname
    if(p==='/api/health')return route.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true}))
    if(p.startsWith('/api/data'))return route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',events,venues}))
    if(p==='/api/discovery-search'){const scope=u.searchParams.get('scope');const items=scope==='venues'?venues:events;return route.fulfill(json({ok:true,city:'atlanta',scope,items,has_more:false,next_page:null}))}
    if(p==='/api/home-sports')return route.fulfill(json({ok:true,city:'atlanta',games:[],coverage:'Isolated sports fixture',generated_at:new Date(epoch).toISOString()}))
    return route.fulfill(json({ok:true}))
   })
   await context.route('**/rest/v1/**',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill(json(p.endsWith('/gt_user_profiles')?[profile]:p.endsWith('/gt_saved_items')?saved:p.endsWith('/itineraries')?[plan]:[]))})
   await context.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,events:[],venues:[]})))
   await page.goto(BASE,{waitUntil:'domcontentloaded'});await page.locator('.gt-ux-home .gt-ux-card').first().waitFor({timeout:15000})
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))]))
   const visual=await page.evaluate(()=>{const css=s=>getComputedStyle(document.querySelector(s));return{heroFont:css('.gt-ux-homehead h1').fontFamily,brandFont:css('.gt5-brand strong').fontFamily,canvas:css('.gt5-main').backgroundColor,markDisplay:css('.gt5-brand .gt5-mark').display,accentColor:css('.gt5-nav button.active small').color,heroImage:css('.gt-ux-homehead').backgroundImage}})
   console.log('REFERENCE VISUAL',JSON.stringify(visual))
   assert.match(visual.heroFont,/Playfair|Georgia|Garamond/,'Hero editorial font regressed')
   assert.match(visual.brandFont,/Playfair|Georgia|Garamond/,'Wordmark editorial font regressed')
   assert.equal(visual.canvas,'rgb(5, 6, 7)','Canvas palette drift')
   assert.notEqual(visual.markDisplay,'none','Brand mark hidden')
   assert.equal(visual.accentColor,'rgb(248, 212, 106)','Gold navigation accent drift')
   assert.ok(visual.heroImage.includes('/reference-base/atlanta-rooftop.webp'),'Owner-reference context lost')
   const controls=await page.locator('.gt-ux-home-modes button').evaluateAll(items=>items.map(el=>{const b=el.getBoundingClientRect();return{width:b.width,height:b.height}}))
   for(const c of controls)assert.ok(c.width>=43.9&&c.height>=44,`Undersized Home mode control: ${JSON.stringify(c)}`)
   assert.deepEqual(await page.locator('.gt5-nav button small').allTextContents(),['Home','Entertainment','Plan','Venues','Profile'])
   await capture('01-home')
   await page.locator('.gt-ux-home-modes button').filter({hasText:'Tonight'}).click();await page.getByText('Tonight in Atlanta',{exact:true}).waitFor();await capture('02-tonight')
   await tab('Entertainment','.gt-ux-directory');await page.locator('.gt-ux-directory[aria-busy="false"]:visible').waitFor();assert.ok(await page.locator('.gt-ux-directory:visible .gt-ux-card').count()>=events.length);await capture('03-entertainment')
   await tab('Venues','.gt-ux-directory');await page.locator('.gt-ux-directory[aria-busy="false"]:visible').waitFor();assert.ok(await page.locator('.gt-ux-directory:visible .gt-ux-card').count()>=venues.length);await capture('04-venues')
   await tab('Plan','.gt-ux-planner');assert.equal(await page.locator('.gt-ux-plan-tabs button').count(),3);await capture('05-plan')
   await tab('Profile','.gt5-profile');await page.locator('.gt-ux-library').waitFor();await capture('06-profile')
   await page.locator('.gt5-profile .gt-ux-chips button').filter({hasText:/^Drafts/}).click();await page.locator('.gt-ux-my-plans button').first().waitFor();await page.locator('.gt-ux-my-plans button').first().click();await page.locator('.gt5-itinerary').waitFor();assert.equal(await page.locator('.gt5-timeline section').count(),3)
   assert.equal(await page.locator('.gt5-plan-status').filter({hasText:'CONFIRMED'}).count(),0,'Unconfirmed plan must not acquire confirmation')
   await capture('07-itinerary','.gt5-overlay');await page.locator('.gt5-detail-back').click()
   await page.locator('.gt-ux-library-tabs button').filter({hasText:/^Saved/}).click();await page.locator('.gt5-profile').getByRole('heading',{name:venues[0].name,exact:true}).click();await page.locator('.gt5-detail').waitFor();await capture('08-venue-detail','.gt5-overlay');await page.locator('.gt5-detail-back').click()
   await page.locator('.gt5-bell').click();await page.locator('.gt5-radar').waitFor();await capture('09-radar')
   await page.locator('.gt5-back').click();assert.equal(await page.locator('.gt5-app').getAttribute('data-screen'),'profile','Radar origin lost')
   assert.deepEqual(errors,[])
   fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify({evidenceType:'isolated-render-fixture',notProofOfProductionAuthentication:true,commit:process.env.GITHUB_SHA||null,viewport,visual,controls,errors,screenshots:proof},null,2))
  }catch(error){await page.screenshot({path:path.join(dir,'failure.png')}).catch(()=>{});throw error}
  finally{await context.close();await browser.close()}
 })
}
