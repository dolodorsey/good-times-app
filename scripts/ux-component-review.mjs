#!/usr/bin/env node
/** Renders the actual integrated V4 component in an isolated, unauthenticated harness.
 * This does NOT bypass the deployed account gate, fake a user, or certify persistence.
 * Default: live public inventory. GT_UX_OFFLINE_FIXTURE=1: captured public snapshot.
 */
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright-core'
const root=process.cwd(),out=path.resolve(process.env.GT_UX_OUT||'.ux-review'),offline=process.env.GT_UX_OFFLINE_FIXTURE==='1'
fs.mkdirSync(out,{recursive:true})
const evidence={source_sha:process.env.GT_UX_SOURCE_SHA||process.env.GITHUB_SHA||'local-working-tree',captured_at:new Date().toISOString(),scope:'Actual app component; no authenticated session. Account gate unchanged. No customer writes or real bookings tested.',data_mode:offline?'captured-public-inventory-fixture':'live-public-API',screens:[],failures:[],network:[]}
const snapshotPath=path.join(root,'ux-workspace-evidence/inventory.json')
const snapshot=offline?JSON.parse(fs.readFileSync(snapshotPath,'utf8')):null
const main=fs.readFileSync('src/main.jsx','utf8')
const css=[...main.matchAll(/import\s+['"]\.\/([^'"]+\.css)['"]/g)].map(m=>`import '/src/${m[1]}'`).join('\n')
const entry=path.join(root,'scripts/.ux-review-entry.jsx'),html=path.join(root,'.ux-review.html')
fs.writeFileSync(entry,`${css}\nimport React from 'react';import{createRoot}from'react-dom/client';import App from'/src/features/experience/GoodTimesCommandAppV4.jsx';createRoot(document.getElementById('root')).render(<div className="gt-premium-experience"><App/></div>);`)
fs.writeFileSync(html,`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>GOOD TIMES — actual component review</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap"><style>html,body,#root{margin:0;height:100%;width:100%}</style></head><body><div id="root"></div><script type="module" src="/scripts/.ux-review-entry.jsx"></script></body></html>`)
const newHandlers={
 '/api/discovery-search':(await import(pathToFileURL(path.join(root,'api/discovery-search.js')))).default,
 '/api/home-sports':(await import(pathToFileURL(path.join(root,'api/home-sports.js')))).default,
}
const json=(res,code,payload)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(payload))}
const server=await createServer({root,server:{host:'127.0.0.1',port:4187,strictPort:true},plugins:[{name:'good-times-isolated-review',configureServer(s){s.middlewares.use(async(req,res,next)=>{
 if(!req.url?.startsWith('/api/'))return next()
 const url=new URL(req.url,'http://localhost')
 if(offline){
  if(url.pathname==='/api/home-sports')return json(res,200,{ok:true,games:[],teams:[],coverage:'Offline review: sports source not loaded.'})
  if(url.pathname==='/api/discovery-search'){const scope=url.searchParams.get('scope'),query=(url.searchParams.get('q')||'').toLowerCase(),rows=(scope==='venues'?snapshot.venues:snapshot.events)||[];return json(res,200,{ok:true,items:rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query)).slice(0,18),has_more:false})}
  if(url.pathname.startsWith('/api/data'))return json(res,200,snapshot)
  return json(res,200,{ok:true,items:[]})
 }
 if(newHandlers[url.pathname])return newHandlers[url.pathname](req,res)
 try{const response=await fetch(`https://thegoodtimesworldwide.com${req.url}`,{signal:AbortSignal.timeout(12000)});res.statusCode=response.status;res.setHeader('Content-Type',response.headers.get('content-type')||'application/json');res.end(await response.text());evidence.network.push({path:req.url,status:response.status})}catch(error){json(res,503,{ok:false,error:error.message})}
 })}}]})
