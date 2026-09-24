import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright-core'

// Real production requests and real QA authentication. No fixture session or data.
// Credentials and browser storage remain in memory and are never exported.
const BASE='https://thegoodtimesworldwide.com'
const OUT='production-reference-proof'
const username=process.env.GOOD_TIMES_APP_REVIEW_USERNAME
const password=process.env.GOOD_TIMES_APP_REVIEW_PASSWORD
const report={target:BASE,startedAt:new Date().toISOString(),authentication:'not-tested',evidenceType:'production-browser',screenshots:[],notTested:[],failures:[]}
fs.mkdirSync(OUT,{recursive:true})
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
async function json(url){const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json()}
async function waitForRepair(){
 const end=Date.now()+300000
 while(Date.now()<end){
  try{const res=await fetch(`${BASE}/reference-base/atlanta-rooftop.webp`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(res.ok&&res.headers.get('content-type')?.startsWith('image/')){const bytes=Buffer.from(await res.arrayBuffer());if(digest(bytes)==='bf0e1f69441e899c6cb4d75949f693831e6b74ef75b286577c83957333dfaeb7')return}}catch{}
  await sleep(10000)
 }
 throw new Error('Canonical production domain has not served the verified repair asset within five minutes')
}
let browser
try{
 await waitForRepair()
 report.repairAssetVerified=true
 report.health=await json(`${BASE}/api/health`)
 const inventory=await json(`${BASE}/api/data-fast?city=atlanta&event_limit=60&venue_limit=80`)
 report.inventory={connected:inventory.connected,degraded:inventory.degraded,source:inventory.source,city:inventory.city,counts:inventory.counts,generatedAt:inventory.generated_at}
 if(!report.health.customer_ready||!report.health.content_ready||report.health.degraded)report.failures.push('Production health is not fully ready')
 if(!inventory.connected||inventory.degraded||!inventory.events?.length||!inventory.venues?.length)report.failures.push('Live inventory is unavailable or degraded')
 if(inventory.city!=='atlanta'||[...(inventory.events||[]),...(inventory.venues||[])].some(r=>r.city_key&&r.city_key!=='atlanta'))report.failures.push('Atlanta scope violation')
 if(!username||!password)throw new Error('Encrypted reviewer credentials are not configured for this QA run')
 browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})
 let authenticatedState
 for(const viewport of [{width:390,height:844},{width:834,height:1194},{width:1440,height:900}]){
  const context=await browser.newContext({viewport,timezoneId:'America/New_York',reducedMotion:'reduce',...(authenticatedState?{storageState:authenticatedState}:{})})
  // Do not pollute acquisition or recommendation signals during a read-only visual audit.
  await context.route(/\/rest\/v1\/(gt_growth_events|gt_product_events|gt_taste_signals)(\?|$)/,route=>route.request().method()==='POST'?route.fulfill({status:204}):route.continue())
  const page=await context.newPage()
  let pageErrors=0;page.on('pageerror',()=>pageErrors++)
  const dir=path.join(OUT,String(viewport.width));fs.mkdirSync(dir,{recursive:true})
  async function capture(name,selector='.gt5-main'){
   const scroller=page.locator(selector).last()
   if(await scroller.count())await scroller.evaluate(el=>{el.scrollTop=0})
   await page.waitForTimeout(300)
   for(const position of ['top','bottom']){
    if(position==='bottom'&&await scroller.count())await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight})
    await page.waitForTimeout(150)
    const file=`${name}-${position}.png`
    const bytes=await page.screenshot({animations:'disabled',mask:[page.locator('input[type=email],input[type=password]'),page.locator('.gt5-profile .gt5-hero h1')]})
    fs.writeFileSync(path.join(dir,file),bytes)
    report.screenshots.push({viewport:viewport.width,screen:name,position,file:`${viewport.width}/${file}`,sha256:digest(bytes),redactions:'Credential fields and QA profile name'})
   }
   if(await scroller.count())await scroller.evaluate(el=>{el.scrollTop=0})
  }
  async function tab(label,selector){await page.locator('.gt5-nav button').filter({hasText:new RegExp(`^${label}$`)}).click();await page.locator(selector).waitFor({timeout:15000})}
  try{
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
   if(!authenticatedState){
    await page.getByRole('button',{name:'I Already Have an Account',exact:true}).click({timeout:30000})
    report.googleButtonVisible=await page.getByRole('button',{name:/Continue with Google/}).isVisible()
    await page.locator('input[type=email]').fill(username)
    await page.locator('input[type=password]').fill(password)
    await page.getByRole('button',{name:'Sign In',exact:true}).last().click()
    await page.locator('.gt5-app').waitFor({timeout:40000})
    report.authentication='passed-real-ui-sign-in'
    authenticatedState=await context.storageState()
   }else await page.locator('.gt5-app').waitFor({timeout:30000})
   await page.locator('.gt5-highlight-grid .gt5-card').first().waitFor({timeout:25000})
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2500))]))
   const styles=await page.evaluate(()=>({heroFont:getComputedStyle(document.querySelector('.gt5-hero h1')).fontFamily,canvas:getComputedStyle(document.querySelector('.gt5-main')).backgroundColor,nav:[...document.querySelectorAll('.gt5-nav button small')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth-innerWidth}))
   report[`visual_${viewport.width}`]=styles
   if(!/Playfair|Georgia|Garamond/.test(styles.heroFont)||styles.canvas!=='rgb(5, 6, 7)'||styles.overflow>1||styles.nav.join('|')!=='Home|Discover|Plan|Saved|Profile')report.failures.push(`Production visual contract failed at ${viewport.width}`)
   await capture('01-home')
   const dining=page.locator('.gt5-card[data-category="restaurant"] h3').first()
   if(await dining.count()){await dining.click();await page.locator('.gt5-detail').waitFor();await capture('07-venue-detail','.gt5-overlay');await page.locator('.gt5-detail-back').click()}else report.notTested.push(`${viewport.width}: no restaurant card available for venue-detail capture`)
   await page.locator('.gt5-home-modes button').filter({hasText:'Tonight'}).click();await capture('02-tonight')
   await tab('Discover','.gt5-discover');await capture('03-discover')
   await tab('Plan','.gt5-plan');await capture('04-plan')
   await tab('Saved','.gt5-saved');await capture('05-saved')
   const itinerary=page.locator('.gt5-plan-list button').first()
   if(await itinerary.count()){await itinerary.click();await capture('06-itinerary','.gt5-overlay');await page.locator('.gt5-detail-back').click()}else report.notTested.push(`${viewport.width}: QA account has no saved itinerary; no artificial record created`)
   await tab('Profile','.gt5-profile');await capture('08-profile')
   await page.locator('.gt5-bell').click();await page.locator('.gt5-radar').waitFor();await capture('09-radar')
   await page.locator('.gt5-back').click()
   if(await page.locator('.gt5-app').getAttribute('data-screen')!=='profile')report.failures.push(`Radar origin lost at ${viewport.width}`)
   if(pageErrors)report.failures.push(`${pageErrors} uncaught browser errors at ${viewport.width}`)
  }catch(error){report.failures.push(`Browser verification incomplete at ${viewport.width}: ${error.name}`);await capture('verification-failed').catch(()=>{});break}
  finally{await context.close()}
 }
 report.notTested.push('Google OAuth third-party authorization completion; save/unsave persistence; bookings, purchases and other write actions')
}catch(error){report.failures.push(error.message.includes('reviewer credentials')?error.message:error.message.includes('Canonical production')?error.message:`Production verification failed: ${error.name}`)}
finally{
 if(browser)await browser.close()
 report.finishedAt=new Date().toISOString()
 report.status=report.failures.length?'INCOMPLETE':'READ_ONLY_VISUAL_CHECKS_PASSED'
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({status:report.status,authentication:report.authentication,screenshots:report.screenshots.length,failures:report.failures,notTested:report.notTested}))
 if(report.failures.length)process.exitCode=1
}
