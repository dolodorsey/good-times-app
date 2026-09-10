import test from 'node:test'
import assert from 'node:assert/strict'

const BASE=process.env.GT_UI_BASE
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run interaction torture checks':false

const SESSION={access_token:'interaction-fixture-access',refresh_token:'interaction-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'interaction-fixture-user',email:'interaction.fixture@goodtimes.invalid'}}
const TODAY=(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const EVENTS=[{event_key:'interaction:event',title:'GOOD TIMES Interaction Night',event_date:TODAY,event_time:'22:00',venue_name:'Revel Atlanta',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true,recommendation_score:96}]
const VENUES=[{id:'interaction:venue',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,google_rating:4.7,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[{category_key:'nightlife',category_name:'Nightlife',description:'Clubs and lounges',sort_order:1}]
const SUBCATEGORIES=[{category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0}]
const DIRECTORY=[{...VENUES[0],category_name:'Nightlife',subcategory_key:'nightclubs',taxonomy_confidence:.99}]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

let browser
if(!skip){
  browser=process.env.GT_UI_CHROME_PATH
    ?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

async function routes(ctx){
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:1,venues:1},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json([{category_key:'nightlife',subcategory_key:null,place_count:1}])))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(DIRECTORY)))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>{
    if(route.request().method()==='PATCH')return route.fulfill({status:204,body:''})
    return route.fulfill(json([{id:'interaction-profile',auth_id:SESSION.user.id,full_name:'Interaction QA',home_city:'atlanta',last_city:'atlanta'}]))
  })
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_follows**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_preferences**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_alerts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Interaction fixture ready.',events:EVENTS,venues:VENUES,thread_id:'interaction-thread'})))
}

async function open(width,height,mobile=false){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile})
  await ctx.addInitScript(s=>{
    localStorage.setItem('gt_session',JSON.stringify(s))
    localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['grown','nightlife'],age:'25-34'}))
    sessionStorage.setItem('gt_premium_launch','1')
    sessionStorage.setItem('gt_splash_shown','1')
  },SESSION)
  await routes(ctx)
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error)))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gt4-app',{state:'visible',timeout:30000})
  await page.waitForTimeout(900)
  return{ctx,page,errors}
}

async function assertOnscreen(page,selector){
  const result=await page.locator(selector).first().evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight}})
  assert.ok(result.left>=-2&&result.right<=result.vw+2&&result.top>=-2&&result.bottom<=result.vh+2,`${selector} escaped viewport: ${JSON.stringify(result)}`)
}

for(const vp of [{name:'desktop',width:1440,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  test(`[${vp.name}] repeated V3 navigation, detail and profile interactions stay stable`,{skip,timeout:90000},async()=>{
    const{ctx,page,errors}=await open(vp.width,vp.height,vp.mobile)
    try{
      const nav=page.locator('.gt4-nav button')
      assert.equal(await nav.count(),5,'V3 navigation must contain five customer destinations')
      for(let round=0;round<3;round++)for(let i=0;i<5;i++){
        await nav.nth(i).click();await page.waitForTimeout(100);await assertOnscreen(page,'.gt4-nav')
      }

      await nav.filter({hasText:'Now'}).click()
      for(let i=0;i<5;i++){
        const card=page.locator('.gt4-event').first();await card.waitFor({state:'visible',timeout:5000});await card.click()
        await page.locator('.gt4-detail').waitFor({state:'visible',timeout:5000});await assertOnscreen(page,'.gt4-detail')
        await page.locator('.gt4-detail-back').click();await page.locator('.gt4-detail').waitFor({state:'hidden',timeout:5000})
      }

      for(let i=0;i<5;i++){
        await page.locator('.gt4-city').click();await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000});await assertOnscreen(page,'.gt4-profile')
        await page.locator('.gt4-profile .gt4-detail-back').click();await page.locator('.gt4-profile').waitFor({state:'hidden',timeout:5000})
      }

      await page.locator('.gt4-city').click();await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000})
      const city=page.locator('.gt4-profile select')
      await city.selectOption('houston');await page.waitForTimeout(250)
      await city.selectOption('atlanta');await page.waitForTimeout(250)
      await page.locator('.gt4-profile .gt4-detail-back').click()

      if(vp.mobile){
        await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);await assertOnscreen(page,'.gt4-nav');await assertOnscreen(page,'.gt4-topbar')
        await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250)
      }

      await assertOnscreen(page,'.gt4-topbar');await assertOnscreen(page,'.gt4-nav');await assertOnscreen(page,'.gt4-city')
      const legacy=await page.evaluate(()=>['.gt2-nav','.gt-five-nav','.gtlive-nav','.gt-connect-fab','.gt-account-fab','.gt-party-pulse','.gt-utility-fab'].filter(selector=>document.querySelector(selector)))
      assert.deepEqual(legacy,[],'retired navigation or floating utilities remounted during interaction torture')
      assert.deepEqual(errors,[],'page errors during repeated V3 interactions')
    }finally{await ctx.close()}
  })
}

test('interaction teardown',{skip},async()=>{await browser.close()})
