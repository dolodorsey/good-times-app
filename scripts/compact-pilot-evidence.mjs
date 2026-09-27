/** Actual rendered pilot checks. Fixtures never certify live account or production behavior. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { categories, nightlife, sampleMedia, state, fixture, sleep } from './compact-pilot-fixtures.mjs'
const OUT=path.resolve(process.env.GT_COMPACT_ARTIFACTS || 'test-artifacts/compact-pilot');fs.mkdirSync(OUT,{recursive:true})
const report={kind:'rendered-browser-pilot',data:'Controlled public-listing sample with synthetic paging/category records and mocked account/map APIs. No real writes or live-account certification.',checks:[],screenshots:[],errors:[],viewports:[],sampleMedia,liveProductionVerified:false}
const check=(name,details={})=>report.checks.push({name,result:'PASS',...details})
async function server(dir,port){const proc=spawn(process.execPath,['scripts/serve-dist.mjs'],{env:{...process.env,ROOT:path.resolve(dir),PORT:String(port),GT_UI_HEALTH_FIXTURE:'healthy'},stdio:['ignore','pipe','pipe']});let logs='';proc.stdout.on('data',x=>logs+=x);proc.stderr.on('data',x=>logs+=x);for(let i=0;i<80;i++){try{if((await fetch(`http://localhost:${port}/api/health`)).ok)return proc}catch{}await sleep(100)}proc.kill();throw new Error(`Fixture server failed: ${logs}`)}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});report.screenshots.push(name+'.png')}
async function count(page,selector,n){await page.waitForFunction(({selector,n})=>document.querySelectorAll(selector).length===n,{selector,n})}
async function shell(page){await page.locator('.gt5-nav').waitFor();assert.deepEqual(await page.locator('.gt5-nav button small').allTextContents(),['Home','Discover','Plan','Saved','Profile']);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
async function density(page){return page.evaluate(()=>{const main=document.querySelector('.gt5-main').getBoundingClientRect(),cards=[...document.querySelectorAll('.gt2-venue-grid article')];return{visible:cards.filter(el=>{const r=el.getBoundingClientRect();return r.top>=main.top-1&&r.bottom<=main.bottom+1}).length,columns:new Set(cards.slice(0,4).map(el=>Math.round(el.getBoundingClientRect().left))).size,width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,cardRects:cards.slice(0,4).map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})}})}
async function nav(page,name){await page.locator('.gt5-nav').getByRole('button',{name,exact:true}).click()}
async function clubs(page,compact=true){await nav(page,'Discover');await page.locator('[data-gt-category="nightlife"]').click();await page.locator('[data-gt-subcategories="nightlife"]').getByRole('button',{name:/Clubs/}).click();await page.locator('.gt2-venue-grid h3').first().waitFor();if(compact)await page.locator('.gt-compact-result-header').scrollIntoViewIfNeeded()}
let browser,baseProc,appProc
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.GT_UI_CHROME_PATH||undefined,args:['--no-sandbox']})
 if(process.env.GT_BASELINE_DIR){
  baseProc=await server(process.env.GT_BASELINE_DIR,4181)
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'America/New_York'}),page=await context.newPage();await fixture(context,state())
   try{await page.goto('http://localhost:4181/',{waitUntil:'domcontentloaded'});await shell(page);await nav(page,'Discover');await page.locator('[data-gt-category="nightlife"]').waitFor();await shot(page,`baseline-${viewport.width}-discover`);await clubs(page,false);await shot(page,`baseline-${viewport.width}-clubs`);report.viewports.push({variant:'baseline',...(await density(page))})}
   catch(error){await shot(page,`baseline-failure-${viewport.width}`);report.errors.push({variant:'baseline',width:viewport.width,message:error.message})}
   finally{await context.close()}
  }
 }
 appProc=await server('dist',4182)
 for(const viewport of [{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:1440,height:1000},{width:320,height:800}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'America/New_York'}),page=await context.newPage(),s=state(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));await fixture(context,s)
  try{
   await page.goto('http://localhost:4182/',{waitUntil:'domcontentloaded'});await page.locator('[data-compact-pilot="preview"]').waitFor();await shell(page)
   await nav(page,'Discover');await page.locator('[data-gt-category="nightlife"]').waitFor();assert.equal(await page.locator('[data-gt-category]').count(),26);await shot(page,`candidate-${viewport.width}-discover`)
   await page.locator('[data-gt-category="nightlife"]').click();assert.deepEqual(await page.locator('[data-gt-subcategories] strong').allTextContents(),['All Nightlife',...nightlife.map(x=>x[1])]);await shot(page,`candidate-${viewport.width}-subcategories`)
   await page.locator('[data-gt-subcategory="nightclubs"]').click();await count(page,'.gt-compact-results h3',6);await page.locator('.gt-compact-result-header').scrollIntoViewIfNeeded();await shot(page,`candidate-${viewport.width}-clubs`)
   const d=await density(page);report.viewports.push({variant:'candidate',...d});assert.ok(d.overflow<=1);if(viewport.width>=360&&viewport.width<=430)assert.equal(d.columns,2);if(viewport.width===390)assert.ok(d.visible>=4,`Only ${d.visible} complete entries visible at 390px`);check(`layout, density and scoped six-row results ${viewport.width}`,d)
   const originScroll=await page.locator('.gt5-main').evaluate(el=>el.scrollTop);await page.locator('.gt-compact-card-open').first().click();await page.locator('.gt5-detail').waitFor();await shot(page,`candidate-${viewport.width}-detail`);await page.locator('.gt5-detail-back').click();assert.ok(Math.abs(await page.locator('.gt5-main').evaluate(el=>el.scrollTop)-originScroll)<3);assert.equal(await page.locator('[data-gt-subcategory="nightclubs"]').getAttribute('class'),'active');check(`detail/back retains scope and scroll ${viewport.width}`)
   if(viewport.width===390){
    const save=page.getByRole('button',{name:'Save Opium',exact:true});s.failSave=true;await save.click();await page.getByRole('status').filter({hasText:'Test save failure'}).waitFor();assert.equal(await save.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.gt5-detail').count(),0);check('failed save is not acknowledged; Save does not open detail')
    s.failSave=false;await save.click();await page.getByRole('button',{name:'Unsave Opium',exact:true}).waitFor();assert.equal(s.saved.length,1);s.failUnsave=true;await page.getByRole('button',{name:'Unsave Opium',exact:true}).click();await page.getByRole('status').filter({hasText:'Test unsave failure'}).waitFor();assert.equal(await page.getByRole('button',{name:'Unsave Opium',exact:true}).getAttribute('aria-pressed'),'true');check('failed unsave preserves saved state')
    await page.locator('.gt2-explore-toggle').getByRole('button',{name:'Map',exact:true}).click();await page.locator('.gt2-map-frame').waitFor();assert.equal(await page.locator('.gt-compact-results h3').count(),6);assert.equal(await page.getByLabel('Center map on place').locator('option').count(),4);check('Map retains loaded scope and identifies unlocated records');await shot(page,'candidate-390-map-state-test')
    await page.locator('.gt2-explore-toggle').getByRole('button',{name:'Directory',exact:true}).click();await page.locator('.gt-compact-subcategories summary').click();await page.locator('[data-gt-subcategory="after_parties"]').click();await page.getByRole('heading',{name:'No verified matches yet'}).waitFor();await shot(page,'candidate-390-empty-subcategory');check('empty subcategory is retained and reachable')
    await clubs(page);s.failDirectory=true;await page.getByRole('button',{name:'Refresh places',exact:true}).click();await page.getByRole('heading',{name:'Couldn’t load these places'}).waitFor();await shot(page,'candidate-390-load-error');assert.equal(await page.getByRole('heading',{name:'No verified matches yet'}).count(),0);s.failDirectory=false;await page.getByRole('button',{name:'Retry places',exact:true}).click();await count(page,'.gt-compact-results h3',6);check('request failure differs from empty; Retry recovers')
    s.bulk=true;await page.getByRole('button',{name:'Refresh places',exact:true}).click();await page.getByRole('button',{name:'Load more places',exact:true}).waitFor();assert.equal(await page.locator('.gt-compact-results h3').count(),24);await page.getByRole('button',{name:'Load more places',exact:true}).click();await count(page,'.gt-compact-results h3',34);check('keyset pagination appends 24 to 34 without duplicate identities')
    const search=page.getByRole('textbox',{name:'Search Atlanta places'});await search.fill('Beyond first download');await count(page,'.gt-compact-results h3',1);await page.getByRole('button',{name:'View Beyond first download',exact:true}).waitFor();check('search finds inventory beyond initial Home download');await shot(page,'candidate-390-full-corpus-search')
    await search.fill('old slow');await sleep(300);await search.fill('Revel');await page.getByRole('button',{name:'View Revel Atlanta',exact:true}).waitFor();await sleep(850);assert.deepEqual(await page.locator('.gt-compact-results h3').allTextContents(),['Revel Atlanta']);check('late earlier response cannot overwrite newer query')
    await nav(page,'Home');await nav(page,'Discover');await page.locator('[data-gt-category="nightlife"]').waitFor();assert.equal(await page.getByRole('textbox',{name:'Search Atlanta places'}).inputValue(),'');assert.equal(await page.locator('.gt-compact-results').count(),0);check('main-nav Discover reentry resets stale result state')
    s.bulk=false;for(const cat of categories.slice(1)){await page.locator(`[data-gt-category="${cat.category_key}"]`).click();assert.equal((await page.locator('[data-gt-subcategories] strong').allTextContents()).length,3);await page.locator(`[data-gt-subcategory="${cat.category_key}_sample"]`).click();await count(page,'.gt-compact-results h3',1);await page.getByRole('button',{name:'‹ All categories',exact:true}).click()};check('all 26 supplied dynamic categories preserve child/result journeys')
    await clubs(page);await page.locator('.gt-compact-card-open').first().click();await page.locator('.gt-compact-detail-quick').getByRole('button',{name:'Plan a night here ↗',exact:true}).click();await page.locator('.gt5-plan').waitFor();assert.ok((await page.locator('.gt5-plan textarea').first().inputValue()).includes('Opium'));check('venue identity reaches existing planner without reservation submission')
   }
   assert.deepEqual(errors,[]);check(`no uncaught app exceptions ${viewport.width}`)
  }catch(error){await shot(page,`failure-${viewport.width}`);report.errors.push({variant:'candidate',width:viewport.width,message:error.message,pageErrors:errors})}
  finally{await context.close()}
 }
 report.status=report.errors.length?'FAILED':'PASSED';if(report.errors.length)process.exitCode=1;console.log(JSON.stringify(report,null,2))
}catch(error){report.status='FAILED';report.errors.push({message:error.message});console.error(error);process.exitCode=1}
finally{fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));baseProc?.kill();appProc?.kill();await browser?.close()}
