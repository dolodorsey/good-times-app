/**
 * GOOD TIMES — deterministic signed-in creative proof.
 *
 * The geometry fixture can pass even when the live manifest is temporarily
 * unreachable. This gate supplies explicit approved manifest rows and proves
 * that Discover actually binds unique Supabase artwork into rendered taxonomy cards.
 */
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
const EVENTS=[{event_key:'creative:event',title:'Tonight at Revel',event_date:TODAY,event_time:'22:00',venue_name:'Revel Atlanta',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true}]
const VENUES=[{id:'creative:revel',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[
  {category_key:'nightlife',category_name:'Nightlife',description:'Clubs and lounges',sort_order:1},
  {category_key:'day_parties_brunch',category_name:'Brunch & Day Parties',description:'Daytime energy',sort_order:2},
  {category_key:'dining_culinary',category_name:'Dining & Culinary',description:'Food-led experiences',sort_order:3},
]
const SUBCATEGORIES=[
  {category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'day_parties_brunch',subcategory_key:'day_parties',subcategory_name:'Day Parties',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'dining_culinary',subcategory_key:'restaurants',subcategory_name:'Restaurants',sort_order:1,minimum_upcoming_inventory:0},
]
const DIRECTORY=[
  {...VENUES[0],category_key:'nightlife',category_name:'Nightlife',subcategory_key:'nightclubs',taxonomy_confidence:.99},
  {...VENUES[0],id:'creative:day',name:'Rooftop Day Party',category_key:'day_parties_brunch',category_name:'Brunch & Day Parties',subcategory_key:'day_parties',taxonomy_confidence:.99},
  {...VENUES[0],id:'creative:dining',name:'Dinner Move',category_key:'dining_culinary',category_name:'Dining & Culinary',subcategory_key:'restaurants',taxonomy_confidence:.99},
]
const MANIFEST=[
  {asset_key:'gt-motion-current',asset_type:'background_loop',surface:'global_motion',city_key:null,category_key:null,venue_slug:null,storage_bucket:'brand-graphics',storage_path:'kollective/animations/GOODTIMES.mp4',priority:1,metadata:{}},
  {asset_key:'gt-home-current',asset_type:'hero_image',surface:'home_hero',city_key:null,category_key:null,venue_slug:null,storage_bucket:'brand-graphics',storage_path:'motion/goodtimes.jpg',priority:1,metadata:{}},
  {asset_key:'gt-explore-nightlife',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'nightlife',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'gt-cat-nightlife.webp',priority:10,metadata:{}},
  {asset_key:'gt-explore-day-party',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'day_parties_brunch',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'event-rooftop-party.jpg',priority:10,metadata:{}},
  {asset_key:'gt-explore-dining',asset_type:'category_image',surface:'explore_category',city_key:null,category_key:'dining_culinary',venue_slug:null,storage_bucket:'good-times-backgrounds',storage_path:'gt-cat-dining.webp',priority:10,metadata:{}},
]
const COUNTS=[
  {category_key:'nightlife',subcategory_key:null,place_count:40},
  {category_key:'day_parties_brunch',subcategory_key:null,place_count:18},
  {category_key:'dining_culinary',subcategory_key:null,place_count:62},
]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

async function installRoutes(ctx){
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
  await ctx.route('**/rest/v1/gt_follows**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_preferences**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_alerts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_ad_inventory**',route=>route.fulfill(json([])))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Creative fixture ready.',events:EVENTS,venues:VENUES,thread_id:'creative-thread'})))
}

async function prove(width,height,name){
  fs.mkdirSync(OUT,{recursive:true})
  const browser=process.env.GT_UI_CHROME_PATH
    ? await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    : await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
  const ctx=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600})
  await ctx.addInitScript(s=>{
    localStorage.setItem('gt_session',JSON.stringify(s))
    localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife','grown']}))
    sessionStorage.setItem('gt_premium_launch','1')
    sessionStorage.setItem('gt_splash_shown','1')
  },SESSION)
  await installRoutes(ctx)
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error)))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gt4-app',{timeout:30000})
  await page.locator('.gt4-nav button').filter({hasText:'Discover'}).click()
  await page.waitForSelector('.gt2-category-grid>button',{timeout:15000})
  await page.waitForFunction(()=>[...document.querySelectorAll('.gt2-category-grid>button')].every(card=>card.dataset.hasArt==='true'&&getComputedStyle(card).backgroundImage.includes('good-times-backgrounds')),{timeout:15000})
  await page.waitForTimeout(1200)
  const proof=await page.evaluate(()=>[...document.querySelectorAll('.gt2-category-grid>button')].map(card=>({
    key:card.dataset.gtCategory,
    hasArt:card.dataset.hasArt,
    background:getComputedStyle(card).backgroundImage,
  })))
  await page.screenshot({path:path.join(OUT,`${name}__member-discover-creative.png`),fullPage:false})
  await ctx.close();await browser.close()
  assert.deepEqual(errors,[],'uncaught page errors')
  assert.equal(proof.length,3)
  assert.ok(proof.every(row=>row.hasArt==='true'))
  assert.equal(new Set(proof.map(row=>row.background)).size,3,'Discover categories must resolve distinct creative')
  assert.ok(proof.every(row=>row.background.includes('good-times-backgrounds')),'category creative must resolve from approved Supabase bucket')
}

test('desktop Discover renders distinct approved Supabase category artwork',{skip,timeout:90000},async()=>prove(1440,900,'1440x900'))
test('mobile Discover renders distinct approved Supabase category artwork',{skip,timeout:90000},async()=>prove(390,844,'390x844'))
