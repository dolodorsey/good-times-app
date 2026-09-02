/**
 * GOOD TIMES V3 — rendered UI geometry + product-surface contract.
 *
 * The browser is the source of truth. Signed-in coverage runs with a deterministic
 * member fixture when no private QA session is configured. This gate intentionally
 * targets the current gt4 shell; retired gt2/gtlive selectors must not come back.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.GT_UI_BASE
const OUT = process.env.GT_UI_ARTIFACTS || 'ui-artifacts'
const SESSION_FILE = process.env.GT_UI_SESSION

let chromium = null
try { ({ chromium } = await import('playwright-core')) } catch { /* optional */ }

const VIEWPORTS = [
  { name:'1440x900', width:1440, height:900, mobile:false },
  { name:'1280x800', width:1280, height:800, mobile:false },
  { name:'1024x768', width:1024, height:768, mobile:false },
  { name:'834x1194', width:834, height:1194, mobile:false },
  { name:'430x932', width:430, height:932, mobile:true },
  { name:'390x844', width:390, height:844, mobile:true },
]

const skip = !BASE || !chromium
  ? 'set GT_UI_BASE and install playwright-core to run rendered UI checks'
  : false

const isoOffset = days => {
  const date = new Date()
  date.setHours(12,0,0,0)
  date.setDate(date.getDate()+days)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

const CREATIVE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics/GOODTIMES_HOMESCREEN.png'
const FIXTURE_SESSION={
  access_token:'gt-ui-fixture-access',
  refresh_token:'gt-ui-fixture-refresh',
  expires_at:Math.floor(Date.now()/1000)+86400,
  user:{id:'gt-ui-fixture-user',email:'ui.fixture@goodtimes.invalid'},
}
const FIXTURE_EVENTS=[
  {event_key:'fixture:vision',title:'Vision Sundays — Rooftop After Dark',event_date:isoOffset(0),event_time:'22:00',venue_name:'Vision Lounge',category_key:'nightlife',subcategory_key:'lounges',image_url:CREATIVE,ticket_url:'https://example.test/vision',is_curated:true,is_featured:true,recommendation_score:96},
  {event_key:'fixture:josephine',title:'Josephine Sunday — Atlanta Nightlife',event_date:isoOffset(0),event_time:'21:00',venue_name:'Josephine Lounge',category_key:'nightlife',subcategory_key:'weekly_parties',image_url:CREATIVE,ticket_url:'https://example.test/josephine',is_curated:true,recommendation_score:93},
  {event_key:'fixture:utopia',title:'Sunday Service at Utopia',event_date:isoOffset(0),event_time:'17:00',venue_name:'Utopia Restaurant and Lounge',category_key:'nightlife',subcategory_key:'lounges',image_url:CREATIVE,ticket_url:'https://example.test/utopia',is_curated:true,recommendation_score:91},
  {event_key:'fixture:circa',title:'R&B Rooftop Day Party',event_date:isoOffset(0),event_time:'15:00',venue_name:'Cafe Circa',category_key:'day_parties_brunch',subcategory_key:'day_parties',image_url:CREATIVE,ticket_url:'https://example.test/circa',is_curated:true,recommendation_score:89},
  {event_key:'fixture:friday',title:'Friday Night Live',event_date:isoOffset(4),event_time:'22:30',venue_name:'The Loft',category_key:'nightlife',subcategory_key:'nightclubs',image_url:CREATIVE,ticket_url:'https://example.test/friday',is_curated:true,recommendation_score:87},
]
const FIXTURE_VENUES=[
  {id:'fixture-venue-1',name:'Utopia Restaurant and Lounge',city_key:'atlanta',neighborhood:'Downtown',category_key:'lounge',subcategory:'Lounges',short_desc:'Late-night lounge and Sunday party destination.',hero_image:CREATIVE,google_rating:4.7,quality_score:96,price_range:'$$',latitude:33.7537,longitude:-84.3901,is_black_owned:true,is_khg:false,is_culture_pick:true,vibe_tags:['nightlife','grown'],culture_tags:['culture-anchor']},
  {id:'fixture-venue-2',name:'Vision Lounge',city_key:'atlanta',neighborhood:'Buckhead',category_key:'nightclub',subcategory:'Nightclubs',short_desc:'Rooftop nightlife and late-night energy.',hero_image:CREATIVE,google_rating:4.6,quality_score:94,price_range:'$$$',latitude:33.8462,longitude:-84.3712,is_black_owned:false,is_khg:false,is_culture_pick:true,vibe_tags:['nightlife','rooftop'],culture_tags:['tastemaker-fav']},
  {id:'fixture-venue-3',name:'Cafe Circa',city_key:'atlanta',neighborhood:'Old Fourth Ward',category_key:'rooftop',subcategory:'Rooftops',short_desc:'Day parties, brunch and rooftop energy.',hero_image:CREATIVE,google_rating:4.5,quality_score:91,price_range:'$$',latitude:33.7581,longitude:-84.3710,is_black_owned:true,is_khg:false,is_culture_pick:true,vibe_tags:['day party','rooftop'],culture_tags:['black-owned']},
]
const FIXTURE_TAXONOMY_CATEGORIES=[
  {category_key:'nightlife',category_name:'Nightlife',description:'Clubs, lounges and late-night moves.',sort_order:1},
  {category_key:'day_parties_brunch',category_name:'Brunch & Day Parties',description:'Daytime energy and brunch parties.',sort_order:2},
  {category_key:'dining_culinary',category_name:'Dining & Culinary',description:'Dinner and food-led experiences.',sort_order:3},
]
const FIXTURE_TAXONOMY_SUBCATEGORIES=[
  {category_key:'nightlife',subcategory_key:'nightclubs',subcategory_name:'Nightclubs',sort_order:1,minimum_upcoming_inventory:0},
  {category_key:'nightlife',subcategory_key:'lounges',subcategory_name:'Lounges',sort_order:2,minimum_upcoming_inventory:0},
  {category_key:'day_parties_brunch',subcategory_key:'day_parties',subcategory_name:'Day Parties',sort_order:1,minimum_upcoming_inventory:0},
]
const FIXTURE_DIRECTORY=FIXTURE_VENUES.flatMap((venue,index)=>[{
  ...venue,
  category_name:venue.category_key==='nightclub'||venue.category_key==='lounge'||venue.category_key==='rooftop'?'Nightlife':'Dining & Culinary',
  category_key:index===2?'day_parties_brunch':'nightlife',
  subcategory_key:index===1?'nightclubs':index===2?'day_parties':'lounges',
  taxonomy_confidence:0.98,
}])

let browser
let session=null
if(!skip){
  if(SESSION_FILE&&fs.existsSync(SESSION_FILE)){
    session=JSON.parse(fs.readFileSync(SESSION_FILE,'utf8'))
    if(!session.expires_at)session.expires_at=Math.floor(Date.now()/1000)+3600
  }
  fs.mkdirSync(OUT,{recursive:true})
  browser=process.env.GT_UI_CHROME_PATH
    ?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

const json=value=>({status:200,contentType:'application/json',body:JSON.stringify(value)})

async function installFixtureRoutes(ctx){
  await ctx.route('**/api/data**',route=>route.fulfill(json({ok:true,connected:true,degraded:false,city:'atlanta',counts:{events:FIXTURE_EVENTS.length,venues:FIXTURE_VENUES.length},events:FIXTURE_EVENTS,venues:FIXTURE_VENUES})))
  await ctx.route('**/rest/v1/gt_taxonomy_categories**',route=>route.fulfill(json(FIXTURE_TAXONOMY_CATEGORIES)))
  await ctx.route('**/rest/v1/gt_taxonomy_subcategories**',route=>route.fulfill(json(FIXTURE_TAXONOMY_SUBCATEGORIES)))
  await ctx.route('**/rest/v1/v_gt_venue_taxonomy_directory**',route=>route.fulfill(json(FIXTURE_DIRECTORY)))
  await ctx.route('**/rest/v1/gt_user_profiles**',route=>route.fulfill(json([{id:'gt-ui-fixture-profile',auth_id:'gt-ui-fixture-user',full_name:'GOOD TIMES QA',home_city:'atlanta',last_city:'atlanta',vibe_preferences:['grown','nightlife'],tab_interests:['nightlife']}])) )
  await ctx.route('**/rest/v1/gt_saved_items**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/itineraries**',route=>route.fulfill(json([])))
  await ctx.route('**/rest/v1/gt_product_events**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/rest/v1/gt_taste_signals**',route=>route.fulfill({status:201,contentType:'application/json',body:'[]'}))
  await ctx.route('**/functions/v1/**',route=>route.fulfill(json({ok:true,message:'Fixture concierge ready.',events:FIXTURE_EVENTS.slice(0,2),venues:FIXTURE_VENUES.slice(0,2),thread_id:'fixture-thread'})))
}

async function open(vp,signedIn){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile})
  if(signedIn){
    const activeSession=session||FIXTURE_SESSION
    await ctx.addInitScript(s=>{
      localStorage.setItem('gt_session',JSON.stringify(s))
      localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['grown','nightlife'],age:'25-34'}))
      sessionStorage.setItem('gt_premium_launch','1')
      sessionStorage.setItem('gt_splash_shown','1')
    },activeSession)
    if(!session)await installFixtureRoutes(ctx)
  }
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(String(error?.message||error)))
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('[data-app="good-times"] .gt4-app',{timeout:30000})
  await page.waitForTimeout(signedIn?1200:1800)
  return{ctx,page,errors}
}

