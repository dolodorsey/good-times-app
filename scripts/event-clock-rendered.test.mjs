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
 test(`${vp.name}: Tonight and This Weekend render the correct fixture set`,{skip,timeout:45000},async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},timezoneId:'Pacific/Honolulu'})
  try{
   await context.addInitScript(epoch=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[epoch]))}static now(){return epoch}};window.Date=FixedDate;sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},FIXED)
   // All customer/API traffic is isolated to deterministic fixtures. No real sign-in,
   // payment, profile writes, outbound messages, or event publishing is performed.
   await context.route('**/api/**',route=>route.fulfill(json(route.request().url().includes('/api/data')?{ok:true,connected:true,degraded:false,city:'atlanta',events:EVENTS,venues:[],counts:{events:EVENTS.length,venues:0}}:{ok:true,customer_ready:true,content_ready:true})))
   await context.route('**/rest/v1/**',route=>route.fulfill(json([])))
   await context.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,events:[],venues:[]})))
   const page=await context.newPage(),errors=[]
   page.on('pageerror',e=>errors.push(String(e)))
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000})
   await page.locator('.gt5-app').waitFor({state:'visible',timeout:15000})
   await page.waitForTimeout(600)
   const nav=page.locator('.gt5-nav button')
   assert.deepEqual((await nav.allTextContents()).map(s=>s.replace(/^[^A-Za-z]+/,'').trim()),['Home','Discover','Plan','Saved','Profile'])
   const morning=page.locator('.gt5-event').filter({hasText:'Morning fixture'}).first()
   assert.equal((await morning.locator('.gt5-status').textContent()).trim(),'TODAY')
   fs.mkdirSync(OUT,{recursive:true})
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-home.png`)})
   await nav.filter({hasText:'Discover'}).click()
   await page.locator('.gt5-secondary-intents button').filter({hasText:/^Tonight$/}).click()
   assert.deepEqual(await page.locator('.gt5-event h3').allTextContents(),['Evening fixture'])
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-tonight.png`)})
   await page.locator('.gt5-secondary-intents button').filter({hasText:/^This Weekend$/}).click()
   assert.deepEqual(await page.locator('.gt5-event h3').allTextContents(),['Friday fixture'])
   await page.screenshot({path:path.join(OUT,`time-fixture-${vp.name}-weekend.png`)})
   assert.deepEqual(errors,[])
  }finally{await context.close();await browser.close()}
 })
}
