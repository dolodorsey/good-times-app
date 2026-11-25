import { chromium } from 'playwright-core'
import { mkdir, writeFile, appendFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

// Only the public production origin is probed. No account, credential, session,
// auth bypass, fixture inventory or localStorage modification is used.
const origin = 'https://thegoodtimesworldwide.com'
const out = 'artifacts/public-stability'
await mkdir(out, {recursive:true})
const wait = ms => new Promise(resolve => setTimeout(resolve,ms))
const report = {observed_at:new Date().toISOString(),origin,workflow_sha:process.env.GITHUB_SHA||null,authentication:'anonymous',signed_in_journeys_verified:false,requests:[],screens:[]}
async function observe(path) {
  const started = performance.now()
  try {
    const response = await fetch(origin+path,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)})
    const body = await response.json()
    const headers = Object.fromEntries(['x-vercel-cache','age','cache-control','x-good-times-cache','x-good-times-health','x-good-times-live-gateway'].map(key=>[key,response.headers.get(key)]))
    const result = {path,status:response.status,duration_ms:Math.round(performance.now()-started),headers,generated_at:body.generated_at,source:body.source,degraded:body.degraded,content_ready:body.content_ready,customer_ready:body.customer_ready,counts:body.counts,uncategorized_events:Array.isArray(body.events)?body.events.filter(event=>!event.category_key).length:null}
    report.requests.push(result)
    console.log('PUBLIC_OBSERVATION',JSON.stringify(result))
  } catch(error) {
    const result={path,duration_ms:Math.round(performance.now()-started),error:error.message}
    report.requests.push(result)
    console.log('PUBLIC_OBSERVATION',JSON.stringify(result))
  }
}
const inventoryPath='/api/data-fast?city=atlanta&event_limit=60&venue_limit=90'
for(let index=0;index<3;index++) {
  await observe(inventoryPath)
  await observe('/api/health')
  if(index<2)await wait(1200)
}
let browser
try {
  browser=await chromium.launch({headless:true})
  for(const device of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]) {
    const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    try {
      await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000})
      await page.locator('body').waitFor({state:'visible',timeout:15000})
      await page.waitForTimeout(2500)
      const text=(await page.locator('body').innerText()).slice(0,1500)
      const geometry=await page.evaluate(()=>({viewport:window.innerWidth,scroll_width:document.documentElement.scrollWidth}))
      const file=`${device.name}-public.png`
      await page.screenshot({path:`${out}/${file}`,fullPage:true})
      report.screens.push({device:device.name,url:page.url(),file,authentication:'anonymous',entry_gate_visible:/get started|sign in|log in/i.test(text),geometry,page_errors:errors,visible_text_excerpt:text})
    } catch(error) {
      report.screens.push({device:device.name,error:error.message,page_errors:errors})
    } finally {await context.close()}
  }
} catch(error) {report.browser_error=error.message}
finally {if(browser)await browser.close()}
const inventory=report.requests.filter(row=>row.path===inventoryPath)
const health=report.requests.filter(row=>row.path==='/api/health')
report.summary={
  observation_complete:report.requests.length===6&&report.screens.filter(row=>row.file).length===2,
  public_inventory_available:inventory.every(row=>row.status===200&&row.counts?.events>0&&row.counts?.venues>0),
  live_inventory_healthy:inventory.every(row=>row.status===200&&row.degraded===false&&row.source!=='good-times-verified-embedded-snapshot'),
  health_ready:health.every(row=>row.status===200&&row.degraded===false&&row.content_ready===true),
  cdn_hit_observed:inventory.some(row=>row.headers?.['x-vercel-cache']==='HIT'),
  signed_in_journeys_verified:false
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2))
console.log('PUBLIC_STABILITY_SUMMARY',JSON.stringify(report.summary))
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## Anonymous production observations\n\n```json\n'+JSON.stringify(report.summary,null,2)+'\n```\n\nArtifacts include actual public desktop/mobile screenshots. A successful evidence job means observations were captured; it does not certify live health or signed-in journeys. Read the explicit report fields.\n')
if(!report.summary.observation_complete)process.exitCode=1
