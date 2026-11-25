import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
const root=path.resolve('test-artifacts/compact-pilot/boot-diagnostics');fs.mkdirSync(root,{recursive:true})
let index=0
const launch=chromium.launch.bind(chromium)
chromium.launch=async(...args)=>{
 const browser=await launch(...args),newContext=browser.newContext.bind(browser)
 browser.newContext=async(...opts)=>{
  const context=await newContext(...opts),newPage=context.newPage.bind(context)
  context.newPage=async(...opts)=>{
   const page=await newPage(...opts),id=++index,log=[]
   const flush=()=>fs.writeFileSync(path.join(root,`${id}.json`),JSON.stringify({url:page.url(),log},null,2))
   page.on('pageerror',e=>{log.push({kind:'pageerror',message:e.message,stack:e.stack});flush()})
   page.on('console',m=>{if(['error','warning'].includes(m.type())){log.push({kind:m.type(),message:m.text()});flush()}})
   page.on('domcontentloaded',()=>{setTimeout(async()=>{try{await page.screenshot({path:path.join(root,`${id}-boot.png`)});fs.writeFileSync(path.join(root,`${id}-body.txt`),await page.locator('body').innerText());flush()}catch{}},2000).unref()})
   return page
  }
  return context
 }
 return browser
}