const geometry=page=>page.evaluate(()=>{
  const vw=innerWidth,vh=innerHeight
  const box=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
  const doc=document.scrollingElement||document.documentElement
  const fixedOutside=[]
  for(const el of document.querySelectorAll('body *')){
    const cs=getComputedStyle(el)
    if(cs.position!=='fixed'||cs.visibility==='hidden'||cs.display==='none'||Number(cs.opacity)===0)continue
    const r=el.getBoundingClientRect()
    if(r.width===0||r.height===0)continue
    if(r.right>vw+2||r.left< -2||r.bottom>vh+2||r.top< -2)fixedOutside.push(`${el.className||el.tagName} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  }
  const app=document.querySelector('.gt4-app')
  const main=document.querySelector('.gt4-main')
  const nav=box('.gt4-nav')
  const topbar=box('.gt4-topbar')
  const radar=box('.gt4-radar-strip')
  const visibleNavs=['.gt4-nav','.gt2-nav','.gt-five-nav','.gtlive-nav'].filter(sel=>{
    const el=document.querySelector(sel);if(!el)return false
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false
    const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<vh
  })
  return{
    vw,vh,
    hOverflow:doc.scrollWidth-vw,
    fixedOutside,
    app:app?box('.gt4-app'):null,
    appOverflow:app?Math.max(0,app.scrollHeight-app.clientHeight):0,
    mainOverflow:main?Math.max(0,main.scrollHeight-main.clientHeight):0,
    nav,topbar,radar,
    hero:box('.gt4-hero'),
    visibleNavs,
    navLabels:[...document.querySelectorAll('.gt4-nav button')].map(item=>String(item.textContent||'').trim()),
    dialogsTooBig:[...document.querySelectorAll('[role="dialog"],.gt4-modal-bg,.gt4-detail,.gt4-profile')].filter(el=>{const r=el.getBoundingClientRect();return r.width>vw+4}).map(el=>String(el.className||el.tagName)),
  }
})

function assertShell(g){
  assert.ok(g.hOverflow<=1,`horizontal overflow of ${g.hOverflow}px`)
  assert.deepEqual(g.fixedOutside,[],'fixed controls outside the viewport')
  assert.deepEqual(g.visibleNavs,['.gt4-nav'],'V3 must expose exactly one primary navigation')
  assert.ok(g.app&&g.app.w>0&&g.app.h>0,'V3 app shell is missing')
  assert.ok(g.nav&&g.nav.top>=-2&&g.nav.bottom<=g.vh+2,`V3 nav is outside viewport: ${JSON.stringify(g.nav)}`)
  assert.ok(g.topbar&&g.topbar.top>=-2&&g.topbar.bottom<=g.vh+2,`V3 topbar is outside viewport: ${JSON.stringify(g.topbar)}`)
  assert.ok(g.radar&&g.radar.top>=-2&&g.radar.bottom<=g.vh+2,`V3 radar strip is outside viewport: ${JSON.stringify(g.radar)}`)
  assert.ok(g.appOverflow<=4,`.gt4-app clips ${g.appOverflow}px of shell content`)
  assert.deepEqual(g.navLabels,['⌂Now','◇Discover','✦Concierge','◉Radar','▣Vault'])
  assert.deepEqual(g.dialogsTooBig,[],'dialogs wider than viewport')
}

for(const vp of VIEWPORTS){
  test(`[${vp.name}] signed-out V3 shell has no geometry faults`,{skip,timeout:45000},async()=>{
    const{ctx,page,errors}=await open(vp,false)
    const g=await geometry(page)
    await page.screenshot({path:path.join(OUT,`${vp.name}__signed-out-v3.png`),fullPage:false})
    assertShell(g)
    assert.ok(g.hero&&g.hero.h>180,`home hero collapsed: ${JSON.stringify(g.hero)}`)
    assert.deepEqual(errors,[],'uncaught page errors')
    await ctx.close()
  })

  test(`[${vp.name}] signed-in V3 navigation stays stable`,{skip,timeout:60000},async()=>{
    const{ctx,page,errors}=await open(vp,true)
    let g=await geometry(page)
    assertShell(g)
    await page.screenshot({path:path.join(OUT,`${vp.name}__signed-in-now.png`),fullPage:false})

    const discover=page.locator('.gt4-nav button').filter({hasText:'Discover'}).first()
    await discover.click()
    await page.waitForSelector('.gt4-discover',{timeout:10000})
    assert.equal(await page.locator('.gt4-discover').isVisible(),true,'Discover did not open')

    const concierge=page.locator('.gt4-nav button').filter({hasText:'Concierge'}).first()
    await concierge.click()
    await page.waitForSelector('.gt4-screen .gt4-concierge',{timeout:10000})
    assert.equal(await page.locator('.gt4-builder').count(),1,'guided builder missing from Concierge')

    const radar=page.locator('.gt4-nav button').filter({hasText:'Radar'}).first()
    await radar.click()
    await page.waitForSelector('.gt4-radar-settings',{timeout:10000})
    assert.equal(await page.locator('.gt4-radar-settings').isVisible(),true,'Radar did not open')

    const vault=page.locator('.gt4-nav button').filter({hasText:'Vault'}).first()
    await vault.click()
    await page.waitForSelector('.gt4-vault-tabs',{timeout:10000})
    assert.equal(await page.locator('.gt4-vault-tabs').isVisible(),true,'Vault did not open')

    g=await geometry(page)
    assertShell(g)
    assert.deepEqual(errors,[],'uncaught page errors after V3 navigation')
    await page.screenshot({path:path.join(OUT,`${vp.name}__signed-in-vault.png`),fullPage:false})
    await ctx.close()
  })
}

test('teardown',{skip},async()=>{await browser.close()})
