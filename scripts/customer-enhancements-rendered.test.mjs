import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {installUXCatalogFixtures,openUXTab,PRIMARY_LABELS} from './ux-render-fixtures.mjs'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}
const json=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)})
const eventDate=new Date(Date.now()+86400000*3).toISOString().slice(0,10)
const fixtureEvent={event_key:'customer-event',title:'Fixture upcoming concert',category_key:'concerts_live_music',city_key:'atlanta',event_date:eventDate,event_time:'20:00',venue_name:'Fixture hall',quality_score:90,status:'published',image_url:'/venues/revel.webp',ticket_url:'https://example.invalid/no-transaction'}
const venues=[1,2,3].map(i=>({id:`customer-fixture-${i}`,name:`Fixture restaurant ${i}`,category_key:'restaurant',city_key:'atlanta',subcategory:'italian',price_range:'$$',quality_score:85,neighborhood:'Midtown',short_desc:'A deterministic test restaurant.'}))
const SESSION={access_token:'isolated-test-token',user:{id:'isolated-user'},expires_at:4102444800}
for(const width of [320,390,430,834])test(`customer enhancements ${width}: all three planning flows and Profile library`,{skip:!BASE||!chromium,timeout:80000},async()=>{
 const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']}),ctx=await browser.newContext({viewport:{width,height:844}}),page=await ctx.newPage(),errors=[],prompts=[],plans=[]
 page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync(OUT,{recursive:true})
 try{
 await ctx.addInitScript(session=>{localStorage.setItem('gt_session',JSON.stringify(session));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},SESSION)
 await ctx.route('**/api/**',r=>r.fulfill(json(new URL(r.request().url()).pathname==='/api/health'?{ok:true,customer_ready:true,content_ready:true,service:'good-times'}:{ok:true,city:'atlanta',connected:true,events:[fixtureEvent],venues})))
 await ctx.route('**/rest/v1/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill(json(p.endsWith('gt_user_profiles')?[{id:'fixture-profile',auth_id:SESSION.user.id,full_name:'Test Member',home_city:'atlanta',last_city:'atlanta'}]:p.endsWith('itineraries')?plans:[]))})
 await ctx.route('**/functions/v1/**',async r=>{
  if(!r.request().url().includes('good-times-live-concierge'))return r.fulfill(json({ok:true}))
  const input=r.request().postDataJSON();prompts.push(input);await new Promise(resolve=>setTimeout(resolve,150))
  if(!input.query.startsWith('Create a DRAFT'))return r.fulfill(json({ok:true,events:[],venues:[],message:'Fixture response: request received.'}))
  const plan={id:'customer-plan',name:'Fixture verified draft',user_id:SESSION.user.id,status:'draft',itinerary_date:eventDate,city_id:'atlanta',stops:venues.map((v,i)=>({id:v.id,name:v.name,time:`${18+i}:00`,role:i?'Activity':'Dinner',status:'SELECTED'}))}
  plans.splice(0,plans.length,plan);return r.fulfill(json({ok:true,itinerary:plan,message:'Draft ready. No reservations made.'}))
 })
 await installUXCatalogFixtures(ctx,[fixtureEvent],venues)
 await page.goto(BASE);await page.locator('.gt-ux-home .gt-ux-card').first().waitFor({timeout:15000})
 const topbar=await page.locator('.gt5-topbar').boundingBox();assert.ok(topbar.height<= (width<700?60:68),'Header stays compact at phone and tablet breakpoints')
 for(const name of PRIMARY_LABELS){await openUXTab(page,name);assert.deepEqual(await page.locator('.gt5-nav button small').allTextContents(),PRIMARY_LABELS);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,`${name} horizontal overflow`);await page.screenshot({path:path.join(OUT,`customer-${width}-${name.toLowerCase()}.png`)})}
 await openUXTab(page,'Home');await page.getByRole('heading',{name:fixtureEvent.title,exact:true}).first().click();await page.getByRole('button',{name:'Plan around this ✦',exact:true}).click()
 await page.getByRole('tab',{name:/Ask GOOD TIMES/}).waitFor();assert.equal(await page.getByRole('tab',{name:/Ask GOOD TIMES/}).getAttribute('aria-selected'),'true')
 const ask=page.locator('#gt-ux-ask-input');assert.ok((await ask.inputValue()).includes(eventDate),'Exact selected event date survives Ask handoff')
 await ask.fill('Four adults, dinner tomorrow in Midtown, $200 total.')
 await page.locator('.gt-ux-composer').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})
 await page.getByText('Fixture response: request received.',{exact:true}).waitFor();assert.equal(prompts.length,1,'Duplicate submit must not duplicate a concierge request');assert.equal(await page.locator('.gt-ux-conversation .from-user').count(),1,'Duplicate submit must not duplicate the conversation')
 await page.getByRole('tab',{name:/Build It/}).click();await page.getByRole('button',{name:'Date night',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:false}).click()
 await page.getByLabel('Plan date',{exact:true}).fill(eventDate);await page.getByLabel('Plan start time',{exact:true}).fill('18:00');await page.getByLabel('Adults',{exact:true}).fill('4');await page.getByLabel('Total group budget ($)',{exact:true}).fill('200');await page.getByLabel('Neighborhood',{exact:true}).fill('Midtown')
 await page.getByRole('button',{name:'Continue',exact:false}).click();await page.getByRole('button',{name:'Create my draft plan',exact:false}).click();await page.locator('.gt5-itinerary').waitFor()
 assert.match(prompts[1].query,/Party: 4 adults and 0 children/);assert.match(prompts[1].query,/Maximum TOTAL budget for the whole group: \$200/);assert.ok(prompts[1].query.includes(eventDate))
 assert.equal(await page.locator('.gt5-timeline section').count(),3);assert.equal(await page.locator('.gt5-plan-status').filter({hasText:'CONFIRMED'}).count(),0)
 await page.locator('.gt5-detail-back').click();await openUXTab(page,'Profile');await page.locator('.gt5-profile .gt-ux-chips button').filter({hasText:/^Drafts/}).click();await page.locator('.gt-ux-my-plans').getByRole('heading',{name:'Fixture verified draft'}).waitFor()
 await page.reload();await page.locator('.gt5-profile').waitFor();await page.locator('.gt5-profile .gt-ux-chips button').filter({hasText:/^Drafts/}).click();await page.locator('.gt-ux-my-plans').getByRole('heading',{name:'Fixture verified draft'}).waitFor()
 // Reload reads the isolated fixture backend; this is not evidence of live Supabase persistence.
 await openUXTab(page,'Plan');await page.getByRole('tab',{name:/Shake It/}).click();await page.getByRole('button',{name:'Tap to shake',exact:true}).click();await page.locator('.gt-ux-shake-result').waitFor()
 const first=await page.locator('.gt-ux-shake-result h3').innerText();await page.getByRole('button',{name:'Tap to shake',exact:true}).click();assert.notEqual(await page.locator('.gt-ux-shake-result h3').innerText(),first,'Avoid immediate repeats when alternatives exist')
 const selected=await page.locator('.gt-ux-shake-result h3').innerText();await page.getByRole('button',{name:'Keep it & build a plan',exact:true}).click();await page.locator('.gt5-itinerary').waitFor();assert.ok(prompts.at(-1).query.includes(selected),'Shake selection reaches the planning service')
 await page.locator('.gt5-detail-back').click();await page.getByRole('tab',{name:/Build It/}).click();await page.getByRole('button',{name:'Continue',exact:false}).click();assert.equal(await page.getByLabel('Adults',{exact:true}).inputValue(),'4','Guided selections survive mode changes and reload')
 await page.screenshot({path:path.join(OUT,`customer-${width}-guided.png`)})
 assert.deepEqual(errors,[])
 }catch(error){await page.screenshot({path:path.join(OUT,`customer-${width}-failure.png`)}).catch(()=>{});throw error}finally{await ctx.close();await browser.close()}
})
