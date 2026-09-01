/**
 * GOOD TIMES — rendered V3 geometry + product-surface contract.
 *
 * The browser is the source of truth. Signed-in coverage runs deterministically
 * without requiring a private QA account; the fixture only replaces network
 * reads and never weakens the rendered viewport assertions.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run rendered UI checks':false

const VIEWPORTS=[
  {name:'1440x900',width:1440,height:900,mobile:false},
  {name:'1280x800',width:1280,height:800,mobile:false},
  {name:'1024x768',width:1024,height:768,mobile:false},
  {name:'430x932',width:430,height:932,mobile:true},
  {name:'390x844',width:390,height:844,mobile:true},
]
const today=(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const SESSION={access_token:'gt-ui-fixture-access',refresh_token:'gt-ui-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'gt-ui-fixture-user',email:'ui.fixture@goodtimes.invalid'}}
const EVENTS=[{event_key:'fixture:event',title:'GOOD TIMES Fixture Night',event_date:today,event_time:'21:00',venue_name:'Revel Atlanta',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/tickets',is_curated:true,is_featured:true,recommendation_score:96}]
const VENUES=[{id:'fixture:venue',name:'Revel Atlanta',city_key:'atlanta',neighborhood:'Westside',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Current nightlife fixture.',hero_image:PHOTO,google_rating:4.7,quality_score:95,latitude:33.8035,longitude:-84.4274,is_culture_pick:true,is_black_owned:true,vibe_tags:['nightlife'],culture_tags:['culture-anchor']}]
const CATEGORIES=[{category_key:'nightlife',category_name:'Nightlife',description:'Clubs, lounges and late-night moves.',sort_order:1}]
const SUBCATEGORIES=[{category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0}]
const DIRECTORY=[{...VENUES[0],category_name:'Nightlife',subcategory_key:'nightclubs',taxonomy_confidence:.99}]
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

let browser
if(!skip){
  fs.mkdirSync(OUT,{recursive:true})
  browser=process.env.GT_UI_CHROME_PATH
    ?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

async function installFixtureRoutes(ctx){
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:EVENTS.length,venues:VENUES.length},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json([{category_key:'nightlife',subcategory_key:null,place_count:1}])))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(DIRECTORY)))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([{id:'gt-ui-fixture-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['nightlife']}])) )
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_follows**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_preferences**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_alerts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Fixture concierge ready.',events:EVENTS,venues:VENUES,thread_id:'fixture-thread'})))
}

async function open(vp,signedIn){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile})
  if(signedIn){
    await ctx.addInitScript(s=>{
      localStorage.setItem('gt_session',JSON.stringify(s))
      localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife','grown'],age:'25-34'}))
      sessionStorage.setItem('gt_premium_launch','1')
      sessionStorage.setItem('gt_splash_shown','1')
    },SESSION)
    await installFixtureRoutes(ctx)
  }
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error)))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gt4-app',{state:'visible',timeout:30000})
  await page.waitForTimeout(signedIn?1200:800)
  return{ctx,page,errors}
}

const geometry=page=>page.evaluate(()=>{
  const vw=innerWidth,vh=innerHeight
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
  const visible=selector=>{const el=document.querySelector(selector);if(!el)return false;const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<vh}
  const outside=[]
  for(const selector of ['.gt4-app','.gt4-topbar','.gt4-nav','.gt4-city']){
    const b=box(selector);if(b&&(b.x< -2||b.right>vw+2||b.y< -2||b.bottom>vh+2))outside.push(`${selector} ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)}`)
  }
  const fixedOutside=[]
  for(const el of document.querySelectorAll('body *')){
    const cs=getComputedStyle(el);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)continue
    const r=el.getBoundingClientRect();if(r.width===0||r.height===0)continue
    if(r.right>vw+2||r.left< -2||r.bottom>vh+2||r.top< -2)fixedOutside.push(`${el.className||el.tagName} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const app=document.querySelector('.gt4-app'),main=document.querySelector('.gt4-main'),doc=document.scrollingElement||document.documentElement
  const legacy=['.gt2-nav','.gt-five-nav','.gtlive-nav','.gt-mobile-utilities','.gt-connect-fab','.gt-account-fab','.gt-party-pulse','.gt-utility-fab','[aria-label="Open GOOD TIMES utilities"]'].filter(visible)
  const dialogsTooBig=[...document.querySelectorAll('.gt4-detail,.gt4-profile,[role="dialog"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>vw+4||r.height>vh+4}).map(el=>el.className)
  return{
    vw,vh,hOverflow:doc.scrollWidth-vw,outside,fixedOutside,legacy,dialogsTooBig,
    app:box('.gt4-app'),topbar:box('.gt4-topbar'),nav:box('.gt4-nav'),main:box('.gt4-main'),hero:box('.gt4-hero'),
    appOverflow:app?Math.max(0,app.scrollHeight-app.clientHeight):0,
    mainScrollable:main?main.scrollHeight>=main.clientHeight:false,
    labels:[...document.querySelectorAll('.gt4-nav button')].map(button=>String(button.textContent||'').trim()),
  }
})

async function assertShell(page,errors,context){
  const g=await geometry(page)
  assert.ok(g.hOverflow<=1,`${context}: horizontal overflow ${g.hOverflow}px`)
  assert.deepEqual(g.outside,[],`${context}: shell controls outside viewport`)
  assert.deepEqual(g.fixedOutside,[],`${context}: fixed controls outside viewport`)
  assert.deepEqual(g.legacy,[],`${context}: retired navigation/utilities are visible`)
  assert.deepEqual(g.dialogsTooBig,[],`${context}: dialog wider/taller than viewport`)
  assert.ok(g.app&&g.topbar&&g.nav&&g.main,`${context}: V3 shell is incomplete`)
  assert.ok(g.appOverflow<=4,`${context}: V3 app shell clips ${g.appOverflow}px instead of delegating scroll to main`)
  assert.deepEqual(g.labels.map(x=>x.replace(/^[^A-Za-z]+/,'')),['Now','Discover','Concierge','Radar','Vault'],`${context}: V3 navigation contract changed`)
  assert.deepEqual(errors,[],`${context}: uncaught page errors`)
  return g
}

for(const vp of VIEWPORTS){
  test(`[${vp.name}] signed-out V3 shell has no geometry faults`,{skip,timeout:60000},async()=>{
    const{ctx,page,errors}=await open(vp,false)
    try{
      const g=await assertShell(page,errors,`${vp.name} guest`)
      assert.ok(g.hero&&g.hero.h>120,`${vp.name}: Now hero collapsed`)
      await page.screenshot({path:path.join(OUT,`${vp.name}__signed-out-v3.png`),fullPage:false})
      await page.locator('.gt4-city').click()
      await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000})
      await assertShell(page,errors,`${vp.name} guest profile`)
      assert.match(await page.locator('.gt4-profile').innerText(),/Sign in or create account/i)
    }finally{await ctx.close()}
  })

  test(`[${vp.name}] signed-in V3 navigation and overlays stay contained`,{skip,timeout:60000},async()=>{
    const{ctx,page,errors}=await open(vp,true)
    try{
      await assertShell(page,errors,`${vp.name} member home`)
      await page.screenshot({path:path.join(OUT,`${vp.name}__signed-in-v3-now.png`),fullPage:false})

      const destinations=[['Discover','.gt4-discover'],['Concierge','.gt4-concierge'],['Radar','.gt4-radar-settings'],['Vault','.gt4-vault-tabs'],['Now','.gt4-hero']]
      for(const[label,selector]of destinations){
        await page.locator('.gt4-nav button').filter({hasText:label}).click()
        await page.locator(selector).waitFor({state:'visible',timeout:10000})
        await assertShell(page,errors,`${vp.name} ${label}`)
      }

      const card=page.locator('.gt4-event').first()
      if(await card.count()){
        await card.click();await page.locator('.gt4-detail').waitFor({state:'visible',timeout:5000})
        await assertShell(page,errors,`${vp.name} event detail`)
        await page.locator('.gt4-detail-back').click()
      }
      await page.locator('.gt4-city').click();await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000})
      await assertShell(page,errors,`${vp.name} profile`)
      assert.match(await page.locator('.gt4-profile').innerText(),/GOOD TIMES QA/i)
    }finally{await ctx.close()}
  })
}

test('teardown',{skip},async()=>{await browser.close()})
