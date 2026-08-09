import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const BASE=process.env.GT_UI_BASE
const SESSION_FILE=process.env.GT_UI_SESSION
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium||!SESSION_FILE||!fs.existsSync(SESSION_FILE)
  ?'set GT_UI_BASE/GT_UI_SESSION and install playwright-core to run interaction torture checks'
  :false
let browser,session
if(!skip){
  session=JSON.parse(fs.readFileSync(SESSION_FILE,'utf8'))
  if(!session.expires_at)session.expires_at=Math.floor(Date.now()/1000)+3600
  browser=process.env.GT_UI_CHROME_PATH
    ?await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
    :await chromium.launch({channel:process.env.GT_UI_CHANNEL||'chrome',headless:true})
}

async function open(width,height,mobile=false){
  const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile})
  await ctx.addInitScript(s=>{
    localStorage.setItem('gt_session',JSON.stringify(s))
    localStorage.setItem('gt_personalization',JSON.stringify({city:'atlanta',vibes:['grown'],age:'25-34'}))
    sessionStorage.setItem('gt_premium_launch','1')
    sessionStorage.setItem('gt_splash_shown','1')
  },session)
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())})
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000})
  await page.waitForSelector('.gtlive-app',{timeout:30000})
  await page.waitForTimeout(2500)
  return{ctx,page,errors}
}

async function assertOnscreen(page,selector){
  const result=await page.locator(selector).first().evaluate(el=>{
    const r=el.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,vw:innerWidth,vh:innerHeight}
  })
  assert.ok(result.left>=-2&&result.right<=result.vw+2&&result.top>=-2&&result.bottom<=result.vh+2,`${selector} escaped viewport: ${JSON.stringify(result)}`)
}

async function cycleOverlay(page,openSel,closeSel,dialogSel){
  for(let i=0;i<5;i++){
    await page.locator(openSel).click()
    await page.locator(dialogSel).waitFor({state:'visible',timeout:10000})
    await assertOnscreen(page,dialogSel)
    await page.locator(closeSel).click()
    await page.locator(dialogSel).waitFor({state:'hidden',timeout:10000})
  }
}

for(const vp of [{name:'desktop',width:1440,height:900,mobile:false},{name:'mobile',width:390,height:844,mobile:true}]){
  test(`[${vp.name}] repeated navigation, overlays and city switching stay stable`,{skip},async()=>{
    const{ctx,page,errors}=await open(vp.width,vp.height,vp.mobile)

    const nav=page.locator('.gt-five-nav button')
    const count=await nav.count()
    assert.ok(count>=5,'main navigation is incomplete')
    for(let round=0;round<3;round++){
      for(let i=0;i<count;i++){
        await nav.nth(i).click()
        await page.waitForTimeout(180)
      }
    }

    await cycleOverlay(page,'button[aria-label="Open Current, Network and Links"]','button[aria-label="Close"]','.gt-connect-sheet')
    await cycleOverlay(page,'button[aria-label="Tickets and paid experiences"]','button[aria-label="Close tickets"]','[role="dialog"][aria-label="GOOD TIMES tickets"] > section')
    await cycleOverlay(page,'button[aria-label="Open GOOD TIMES account"]','button[aria-label="Close account"]','section[aria-label="GOOD TIMES account"]')

    const city=page.locator('.gtlive-topbar select')
    if(await city.count()){
      for(let i=0;i<3;i++){
        await city.selectOption('houston');await page.waitForTimeout(450)
        await city.selectOption('atlanta');await page.waitForTimeout(450)
      }
    }

    if(vp.mobile){
      await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300)
      await assertOnscreen(page,'.gt-five-nav')
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300)
    }

    await assertOnscreen(page,'.gt-five-nav')
    await assertOnscreen(page,'.gt-connect-fab')
    await assertOnscreen(page,'button[aria-label="Tickets and paid experiences"]')
    await assertOnscreen(page,'button[aria-label="Open GOOD TIMES account"]')
    assert.deepEqual(errors,[],'browser console/page errors during repeated interactions')
    await ctx.close()
  })
}

test('interaction teardown',{skip},async()=>{await browser.close()})