await server.listen()
const launchOptions={headless:true};if(process.env.GT_UX_CHROMIUM)launchOptions.executablePath=process.env.GT_UX_CHROMIUM
const browser=await chromium.launch(launchOptions)
const viewports=process.env.GT_UX_QUICK==='1'?[{width:390,height:844}]:[{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:820,height:1180},{width:1440,height:1000}]
try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:viewport.width<900})
  // Guard review from account writes; no access tokens are injected.
  await context.route('**/*',route=>{const req=route.request(),url=req.url();if(req.method()!=='GET'&&/supabase\.co\/(rest|functions|auth)\//.test(url))return route.abort();return route.continue()})
  if(offline){await context.route('**/rest/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));await context.route('https://**/*',route=>route.abort())}
  const page=await context.newPage();const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message))
  await page.goto('http://127.0.0.1:4187/.ux-review.html',{waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('.gt-ux-home').waitFor({timeout:15000})
  await page.locator('.gt-ux-card').first().waitFor({timeout:25000}).catch(()=>{})
  const nav=name=>page.locator('.gt5-nav').getByRole('button',{name,exact:true}).click()
  const capture=async name=>{
   await page.waitForTimeout(700)
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]))
   const metrics=await page.evaluate(()=>{
    const app=document.querySelector('.gt5-app'),nav=document.querySelector('.gt5-nav'),main=document.querySelector('.gt5-main');const n=nav?.getBoundingClientRect(),r=app?.getBoundingClientRect();
    const failures=[],small=[];for(const el of document.querySelectorAll('.gt-ux-shell button,.gt-ux-shell input,.gt-ux-shell textarea')){const b=el.getBoundingClientRect(),cs=getComputedStyle(el);if(b.width<2||b.height<2||b.bottom<=0||b.top>=innerHeight||cs.visibility==='hidden'||el.closest('[hidden]'))continue;if(b.width<43||b.height<43)small.push({label:(el.getAttribute('aria-label')||el.textContent||'').slice(0,60),width:b.width,height:b.height})}
    if(document.documentElement.scrollWidth>innerWidth+1)failures.push('document horizontal overflow');if(!n||n.bottom>innerHeight+2||n.top<0)failures.push('navigation outside viewport');if(!r||r.width<200||r.height<300)failures.push('app frame collapsed');
    const broken=[...document.querySelectorAll('.gt-ux-shell img')].filter(img=>img.complete&&!img.naturalWidth&&!img.closest('[hidden]')).map(img=>img.getAttribute('src'))
    return{failures,small,broken,nav:{x:n?.x,y:n?.y,width:n?.width,height:n?.height},main:{scrollHeight:main?.scrollHeight,clientHeight:main?.clientHeight},account_session_present:!!localStorage.getItem('gt_session')}
   })
   const filename=`${viewport.width}-${name}.png`;await page.screenshot({path:path.join(out,filename),timeout:20000});evidence.screens.push({name,viewport,file:filename,...metrics,uncaught_errors:[...pageErrors]});for(const failure of [...metrics.failures,...pageErrors])evidence.failures.push(`${viewport.width}/${name}: ${failure}`)
  }
  await capture('home')
  await page.locator('.gt-ux-home-modes').getByRole('button',{name:'Upcoming',exact:true}).click();await capture('upcoming')
  await page.locator('.gt-ux-home-modes').getByRole('button',{name:'Sports',exact:true}).click();await page.waitForTimeout(1500);await capture('sports')
  await nav('Entertainment');await page.waitForTimeout(2000);await capture('entertainment')
  await nav('Venues');await page.waitForTimeout(2000);await capture('venues')
  await nav('Plan');await capture('plan-click')
  await page.getByRole('button',{name:'Continue',exact:false}).click();await capture('plan-details')
  await page.getByRole('tab',{name:/Shake It/}).click();await capture('plan-shake')
  await page.getByRole('button',{name:'Tap to shake',exact:true}).click();await capture('shake-result')
  await page.getByRole('tab',{name:/Ask GOOD TIMES/}).click();await capture('plan-ask')
  await nav('Profile');await capture('profile')
  await context.close()
 }
}finally{
 await browser.close();await server.close();fs.rmSync(entry,{force:true});fs.rmSync(html,{force:true})
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(evidence,null,2))
 console.log(JSON.stringify({scope:evidence.scope,data_mode:evidence.data_mode,screens:evidence.screens.length,failures:evidence.failures},null,2))
}
if(evidence.failures.length)process.exitCode=1
