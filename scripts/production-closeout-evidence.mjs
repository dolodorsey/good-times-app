import fs from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { GT_SUPABASE_URL, GT_SUPABASE_ANON_KEY } from '../src/lib/supabase.js'
import { releaseMatches } from './wait-production-release.mjs'

// This harness never creates accounts, fabricates sessions, mocks API responses,
// stores credentials in artifacts, or writes saved items/plans.
const BASE='https://thegoodtimesworldwide.com'
const OUT='closeout-evidence'
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const report={started_at:new Date().toISOString(),expected_sha:process.env.GITHUB_SHA,
  samples:[],public_screens:[],signed_in:{state:'blocked',reason:'qa_session_not_configured',navigation_verified:false,save_write_verified:false,plan_creation_verified:false}}
await fs.mkdir(OUT,{recursive:true})
let browser
async function read(path){
  const started=performance.now()
  try{
    const response=await fetch(`${BASE}${path}`,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)})
    const body=await response.json()
    return{at:new Date().toISOString(),status:response.status,ms:Math.round(performance.now()-started),cdn:response.headers.get('x-vercel-cache'),age:response.headers.get('age'),body}
  }catch(error){return{at:new Date().toISOString(),status:0,ms:Math.round(performance.now()-started),error:error.name}}
}
function summary(value){
  const b=value.body||{}
  const rows=Array.isArray(b.events)?b.events:[]
  const {body,...metadata}=value
  return{...metadata,ok:b.ok,degraded:b.degraded,content_ready:b.content_ready,source:b.source,
    counts:b.counts,city:b.city,event_age_hours:b.coverage?.event_age_hours,
    uncategorized:rows.filter(row=>!row.category_key).length,
    wrong_city:rows.filter(row=>row.city_key!=='atlanta').length}
}
async function observeAuthorizedSession(){
  const raw=process.env.GT_UI_QA_SESSION
  if(!raw)return
  let session,claims
  try{
    const parsed=JSON.parse(raw);session=parsed.session||parsed
    claims=JSON.parse(Buffer.from(String(session.access_token).split('.')[1],'base64url').toString())
  }catch{report.signed_in.reason='qa_session_invalid_format';return}
  if(claims.role!=='authenticated'||claims.iss!==`${GT_SUPABASE_URL}/auth/v1`||!claims.sub||claims.sub!==session.user?.id){report.signed_in.reason='qa_session_not_a_matching_customer_token';return}
  if(Number(claims.exp||0)<=Date.now()/1000+120){report.signed_in.reason='qa_session_expired_or_near_expiry';return}
  const auth=await fetch(`${GT_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`},redirect:'error',signal:AbortSignal.timeout(8000)})
  const user=await auth.json().catch(()=>null)
  if(!auth.ok||user?.id!==claims.sub){report.signed_in.reason='qa_session_rejected_by_auth_server';return}
  report.signed_in={...report.signed_in,state:'validated',reason:null,auth_server_validated:true,screens:[]}
  // Store only the genuine server-validated session in the app's normal session key.
  session={...session,expires_at:claims.exp,user}
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}})
    try{
      await context.addInitScript(s=>localStorage.setItem('gt_session',JSON.stringify(s)),session)
      const page=await context.newPage();const errors=[]
      page.on('pageerror',()=>errors.push('uncaught_page_error'))
      await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
      await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000})
      const capture=async(name,selector)=>{
        await page.locator(selector).waitFor({state:'visible',timeout:15000})
        await page.waitForTimeout(1200)
        const visible=await page.locator(selector).isVisible()
        const hasContent=await page.locator(selector).evaluate(el=>Boolean(el.textContent.trim()))
        const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth))
        const labels=await page.locator('.gt5-nav button small').allTextContents()
        const expected=['Home','Entertainment','Plan','Venues','Profile']
        const navigationMatches=JSON.stringify(labels)===JSON.stringify(expected)
        report.signed_in.screens.push({device:viewport.name,tab:name,visible,has_content:hasContent,horizontal_overflow:overflow,page_errors:errors.length,navigation_matches:navigationMatches})
        // Keep private profile, saved items, personal plans, and draft conversation contents out of artifacts.
        if(name!=='Profile'&&!name.startsWith('Plan')){
          const mask=page.locator('.gt-ux-resume,.gt5-radar-strip')
          await page.screenshot({path:`${OUT}/${viewport.name}-${name.toLowerCase()}.png`,fullPage:false,mask:[mask]})
        }
      }
      for(const [name,selector] of [['Home','.gt-ux-home'],['Entertainment','.gt-ux-directory:visible'],['Venues','.gt-ux-directory:visible'],['Plan','.gt-ux-planner:visible'],['Profile','.gt5-profile']]){
        await page.locator('.gt5-nav').getByRole('button',{name,exact:true}).click()
        if(name==='Entertainment'||name==='Venues')await page.locator('.gt-ux-directory[aria-busy="false"]:visible').waitFor({timeout:20000})
        await capture(name,selector)
        if(name==='Home'){
          for(const mode of ['Upcoming','Tonight','Sports']){
            await page.locator('.gt-ux-home-modes').getByRole('button',{name:mode,exact:true}).click()
            await capture(mode,'.gt-ux-home')
          }
        }
        if(name==='Plan'){
          for(const mode of ['Build It','Shake It','Ask GOOD TIMES']){
            await page.getByRole('tab',{name:new RegExp(mode)}).click()
            await capture(`Plan ${mode}`,'.gt-ux-planner:visible')
          }
        }
      }
    }catch{report.signed_in.state='failed';report.signed_in.reason='real_signed_in_navigation_failed'}
    finally{await context.close()}
  }
  report.signed_in.navigation_verified=report.signed_in.state!=='failed'&&report.signed_in.screens.length===22&&report.signed_in.screens.every(s=>s.visible&&s.navigation_matches===true&&s.has_content!==false&&(s.page_errors||0)===0&&(s.horizontal_overflow||0)<=1)
  report.signed_in.state=report.signed_in.navigation_verified?'navigation_verified':'failed'
}
try{
  report.release_before=(await read('/api/release')).body||null
  if(!releaseMatches(report.release_before,report.expected_sha))throw new Error('release_mismatch')
  for(let i=0;i<8;i++){
    const inventory=await read('/api/data-fast?city=atlanta&event_limit=80&venue_limit=120')
    const health=await read('/api/health')
    report.samples.push({inventory:summary(inventory),health:summary(health)})
    if(i===0&&inventory.body?.ok)await fs.writeFile(`${OUT}/public-inventory.json`,JSON.stringify(inventory.body,null,2))
    if(i<7)await sleep(10000)
  }
  report.release_after=(await read('/api/release')).body||null
  report.exact_release_verified=releaseMatches(report.release_after,report.expected_sha)
  report.live_inventory_healthy=report.samples.length===8&&report.samples.every(({inventory:i,health:h})=>i.status===200&&i.ok===true&&i.degraded===false&&i.source==='good-times-fast-customer-inventory'&&i.city==='atlanta'&&i.counts?.events>=20&&i.counts?.venues>=20&&i.uncategorized===0&&i.wrong_city===0&&i.event_age_hours!=null&&i.event_age_hours<=72&&h.status===200&&h.content_ready===true&&h.degraded===false)
  report.cdn_hit_observed=report.samples.some(s=>s.inventory.cdn==='HIT')
  browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH,args:['--no-sandbox']})
  for(const viewport of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:1000}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}})
    try{
      const page=await context.newPage();let errors=0
      page.on('pageerror',()=>errors++)
      await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
      await page.getByRole('button',{name:'Get Started',exact:true}).waitFor({state:'visible',timeout:30000})
      const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth))
      await page.screenshot({path:`${OUT}/${viewport.name}-public.png`,fullPage:false})
      report.public_screens.push({device:viewport.name,member_gate_visible:true,horizontal_overflow:overflow,page_errors:errors})
    }finally{await context.close()}
  }
  for(const scope of ['entertainment','venues']){
    const response=await read(`/api/discovery-search?scope=${scope}`)
    const payload=response.body||{}
    report[`catalog_${scope}`]={status:response.status,ok:payload.ok===true,city:payload.city,count:Array.isArray(payload.items)?payload.items.length:0,scope:payload.scope}
  }
  const sports=await read('/api/home-sports')
  report.sports={status:sports.status,ok:sports.body?.ok===true,game_count:Array.isArray(sports.body?.games)?sports.body.games.length:0,team_count:Array.isArray(sports.body?.teams)?sports.body.teams.length:0,live_scores_verified:false}
  await observeAuthorizedSession()
}catch(error){report.execution_error=String(error.message).replace(/eyJ[A-Za-z0-9_.-]+/g,'[redacted]').slice(0,150);process.exitCode=1}
finally{
  if(browser)await browser.close()
  delete process.env.GT_UI_QA_SESSION
  report.finished_at=new Date().toISOString()
  report.public_stability_verified=report.exact_release_verified===true&&report.live_inventory_healthy===true&&report.cdn_hit_observed===true&&report.public_screens.length===2&&report.public_screens.every(s=>s.page_errors===0&&s.horizontal_overflow<=1)
  // Capturing a report successfully is not full customer-journey certification.
  report.full_closeout_verified=false
  await fs.writeFile(`${OUT}/report.json`,JSON.stringify(report,null,2))
  const status=`Public stability: ${report.public_stability_verified?'PASS':'FAIL'}\nAuthorized session: ${report.signed_in.state} (${report.signed_in.reason||'server-validated'})\nSave writes and plan creation: NOT VERIFIED\nFull closeout: NOT VERIFIED\n`
  console.log(status)
  if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`## GOOD TIMES production closeout\n\n${status.replaceAll('\n','  \n')}`)
  if(!report.public_stability_verified||report.signed_in.state==='failed')process.exitCode=1
}
