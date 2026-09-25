import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'requires the existing rendered-UI CI environment':false
const FIXED=Date.parse('2026-09-14T12:00:00Z')
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const rows=[['morning','Morning fixture','2026-09-14','09:00',99],['unknown','Unknown time fixture','2026-09-14',null,98],['evening','Evening fixture','2026-09-14','20:00',97],['tuesday','Tuesday fixture','2026-09-15','20:00',96],['friday','Friday fixture','2026-09-18','20:00',95],['nextmonday','Next Monday fixture','2026-09-21','20:00',94]]
const EVENTS=rows.map(([id,title,date,time,score])=>({event_key:`time-fixture:${id}`,title,event_date:date,event_time:time,city_key:'atlanta',venue_name:'Calendar Test Venue',category_key:'concerts_live_music',image_url:PHOTO,ticket_url:'https://example.invalid/never-send',quality_score:score,is_verified:true}))
const json=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)})
for(const vp of [{name:'phone',width:390,height:844},{name:'tablet',width:834,height:1194}]){
 test(`${vp.name}: Tonight and Upcoming render the correct fixture set`,{skip,timeout:45000},async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},timezoneId:'Pacific/Honolulu'})
  const page=await context.newPage(),errors=[],requests=[]
  fs.mkdirSync(OUT,{recursive:true})
  page.on('pageerror',e=>errors.push(String(e)))
  page.on('response',r=>{if(r.url().includes('/api/'))requests.push({url:r.url(),status:r.status()})})
  try{
   await context.addInitScript(epoch=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};window.Date=FixedDate;sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1');localStorage.setItem('gt_session',JSON.stringify({access_token:'ui-clock-token',refresh_token:'ui-clock-refresh',expires_at:Math.floor(epoch/1000)+3600,user:{id:'00000000-0000-4000-8000-000000000002',email:'clock-proof@goodtimes.invalid',user_metadata:{full_name:'GOOD TIMES Clock QA'}}}))},FIXED)
   // All customer/API traffic is isolated to deterministic fixtures. Health must
   // identify the correct service; do not bypass or change the production guard.
   await context.route('**/api/**',route=>{
    const pathname=new URL(route.request().url()).pathname
    if(pathname==='/api/health')return route.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true}))
    if(pathname.startsWith('/api/data'))return route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',events:EVENTS,venues:[],counts:{events:EVENTS.length,venues:0}}))
    return route.fulfill(json({ok:true}))
   })
   await context.route('**/rest/v1/**',route=>route.fulfill(json([])))
   await context.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,events:[],venues:[]})))
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000})
   await page.locator('.gt5-app').waitFor({state:'visible',timeout:15000})
   await page.waitForTimeout(600)
   const nav=page.locator('.gt5-nav button')
   assert.deepEqual((await nav.allTextContents()).map(s=>s.replace(/^[^A-Za-z]+/,'').trim()),['Home','Entertainment','Plan','Venues','Profile'])
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-home.png`)})
   const modes=page.locator('.gt-ux-home-modes button')
   await modes.filter({hasText:/^Tonight$/}).click()
   assert.deepEqual(await page.locator('.gt-ux-rows .gt-ux-card strong').allTextContents(),['Evening fixture'])
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-tonight.png`)})
   await modes.filter({hasText:/^Upcoming$/}).click()
   const upcomingTitles=await page.locator('.gt-ux-rows .gt-ux-card strong').allTextContents()
   assert.ok(upcomingTitles.includes('Friday fixture'))
   assert.ok(upcomingTitles.includes('Next Monday fixture'))
   assert.ok(!upcomingTitles.includes('Morning fixture'))
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-upcoming.png`)})
   assert.deepEqual(errors,[])
  }catch(error){
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-failure.png`)}).catch(()=>{})
   fs.writeFileSync(path.join(OUT,`time-fixture-${vp.name}-diagnostics.json`),JSON.stringify({errors,requests,body:await page.locator('body').innerText().catch(()=>''),failure:String(error)},null,2))
   throw error
  }finally{await context.close();await browser.close()}
 })
}