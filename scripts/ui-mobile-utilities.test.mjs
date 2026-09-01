import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run mobile utility proof':false
const SESSION={access_token:'utility-fixture-access',refresh_token:'utility-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'utility-fixture-user',email:'utility.fixture@goodtimes.invalid'}}
const TODAY=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const EVENTS=[{event_key:'utility:event',title:'Tonight at Revel',event_date:TODAY,event_time:'22:00',venue_name:'Revel Atlanta',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true}]
const VENUES=[{id:'utility:venue',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightclub',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[{category_key:'nightlife',category_name:'Nightlife',description:'Clubs',sort_order:1}]
const SUBCATEGORIES=[{category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0}]
const MANIFEST=[
  {asset_key:'gt-motion-current',asset_type:'background_loop',surface:'global_motion',storage_bucket:'brand-graphics',storage_path:'kollective/animations/GOODTIMES.mp4',priority:1,metadata:{}},
  {asset_key:'gt-home-current',asset_type:'hero_image',surface:'home_hero',storage_bucket:'brand-graphics',storage_path:'motion/goodtimes.jpg',priority:1,metadata:{}},
]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

async function routes(ctx){
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:1,venues:1},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_asset_manifest**',route=>route.fulfill(json(MANIFEST)))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json([{category_key:'nightlife',subcategory_key:null,place_count:1}])))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([{id:'utility-profile',auth_id:SESSION.user.id,full_name:'Utility QA',home_city:'atlanta',last_city:'atlanta'}])))
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Fixture ready.',events:EVENTS,venues:VENUES,thread_id:'utility-thread'})))
}

async function assertInViewport(page,selector){
  const box=await page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,vw:innerWidth,vh:innerHeight}})
  assert.ok(box.left>=-2&&box.right<=box.vw+2&&box.top>=-2&&box.bottom<=box.vh+2,`${selector} escaped viewport: ${JSON.stringify(box)}`)
}

test('mobile V3 consolidates utilities into the app shell and keeps Profile usable',{skip,timeout:60000},async()=>{
  fs.mkdirSync(OUT,{recursive:true})
  const browser=process.env.GT_UI_CHROME_PATH
    ? await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    : await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
  let ctx=null
  try{
    ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
    await ctx.addInitScript(s=>{
      localStorage.setItem('gt_session',JSON.stringify(s))
      localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife']}))
      sessionStorage.setItem('gt_premium_launch','1')
      sessionStorage.setItem('gt_splash_shown','1')
    },SESSION)
    await routes(ctx)
    const page=await ctx.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(String(error)))
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
    await page.waitForSelector('.gt4-app',{state:'visible',timeout:15000})

    const legacy=await page.evaluate(()=>[
      '.gt-mobile-utilities','.gt-connect-fab','.gt-account-fab','.gt-party-pulse','.gt-utility-fab',
      '[aria-label="Open GOOD TIMES utilities"]','[aria-label="Tickets and paid experiences"]','[aria-label="Open GOOD TIMES account"]'
    ].filter(selector=>document.querySelector(selector)))
    assert.deepEqual(legacy,[],'retired floating utility controls must not survive V3')

    await assertInViewport(page,'.gt4-topbar')
    await assertInViewport(page,'.gt4-nav')
    await page.screenshot({path:path.join(OUT,'390x844__v3-mobile-shell.png'),fullPage:false})

    await page.locator('.gt4-city').click()
    await page.locator('.gt4-profile').waitFor({state:'visible',timeout:4000})
    await assertInViewport(page,'.gt4-profile')
    assert.match(await page.locator('.gt4-profile').innerText(),/Utility QA|utility\.fixture@goodtimes\.invalid/i)
    assert.equal(await page.locator('.gt4-profile select').inputValue(),'atlanta')
    await page.locator('.gt4-profile .gt4-detail-back').click()
    await page.locator('.gt4-profile').waitFor({state:'hidden',timeout:4000})

    assert.deepEqual(errors,[],'uncaught page errors')
  }finally{
    await ctx?.close().catch(()=>{})
    await browser.close().catch(()=>{})
  }
})
