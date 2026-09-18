import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const json=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)})
const eventDate=new Date(Date.now()+86400000*3).toISOString().slice(0,10)
const fixtureEvent={event_key:'customer-event',title:'Fixture upcoming concert',category_key:'concerts_live_music',city_key:'atlanta',city_slug:'atlanta',event_date:eventDate,event_time:'20:00:00',venue_name:'Fixture hall',quality_score:90,status:'published'}
const venues=[1,2,3].map(i=>({id:`customer-fixture-${i}`,name:`Fixture restaurant ${i}`,category_key:'restaurant',city_key:'atlanta',subcategory:'italian',price_range:'$$',quality_score:85,neighborhood:'Midtown',short_desc:'A deterministic test restaurant.'}))
for(const width of [320,390,430,834])test(`customer enhancements ${width}: page layout, planning controls and Shake`,{skip:!BASE||!chromium,timeout:60000},async()=>{
 const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']});const ctx=await browser.newContext({viewport:{width,height:844}});const page=await ctx.newPage();const errors=[],prompts=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
 try{
 await ctx.addInitScript(()=>{localStorage.setItem('gt_session',JSON.stringify({access_token:'isolated-test-token',user:{id:'isolated-user'},expires_at:4102444800}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')})
 await ctx.route('**/api/**',r=>r.fulfill(json(new URL(r.request().url()).pathname==='/api/health'?{ok:true,customer_ready:true,content_ready:true,service:'good-times'}:{ok:true,city:'atlanta',connected:true,events:[fixtureEvent],venues})))
 await ctx.route('**/rest/v1/**',r=>r.fulfill(json(r.request().url().includes('gt_user_profiles')?[{id:'fixture-profile',full_name:'Test Member',home_city:'atlanta'}]:[])))
 await ctx.route('**/functions/v1/**',r=>{if(r.request().url().includes('good-times-live-concierge'))prompts.push(r.request().postDataJSON());return r.fulfill(json({ok:true,events:[],venues:[],message:'Fixture response: request received.'}))})
 await page.goto(BASE);await page.locator('.gt5-app').waitFor({timeout:15000})
 assert.ok((await page.locator('.gt5-topbar').boundingBox()).height<=60,'compact header')
 for(const name of ['Home','Discover','Plan','Saved','Profile']){
  await page.locator('.gt5-nav button').filter({hasText:new RegExp(`^${name}$`)}).click();await page.waitForTimeout(100)
  assert.deepEqual(await page.locator('.gt5-nav button small').allTextContents(),['Home','Discover','Plan','Saved','Profile'])
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`${name} horizontal overflow ${overflow}`)
  await page.screenshot({path:path.join(OUT,`customer-fixture-${width}-${name.toLowerCase()}.png`)})
 }
 await page.getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('heading',{name:'Fixture upcoming concert',exact:true}).first().click();await page.getByRole('button',{name:'Plan around this ✦',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'When',exact:true}).inputValue(),eventDate,'event date survives planner handoff')
 await page.getByRole('button',{name:'Discover',exact:true}).click();assert.equal(await page.getByPlaceholder('Search venue, neighborhood, category or vibe…').count(),1,'one discovery search')
 await page.getByRole('button',{name:'Plan',exact:true}).click();await page.getByRole('button',{name:'Date night',exact:true}).click();await page.getByRole('combobox',{name:'When',exact:true}).selectOption('Tomorrow');await page.getByRole('combobox',{name:'People',exact:true}).selectOption('4');await page.getByRole('combobox',{name:'Budget / person',exact:true}).selectOption('Under $50');await page.getByRole('button',{name:'✦ Build my night →',exact:true}).click();await page.getByText('Fixture response: request received.').waitFor();assert.match(prompts[0].query,/When: Tomorrow\. Group: 4\. Budget per person: Under \$50/)
 await page.getByRole('button',{name:'Pick for me',exact:true}).click();await page.locator('.gt-shake__result').waitFor();const first=await page.locator('.gt-shake__copy h3').innerText();await page.getByRole('button',{name:'Shake again',exact:true}).click();await page.waitForTimeout(800);assert.notEqual(await page.locator('.gt-shake__copy h3').innerText(),first,'avoid immediate repeat when alternatives exist')
 await page.getByRole('button',{name:'Build a night around this ↗',exact:true}).click();assert.match(await page.locator('.gt5-plan-text textarea').inputValue(),/Build my night around Fixture restaurant/)
 await page.getByRole('button',{name:'Custom Plan You’re in control',exact:true}).click();assert.equal(await page.locator('.gt5-plan-builder').count(),0);assert.ok(await page.locator('.gt5-guided').isVisible());assert.ok(await page.getByRole('button',{name:'Continue →',exact:true}).isVisible())
 await page.screenshot({path:path.join(OUT,`customer-fixture-${width}-guided.png`)})
 assert.deepEqual(errors,[])
 }finally{await ctx.close();await browser.close()}
})
