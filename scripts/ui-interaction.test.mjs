import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const BASE=process.env.GT_UI_BASE
const SESSION_FILE=process.env.GT_UI_SESSION
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run interaction torture checks':false
const FIXTURE_SESSION={access_token:'interaction-fixture-access',refresh_token:'interaction-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'interaction-fixture-user',email:'interaction.fixture@goodtimes.invalid'}}
const TODAY=(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const EVENTS=[{event_key:'interaction:event',title:'Tonight at Revel',event_date:TODAY,event_time:'22:00',venue_name:'Revel Atlanta',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true,recommendation_score:95}]
const VENUES=[{id:'interaction:venue',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[{category_key:'nightlife',category_name:'Nightlife',description:'Clubs and lounges',sort_order:1}]
const SUBCATEGORIES=[{category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0}]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

let browser=null
let session=FIXTURE_SESSION
if(!skip){
  if(SESSION_FILE&&fs.existsSync(SESSION_FILE)){
    session=JSON.parse(fs.readFileSync(SESSION_FILE,'utf8'))
    if(!session.expires_at)session.expires_at=Math.floor(Date.now()/1000)+3600
  }
  browser=process.env.GT_UI_CHROME_PATH
    ?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

async function installRoutes(ctx){
  const profile={id:'interaction-profile',auth_id:session.user?.id||FIXTURE_SESSION.user.id,full_name:'Interaction QA',home_city:'atlanta',last_city:'atlanta'}
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:1,venues:1},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_asset_manifest**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json([{category_key:'nightlife',subcategory_key:null,place_count:1}])))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(VENUES.map(v=>({...v,category_name:'Nightlife',subcategory_key:'nightclubs',taxonomy_confidence:.99})))))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([profile])))
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_follows**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_preferences**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_alerts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/v_gt_active_ads**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_ad_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Interaction fixture ready.',events:EVENTS,venues:VENUES,thread_id:'interaction-thread'})))
}

async function open(width,height,mobile=false){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile})
  await ctx.addInitScript(s=>{
    localStorage.setItem('gt_session',JSON.stringify(s))
    localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['grown'],age:'25-34'}))
    sessionStorage.setItem('gt_premium_launch','1')
    sessionStorage.setItem('gt_splash_shown','1')
  },session)
  await installRoutes(ctx)
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(`pageerror:${String(error?.message||error)}`))
  page.on('console',msg=>{if(msg.type()==='error')errors.push(`console:${msg.text()}`)})
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gt4-app',{timeout:30000})
  await page.waitForTimeout(1200)
  return{ctx,page,errors}
}

async function assertOnscreen(page,selector){
  const box=await page.locator(selector).first().boundingBox()
  const size=page.viewportSize()
  assert.ok(box&&box.x>=-2&&box.y>=-2&&box.x+box.width<=size.width+2&&box.y+box.height<=size.height+2,`${selector} escaped viewport: ${JSON.stringify({box,size})}`)
}

for(const vp of [{name:'desktop',width:1440,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  test(`[${vp.name}] V3 repeated navigation, detail sheets and profile stay stable`,{skip,timeout:120000},async()=>{
    const{ctx,page,errors}=await open(vp.width,vp.height,vp.mobile)
    try{
      const nav=page.locator('.gt4-nav button')
      assert.equal(await nav.count(),5,'V3 navigation must expose five primary destinations')
      for(let round=0;round<3;round++){
        for(const label of ['Discover','Concierge','Radar','Vault','Now']){
          await nav.filter({hasText:label}).click()
          await page.waitForTimeout(120)
          await assertOnscreen(page,'.gt4-nav')
        }
      }

      for(let i=0;i<3;i++){
        await page.locator('.gt4-city').click()
        await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000})
        await assertOnscreen(page,'.gt4-profile')
        await page.locator('.gt4-profile .gt4-detail-back').click()
        await page.locator('.gt4-profile').waitFor({state:'hidden',timeout:5000})
      }

      await nav.filter({hasText:'Now'}).click()
      const event=page.locator('.gt4-event').first()
      if(await event.count()){
        await event.click()
        await page.locator('.gt4-detail').waitFor({state:'visible',timeout:5000})
        await assertOnscreen(page,'.gt4-detail')
        await page.locator('.gt4-detail .gt4-detail-back').click()
        await page.locator('.gt4-detail').waitFor({state:'hidden',timeout:5000})
      }

      await nav.filter({hasText:'Discover'}).click()
      const category=page.locator('.gt2-category-grid>button').first()
      if(await category.count()){
        await category.click()
        await page.waitForSelector('.gt2-subcategory-grid',{timeout:5000})
        const back=page.locator('.gt4-backbar button')
        if(await back.count())await back.click()
      }

      if(vp.mobile){
        await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300)
        await assertOnscreen(page,'.gt4-nav')
        await page.locator('.gt4-city').click();await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000});await assertOnscreen(page,'.gt4-profile')
        await page.locator('.gt4-profile .gt4-detail-back').click()
        await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300)
      }

      await assertOnscreen(page,'.gt4-nav')
      assert.deepEqual(errors,[],'browser console/page errors during repeated V3 interactions')
    }finally{await ctx.close()}
  })
}

test('interaction teardown',{skip},async()=>{await browser?.close()})
