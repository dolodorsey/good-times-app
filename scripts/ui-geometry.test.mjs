/**
 * GOOD TIMES — rendered V3 geometry + product-surface contract.
 *
 * The browser is the source of truth. This suite exercises the current V3
 * consumer shell, not retired V2/legacy selectors, and supplies deterministic
 * fixtures so guest/member geometry is testable without private QA secrets.
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
const TODAY=(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()
const PHOTO='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/LOCATION_IMAGES/REVEL.webp'
const SESSION={access_token:'gt-v3-ui-access',refresh_token:'gt-v3-ui-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'gt-v3-ui-user',email:'ui.fixture@goodtimes.invalid'}}
const EVENTS=[
  {event_key:'fixture:vision',title:'Vision Sundays — Rooftop After Dark',event_date:TODAY,event_time:'22:00',venue_name:'Vision Lounge',category_key:'nightlife',subcategory_key:'nightclubs',image_url:PHOTO,ticket_url:'https://example.test/vision',is_curated:true,is_featured:true,recommendation_score:96},
  {event_key:'fixture:circa',title:'R&B Rooftop Day Party',event_date:TODAY,event_time:'15:00',venue_name:'Cafe Circa',category_key:'day_parties_brunch',subcategory_key:'day_parties',image_url:PHOTO,ticket_url:'https://example.test/circa',is_curated:true,recommendation_score:89},
]
const VENUES=[
  {id:'fixture-venue-1',name:'Utopia Restaurant and Lounge',city_key:'atlanta',neighborhood:'Downtown',category_key:'nightlife',subcategory:'Lounges',short_desc:'Late-night lounge and Sunday party destination.',hero_image:PHOTO,google_rating:4.7,quality_score:96,price_range:'$$',latitude:33.7537,longitude:-84.3901,is_black_owned:true,is_culture_pick:true,vibe_tags:['nightlife','grown'],culture_tags:['culture-anchor']},
  {id:'fixture-venue-2',name:'Vision Lounge',city_key:'atlanta',neighborhood:'Buckhead',category_key:'nightlife',subcategory:'Nightclubs',short_desc:'Rooftop nightlife and late-night energy.',hero_image:PHOTO,google_rating:4.6,quality_score:94,price_range:'$$$',latitude:33.8462,longitude:-84.3712,is_culture_pick:true,vibe_tags:['nightlife','rooftop'],culture_tags:['tastemaker-fav']},
]
const CATEGORIES=[
  {category_key:'nightlife',category_name:'Nightlife',description:'Clubs, lounges and late-night moves.',sort_order:1},
  {category_key:'day_parties_brunch',category_name:'Brunch & Day Parties',description:'Daytime energy and brunch parties.',sort_order:2},
]
const SUBCATEGORIES=[
  {category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'nightlife',subcategory_key:'lounges',subcategory_name:'Lounges',sort_order:2,minimum_upcoming_inventory:0},
  {category_key:'day_parties_brunch',subcategory_key:'day_parties',subcategory_name:'Day Parties',sort_order:1,minimum_upcoming_inventory:0},
]
const DIRECTORY=VENUES.map((venue,index)=>({...venue,category_name:index?'Nightlife':'Nightlife',subcategory_key:index?'nightclubs':'lounges',taxonomy_confidence:.99}))
const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

async function installFixtureRoutes(ctx){
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:EVENTS.length,venues:VENUES.length},events:EVENTS,venues:VENUES})))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(DIRECTORY)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_counts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_asset_manifest**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([{id:'gt-v3-ui-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['grown','nightlife'],tab_interests:['nightlife']}])) )
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_follows**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_preferences**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_radar_alerts**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_ad_inventory**',route=>route.fulfill(json([])))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Fixture concierge ready.',events:EVENTS,venues:VENUES,thread_id:'fixture-thread'})))
}

async function launch(){
  return process.env.GT_UI_CHROME_PATH
    ?chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

async function open(vp,signedIn){
  const browser=await launch()
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile})
  await installFixtureRoutes(ctx)
  if(signedIn)await ctx.addInitScript(s=>{
    localStorage.setItem('gt_session',JSON.stringify(s))
    localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['grown','nightlife'],age:'25-34'}))
    sessionStorage.setItem('gt_premium_launch','1')
    sessionStorage.setItem('gt_splash_shown','1')
  },SESSION)
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error?.message||error)))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gt4-app',{timeout:30000})
  await page.waitForTimeout(1200)
  return{browser,ctx,page,errors}
}

const geometry=page=>page.evaluate(()=>{
  const vw=innerWidth,vh=innerHeight
  const box=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
  const visible=selector=>[...document.querySelectorAll(selector)].some(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>0&&r.height>0})
  const fixedOutside=[]
  for(const el of document.querySelectorAll('body *')){
    const cs=getComputedStyle(el);if(cs.position!=='fixed'||cs.visibility==='hidden'||cs.display==='none'||Number(cs.opacity)===0)continue
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue
    if(r.right>vw+2||r.left< -2||r.bottom>vh+2||r.top< -2)fixedOutside.push(`${el.className||el.tagName} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const doc=document.scrollingElement||document.documentElement
  const app=document.querySelector('.gt4-app')
  return{
    vw,vh,hOverflow:doc.scrollWidth-vw,
    app:box('.gt4-app'),topbar:box('.gt4-topbar'),hero:box('.gt4-hero'),nav:box('.gt4-nav'),main:box('.gt4-main'),
    appOverflow:app?Math.max(0,app.scrollHeight-app.clientHeight):0,
    navLabels:[...document.querySelectorAll('.gt4-nav button')].map(button=>String(button.textContent||'').trim()),
    legacyVisible:['.gt2-app','.gtlive-app','.gt-five-nav','.gt-connect-fab','button[aria-label="Tickets and paid experiences"]','button[aria-label="Open GOOD TIMES account"]'].filter(visible),
    fixedOutside,
  }
})

function assertCore(g){
  assert.ok(g.app&&g.app.w>=300&&g.app.h>=300,`V3 app frame collapsed: ${JSON.stringify(g.app)}`)
  assert.ok(g.topbar&&g.topbar.top>=-2&&g.topbar.bottom<=g.vh+2,`topbar escaped viewport: ${JSON.stringify(g.topbar)}`)
  assert.ok(g.nav&&g.nav.top>=-2&&g.nav.bottom<=g.vh+2,`V3 navigation escaped viewport: ${JSON.stringify(g.nav)}`)
  assert.ok(g.main&&g.main.w>0&&g.main.h>0,`V3 main surface collapsed: ${JSON.stringify(g.main)}`)
  assert.ok(g.hero&&g.hero.h>120,`V3 hero collapsed: ${JSON.stringify(g.hero)}`)
  assert.ok(g.hOverflow<=1,`horizontal overflow of ${g.hOverflow}px`)
  assert.ok(g.appOverflow<=4,`.gt4-app clips ${g.appOverflow}px of its own content`)
  assert.deepEqual(g.navLabels,['⌂Now','◇Discover','✦Concierge','◉Radar','▣Vault'],'V3 navigation contract changed unexpectedly')
  assert.deepEqual(g.legacyVisible,[],'retired GOOD TIMES shell controls are visible alongside V3')
  assert.deepEqual(g.fixedOutside,[],'fixed controls outside the viewport')
}

for(const vp of VIEWPORTS){
  test(`[${vp.name}] guest V3 shell stays inside the viewport`,{skip,timeout:90000},async()=>{
    fs.mkdirSync(OUT,{recursive:true})
    const{browser,ctx,page,errors}=await open(vp,false)
    try{
      const g=await geometry(page);assertCore(g)
      await page.screenshot({path:path.join(OUT,`${vp.name}__guest-v3.png`),fullPage:false})
      await page.locator('.gt4-city').click()
      await page.locator('.gt4-profile').waitFor({state:'visible',timeout:5000})
      const profile=await page.locator('.gt4-profile').boundingBox()
      assert.ok(profile&&profile.x>=-2&&profile.y>=-2&&profile.x+profile.width<=vp.width+2&&profile.y+profile.height<=vp.height+2,`guest profile escaped viewport: ${JSON.stringify(profile)}`)
      await page.locator('.gt4-profile-auth').waitFor({state:'visible',timeout:5000})
      assert.deepEqual(errors,[],'uncaught guest page errors')
    }finally{await ctx.close();await browser.close()}
  })

  test(`[${vp.name}] member V3 shell stays stable with deterministic data`,{skip,timeout:90000},async()=>{
    fs.mkdirSync(OUT,{recursive:true})
    const{browser,ctx,page,errors}=await open(vp,true)
    try{
      const g=await geometry(page);assertCore(g)
      await page.screenshot({path:path.join(OUT,`${vp.name}__member-v3.png`),fullPage:false})
      assert.match(await page.locator('body').innerText(),/Know what’s worth it/i)
      assert.deepEqual(errors,[],'uncaught member page errors')
    }finally{await ctx.close();await browser.close()}
  })
}
