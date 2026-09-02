import fs from 'node:fs'
import path from 'node:path'

const BASE=process.env.GT_UI_BASE
const CHROME=process.env.GT_UI_CHROME_PATH
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
if(!BASE)throw new Error('GT_UI_BASE is required')
const {chromium}=await import('playwright-core')

const targets=[
  {name:'iphone-6.9',width:430,height:932,scale:3,expected:[1290,2796]},
  {name:'ipad-13',width:1024,height:1366,scale:2,expected:[2048,2732]},
]

function pngSize(buffer){
  if(buffer.length<24||buffer.toString('ascii',1,4)!=='PNG')throw new Error('Expected PNG screenshot')
  return [buffer.readUInt32BE(16),buffer.readUInt32BE(20)]
}

async function capture(page,target,label){
  await page.waitForTimeout(700)
  const buffer=await page.screenshot({type:'png',fullPage:false})
  const size=pngSize(buffer)
  if(size[0]!==target.expected[0]||size[1]!==target.expected[1])throw new Error(`${target.name} ${label} produced ${size.join('x')}, expected ${target.expected.join('x')}`)
  const dir=path.join(OUT,'app-store',target.name)
  fs.mkdirSync(dir,{recursive:true})
  fs.writeFileSync(path.join(dir,`${label}.png`),buffer)
}

async function openTab(page,label){
  const button=page.locator('.gt4-nav button').filter({hasText:label}).first()
  await button.waitFor({state:'visible',timeout:10000})
  await button.click()
  await page.waitForTimeout(600)
}

const browser=await chromium.launch({headless:true,executablePath:CHROME||undefined,args:['--no-sandbox']})
try{
  for(const target of targets){
    const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:target.scale})
    const page=await context.newPage()
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000})
    await page.waitForSelector('.gt4-app',{timeout:20000})
    await page.waitForSelector('.gt4-nav',{timeout:20000})
    await page.waitForTimeout(900)
    await capture(page,target,'01-home')

    await openTab(page,'Discover')
    await capture(page,target,'02-discover')

    await openTab(page,'Radar')
    await capture(page,target,'03-radar')

    await context.close()
  }
}finally{
  await browser.close()
}

console.log('App Store screenshots captured from GOOD TIMES V3 at Apple-accepted pixel dimensions.')
