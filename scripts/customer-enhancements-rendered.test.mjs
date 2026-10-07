import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const json=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)})
const FIXED=Date.parse('2026-09-28T00:30:00-04:00')
const SESSION={access_token:'isolated-test-token',user:{id:'11111111-1111-4111-8111-111111111111'},expires_at:4102444800}
const event={event_key:'show:22222222-2222-4222-8222-222222222222',id:'22222222-2222-4222-8222-222222222222',title:'Fixture upcoming concert',category_key:'concerts_live_music',subcategory_key:'arena_concerts',city_key:'atlanta',event_date:'2026-09-28',event_time:'20:00',venue_name:'Fixture Hall',image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/tickets',quality_score:90,is_verified:true,updated_at:'2026-09-28T03:00:00Z'}
const venues=[1,2,3,4].map(i=>({id:`3333333${i}-3333-4333-8333-333333333333`,name:`Fixture restaurant ${i}`,category_key:'dining_culinary',city_key:'atlanta',subcategory_key:'restaurant_places',subcategory:'Restaurants',venue_category_key:'restaurant',venue_subcategory:'Restaurant',price_range:'$$',quality_score:85-i,neighborhood:'Midtown',short_desc:'A deterministic test restaurant.',hero_image:'/venues/revel.webp',website:'https://example.invalid/place',address:'Fixture address',status:'active',is_verified:true,verification_status:'verified_current',freshness_expires_at:'2026-10-28T00:00:00Z',hours:{periods:[{open:{day:1,time:'1700'},close:{day:2,time:'0100'}}]}}))
const categories=[{category_key:'dining_culinary',category_name:'Restaurants',sort_order:1,is_active:true}]
const subs=[{category_key:'dining_culinary',subcategory_key:'restaurant_places',subcategory_name:'Restaurants',sort_order:1,is_active:true}]
for(const width of[320,390,430,834])test(`customer enhancements ${width}: Places Entertainment Plan and My GOOD TIMES`,{skip:!BASE||!chromium,timeout:70000},async()=>{
 const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']});const ctx=await browser.newContext({viewport:{width,height:844},timezoneId:'America/New_York'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
 try{
  await ctx.addInitScript(({session,epoch})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[epoch]))}static now(){return epoch}};localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},{session:SESSION,epoch:FIXED})
  await ctx.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;if(p==='/api/health')return r.fulfill(json({ok:true,customer_ready:true,content_ready:true,service:'good-times'}));if(p.startsWith('/api/data'))return r.fulfill(json({ok:true,city:'atlanta',connected:true,events:[event],venues}));if(p==='/api/browse')return r.fulfill(json({ok:true,items:[event],nextCursor:null,asOf:new Date(FIXED).toISOString()}));if(p==='/api/saved-content')return r.fulfill(json({ok:true,items:[]}));return r.fulfill(json({ok:true}))})
  await ctx.route('**/rest/v1/**',r=>{const u=new URL(r.request().url()),t=u.pathname.split('/').at(-1);if(t==='gt_user_profiles')return r.fulfill(json([{id:'44444444-4444-4444-8444-444444444444',auth_id:SESSION.user.id,full_name:'Test Member',home_city:'atlanta',vibe_preferences:['dining']}])) ;if(t==='gt_taxonomy_categories')return r.fulfill(json(categories));if(t==='gt_taxonomy_subcategories')return r.fulfill(json(subs));if(t==='v_gt_venue_taxonomy_counts')return r.fulfill(json([{category_key:'dining_culinary',subcategory_key:null,place_count:4},{category_key:'dining_culinary',subcategory_key:'restaurant_places',place_count:4}]));if(t==='v_gt_venue_taxonomy_directory')return r.fulfill(json(venues));if(t==='v_gt_restaurant_entities')return r.fulfill(json(venues.map(v=>({...v,service_level:'upscale',cuisine_tags:['italian'],occasion_tags:['date_night'],meal_tags:['dinner'],restaurant_vibe_tags:['high_energy'],feature_tags:['full_bar'],dietary_tags:[],ownership_tags:[],profile_confidence:90,needs_review:false}))));return r.fulfill(json([]))})
  await ctx.route('**/functions/v1/**',r=>r.fulfill(json({ok:true,events:[event],venues,message:'Fixture response: request received.'})))
  await page.goto(BASE);await page.locator('.gt5-app').waitFor({timeout:15000})
  const nav=page.locator('.gt5-nav button');assert.deepEqual(await nav.locator('small').allTextContents(),['Home','Discover','Entertainment','Plan','Profile'])
  for(const name of['Home','Discover','Entertainment','Plan','Profile']){await nav.filter({hasText:new RegExp(`^${name}$`)}).click();await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,`${name} horizontal overflow`);await page.screenshot({path:path.join(OUT,`customer-fixture-${width}-${name.toLowerCase()}.png`)})}

  await nav.filter({hasText:'Places'}).click();assert.equal(await page.getByRole('textbox',{name:'Search Atlanta places'}).count(),1);assert.equal(await page.locator('.gtc-place-lanes>button').count(),6);await page.getByRole('button',{name:/Restaurants/}).click();await page.locator('.gtc-restaurants').waitFor();assert.ok(await page.locator('.gtc-restaurant-quick button').count()>=9);await page.locator('.gtc-restaurants .gtc-card').first().waitFor({timeout:10000});assert.ok(await page.locator('.gtc-restaurants .gtc-card').count()>=1)

  await nav.filter({hasText:'Entertainment'}).click();assert.equal(await page.locator('.gtc-entertainment-lane').count(),9);assert.deepEqual(await page.locator('.gtc-entertainment-time button').allTextContents(),['Tonight','This Weekend','Upcoming'])

  await nav.filter({hasText:'Plan'}).click();assert.deepEqual(await page.locator('.gtc-planner>.gtc-tabs button').allTextContents(),['Build My Night','Shake','Ask']);assert.ok(await page.locator('.gtc-mood-grid').isVisible())
  await page.getByRole('button',{name:'Continue →',exact:true}).click();assert.ok(await page.getByLabel('Date').isVisible());assert.ok(await page.getByLabel('People').isVisible())
  await page.getByRole('button',{name:'Shake',exact:true}).click();await page.getByRole('button',{name:'Pick for me',exact:true}).click();await page.locator('.gt-shake__result').waitFor()
  await page.getByRole('button',{name:'Ask',exact:true}).click();await page.getByRole('textbox',{name:'Ask GOOD TIMES'}).fill('Dinner and something fun in Midtown');await page.getByRole('button',{name:'Find my options'}).click();await page.getByText('Fixture response: request received.').waitFor()

  await nav.filter({hasText:'Profile'}).click();await page.locator('.gtc-my-good-times').waitFor();assert.deepEqual(await page.locator('.gtc-my-good-times>.gtc-tabs button').allTextContents(),['Plans · 0','Places · 0','Entertainment · 0'])
  assert.deepEqual(errors,[])
 }finally{await ctx.close();await browser.close()}
})
