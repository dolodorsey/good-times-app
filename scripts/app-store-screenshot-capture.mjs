import { installUXCatalogFixtures } from './ux-render-fixtures.mjs'
import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const CHROME=process.env.GT_UI_CHROME_PATH
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
if(!BASE)throw new Error('GT_UI_BASE is required')
const {chromium}=await import('playwright-core')

const SESSION={access_token:'gt-app-store-fixture-access',refresh_token:'gt-app-store-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+86400,user:{id:'gt-app-store-fixture-user',email:'app.review@goodtimes.invalid'}}
const targets=[
  {name:'iphone-6.9',width:430,height:932,scale:3,expected:[1290,2796]},
  {name:'ipad-13',width:1024,height:1366,scale:2,expected:[2048,2732]},
]

function pngSize(buffer){
  if(buffer.length<24||buffer.toString('ascii',1,4)!=='PNG')throw new Error('Expected PNG screenshot')
  return [buffer.readUInt32BE(16),buffer.readUInt32BE(20)]
}
async function capture(page,target,label){
  await page.waitForTimeout(650)
  const buffer=await page.screenshot({type:'png',fullPage:false})
  const size=pngSize(buffer)
  if(size[0]!==target.expected[0]||size[1]!==target.expected[1])throw new Error(`${target.name} ${label} produced ${size.join('x')}, expected ${target.expected.join('x')}`)
  const dir=path.join(OUT,'app-store',target.name)
  fs.mkdirSync(dir,{recursive:true})
  fs.writeFileSync(path.join(dir,`${label}.png`),buffer)
}
async function openTab(page,label,selector){
  const tab=page.locator('.gt5-nav button').filter({hasText:label}).first()
  await tab.click()
  await page.waitForSelector(selector,{state:'visible',timeout:10000})
}

const browser=await chromium.launch({headless:true,executablePath:CHROME||undefined,args:['--no-sandbox']})
try{
  for(const target of targets){
    const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:target.scale})
    await context.addInitScript(session=>{localStorage.setItem('gt_session',JSON.stringify(session));localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['nightlife','grown'],age:'25-34'}));sessionStorage.setItem('gt_premium_launch','1');sessionStorage.setItem('gt_splash_shown','1')},SESSION)
    const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)})
    const events=[{event_key:'store-layout-fixture',title:'Your next good time',category_key:'concerts_live_music',city_key:'atlanta',event_date:new Date(Date.now()+86400000).toISOString().slice(0,10),event_time:'20:00',venue_name:'Layout fixture',image_url:'/venues/revel.webp',quality_score:90}]
    const venues=[{id:'store-place-fixture',name:'Atlanta place preview',city_key:'atlanta',category_key:'restaurant',hero_image:'/reference-base/atlanta-rooftop.webp',quality_score:90}]
    await context.route('**/api/**',r=>r.fulfill(json(new URL(r.request().url()).pathname==='/api/health'?{ok:true,service:'good-times',customer_ready:true,content_ready:true}:{ok:true,connected:true,city:'atlanta',events,venues})))
    await context.route('**/rest/v1/**',r=>r.fulfill(json(r.request().url().includes('gt_user_profiles')?[{id:'store-profile',auth_id:SESSION.user.id,full_name:'GOOD TIMES Member',home_city:'atlanta',last_city:'atlanta'}]:[])))
    await context.route('**/functions/v1/**',r=>r.fulfill(json({ok:true})))
    await installUXCatalogFixtures(context,events,venues)
    const page=await context.newPage()
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
    await page.waitForSelector('.gt5-app',{state:'visible',timeout:20000})
    await page.waitForSelector('.gt-ux-homehead',{state:'visible',timeout:20000})
    await capture(page,target,'01-home')

    await openTab(page,'Entertainment','.gt-ux-directory:visible')
    await capture(page,target,'02-entertainment')

    await openTab(page,'Plan','.gt-ux-planner:visible')
    await capture(page,target,'03-plan')

    await openTab(page,'Venues','.gt-ux-directory:visible')
    await capture(page,target,'04-venues')

    await openTab(page,'Profile','.gt5-profile')
    await capture(page,target,'05-profile')

    await context.close()
  }
}finally{
  await browser.close()
}

console.log('GOOD TIMES layout-only fixtures captured at configured iPhone/iPad pixel dimensions; not production account or store submission evidence.')
