import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run creative browser proof':false

const SESSION={access_token:'creative-fixture-access',refresh_token:'creative-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'creative-fixture-user',email:'creative.fixture@goodtimes.invalid'}}
const TODAY=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const EVENTS=[{event_key:'creative:event',title:'Tonight at Revel',event_date:TODAY,event_time:'22:00',venue_name:'Revel Atlanta',category_key:'wellness_fitness',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true}]
const VENUES=[{id:'creative:revel',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[
  {category_key:'dining_culinary',category_name:'Dining & Culinary',description:'Restaurants and dining',sort_order:1},
  {category_key:'attractions_experiences',category_name:'Attractions & Experiences',description:'Attractions and destination places',sort_order:2},
  {category_key:'wellness_fitness',category_name:'Wellness & Fitness',description:'Wellness and fitness places',sort_order:3},
]
const SUBCATEGORIES=[
  {category_key:'dining_culinary',subcategory_key:'restaurant_places',subcategory_name:'Restaurants',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'attractions_experiences',subcategory_key:'unique_attractions',subcategory_name:'Unique Attractions',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'wellness_fitness',subcategory_key:'wellness_events',subcategory_name:'Wellness',sort_order:1,minimum_upcoming_inventory:0},
]
const DIRECTORY=[
  {...VENUES[0],category_key:'dining_culinary',category_name:'Dining & Culinary',subcategory_key:'restaurant_places',taxonomy_confidence:.99},
  {...VENUES[0],id:'creative:attraction',name:'Creative Attraction',category_key:'attractions_experiences',category_name:'Attractions & Experiences',subcategory_key:'unique_attractions',taxonomy_confidence:.99},
  {...VENUES[0],id:'creative:wellness',name:'Wellness Place',category_key:'wellness_fitness',category_name:'Wellness & Fitness',subcategory_key:'wellness_events',taxonomy_confidence:.99},
]
const MANIFEST=[
  {asset_key:'gt-motion-current',asset_type:'background_loop',surface:'global_motion',city_key:null,category_key:null,venue_slug:null,storage_bucket:'brand-graphics',storage_path:'kollective/animations/GOODTIMES.mp4',priority:1,metadata:{}},
  {asset_key:'gt-home-current',asset_type:'hero_image',surface:'home_hero',city_key:null,category_key:null,venue_slug:null,storage_bucket:'brand-graphics',storage_path:'motion/goodtimes.jpg',priority:1,metadata:{}},
  {asset_key:'gt-explore-nightlife',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'nightlife',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'gt-cat-culture.webp',priority:10,metadata:{}},
  {asset_key:'gt-explore-day-party',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'attractions_experiences',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'gt-cat-adventure.webp',priority:10,metadata:{}},
  {asset_key:'gt-explore-dining',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'dining_culinary',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'gt-cat-dining.webp',priority:10,metadata:{}},
]
const COUNTS=[
  {category_key:'dining_culinary',subcategory_key:null,place_count:40},
  {category_key:'attractions_experiences',subcategory_key:null,place_count:18},
  {category_key:'wellness_fitness',subcategory_key:null,place_count:62},
]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

async function installRoutes(ctx){
  await ctx.route('**/api/health',r=>r.fulfill(json({ok:true,service:'good-times',customer_ready:true,content_ready:true})))
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:EVENTS.length,venues:VENUES.length},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_asset_manifest**',route=>route.fulfill(json(MANIFEST)))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json(COUNTS)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(DIRECTORY)))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([{id:'creative-profile',auth_id:SESSION.user.id,full_name:'Creative QA',home_city:'atlanta',last_city:'atlanta'}])))
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Creative fixture ready.',events:EVENTS,venues:VENUES,thread_id:'creative-thread'})))
}

async function prove(width,height,name){
  fs.mkdirSync(OUT,{recursive:true})
  const browser=process.env.GT_UI_CHROME_PATH?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']}):await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600})
  await ctx.addInitScript(s=>{localStorage.setItem('gt_session',JSON.stringify(s));localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife','grown']}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},SESSION)
  await installRoutes(ctx)
  const page=await ctx.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(String(error)))
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
    await page.waitForSelector('.gt5-app',{state:'visible',timeout:30000})
    await page.locator('.gt5-nav button').filter({hasText:'Discover'}).click()
    await page.waitForSelector('.gtc-places',{state:'visible',timeout:10000})
    await page.waitForSelector('.gt-compact-category-grid>button',{timeout:15000})
    const lanes=await page.evaluate(()=>[...document.querySelectorAll('.gt-compact-category-grid>button')].map(card=>({label:String(card.querySelector('strong')?.textContent||'').trim(),background:getComputedStyle(card).backgroundImage})))
    await page.screenshot({path:path.join(OUT,`${name}__signed-in-v4-places-creative.png`),fullPage:true})
    assert.deepEqual(lanes.map(x=>x.label),CATEGORIES.map(c=>c.category_name))
    assert.ok(lanes.every(row=>row.background&&row.background!=='none'),'every Places entry lane must remain image-backed')
    assert.ok(lanes.some(row=>row.background.includes('good-times-backgrounds')||row.background.includes('brand-graphics')||row.background.includes('/venues/')),'Places lanes must use approved GOOD TIMES or reviewed venue media')
    assert.deepEqual(errors,[],'uncaught page errors')
  }finally{await ctx.close();await browser.close()}
}

test('desktop V4 Places keeps dense distinct approved taxonomy artwork',{skip},async()=>prove(1440,900,'1440x900'))
test('mobile V4 Places keeps dense distinct approved taxonomy artwork',{skip},async()=>prove(390,844,'390x844'))
