import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const CHROME=process.env.GT_UI_CHROME_PATH
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium=null
try{({chromium}=await import('playwright-core'))}catch{}
const skip=!BASE||!chromium?'set GT_UI_BASE and install playwright-core to run iPad proof':false

const viewports=[
  {name:'ipad-air-11-portrait',width:834,height:1194},
  {name:'ipad-air-11-landscape',width:1194,height:834},
  {name:'ipad-13-portrait',width:1024,height:1366},
]

for(const vp of viewports){
  test(`${vp.name} guest discovery uses the current GOOD TIMES V3 canvas`,{skip,timeout:45000},async()=>{
    fs.mkdirSync(OUT,{recursive:true})
    const browser=await chromium.launch({headless:true,executablePath:CHROME||undefined,args:['--no-sandbox']})
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(String(error?.message||error)))
    try{
      await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:20000})
      await page.waitForSelector('.gt4-app',{timeout:30000})
      await page.waitForTimeout(900)
      const geometry=await page.evaluate(()=>{
        const app=document.querySelector('.gt4-app')?.getBoundingClientRect()
        const nav=document.querySelector('.gt4-nav')?.getBoundingClientRect()
        const topbar=document.querySelector('.gt4-topbar')?.getBoundingClientRect()
        const city=document.querySelector('.gt4-city')?.getBoundingClientRect()
        const doc=document.scrollingElement||document.documentElement
        return {
          app:app&&{left:app.left,right:app.right,width:app.width},
          nav:nav&&{top:nav.top,bottom:nav.bottom,width:nav.width},
          topbar:topbar&&{top:topbar.top,bottom:topbar.bottom,width:topbar.width},
          city:city&&{top:city.top,bottom:city.bottom,width:city.width},
          legacyApp:Boolean(document.querySelector('.gt2-app')),
          legacyGuest:Boolean(document.querySelector('.gt-guest-access')),
          vw:innerWidth,vh:innerHeight,hOverflow:doc.scrollWidth-innerWidth,
          text:String(document.body.innerText||''),
        }
      })
      console.log(`[APP REVIEW ${vp.name}]`,JSON.stringify(geometry))
      await page.screenshot({path:path.join(OUT,`${vp.name}__guest.png`),fullPage:false})
      const minCanvas=vp.width<900?vp.width*.9:Math.min(1000,vp.width*.82)
      assert.ok(geometry.app?.width>=minCanvas,`app canvas ${geometry.app?.width}px is too narrow for ${vp.width}px iPad; geometry=${JSON.stringify(geometry)}`)
      assert.ok(geometry.topbar&&geometry.topbar.top>=-2&&geometry.topbar.bottom<=geometry.vh+2,`topbar is outside the iPad viewport; geometry=${JSON.stringify(geometry)}`)
      assert.ok(geometry.city&&geometry.city.top>=-2&&geometry.city.bottom<=geometry.vh+2,`city control is outside the iPad viewport; geometry=${JSON.stringify(geometry)}`)
      assert.ok(geometry.nav&&geometry.nav.top>=-2&&geometry.nav.bottom<=geometry.vh+2,`navigation is outside the iPad viewport; geometry=${JSON.stringify(geometry)}`)
      assert.ok(geometry.hOverflow<=1,`horizontal overflow ${geometry.hOverflow}px; geometry=${JSON.stringify(geometry)}`)
      assert.equal(geometry.legacyApp,false,'retired gt2 app shell must not return')
      assert.equal(geometry.legacyGuest,false,'retired floating guest auth control must not return')
      assert.match(geometry.text,/GOOD TIMES/i)
      assert.match(geometry.text,/Discover/i)
      assert.deepEqual(errors,[])
    }finally{
      await context.close();await browser.close()
    }
  })
}
