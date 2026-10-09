/** Actual browser captures with isolated synthetic inventory, never production account evidence. */
import {chromium} from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
const base=process.env.GT_UI_BASE||'http://localhost:4187',before=process.env.GT_BASELINE==='1'
const {install,makeState}=await import(before?'../../baseline-app/scripts/complete-upgrade-fixtures.mjs':'./complete-upgrade-fixtures.mjs')
const out=process.env.GT_UI_ARTIFACTS||'ui-artifacts';fs.mkdirSync(out,{recursive:true})
const sizes=[[320,568],[375,667],[390,844],[430,932],[820,1180],[1024,768],[1280,800],[1440,900]],report=[]
const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true})
for(const [width,height] of sizes){
 const context=await browser.newContext({viewport:{width,height},timezoneId:'America/New_York'});await install(context,makeState());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>{await page.waitForTimeout(100);const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,nav:[...document.querySelectorAll('.gt5-nav button')].map(e=>({name:e.innerText,rect:JSON.parse(JSON.stringify(e.getBoundingClientRect()))})),main:JSON.parse(JSON.stringify(document.querySelector('.gt5-main')?.getBoundingClientRect()))}));const file=`${width}x${height}-${name}.png`;await page.screenshot({path:path.join(out,file)});report.push({viewport:[width,height],screen:name,file,geometry,errors:[...errors]})}
 const nav=async name=>{await page.locator('.gt5-nav button').filter({hasText:new RegExp(`^${name}$`)}).click()}
 try{await page.goto(base);await page.locator('.gt5-app').waitFor();await shot('home');await page.getByRole('button',{name:'Tonight',exact:true}).click();await shot('tonight');await nav(before?'Discover':'Places');await shot('places');await nav('Entertainment');await shot('entertainment');await nav('Home');await page.getByRole('button',{name:'Sports',exact:true}).first().click();await shot('sports');await nav('Plan');await shot('plan');await page.getByRole('button',{name:/^Build It/}).click();for(let i=0;i<7;i++){await shot('build-'+(i+1));if(i<6)await page.getByRole('button',{name:'Continue →',exact:true}).click()}
 if(!before){await page.getByRole('button',{name:/^6Anything Else$/}).count().then(async n=>{if(n)await page.getByRole('button',{name:/^6Anything Else$/}).click()});await page.locator('.gtc-progress button').nth(5).click();await page.getByLabel('Everyone is 21 or older').check();await page.locator('.gtc-progress button').nth(6).click()}
 await page.getByRole('button',{name:'Build my plan',exact:true}).click();await page.locator('.gtc-itinerary').waitFor({timeout:10000});await shot('itinerary');await page.getByRole('button',{name:'Close itinerary'}).click();await page.getByRole('button',{name:'Shake',exact:true}).click();await shot('shake');await page.getByRole('button',{name:'SHAKE',exact:true}).click();await page.waitForTimeout(400);await shot('shake-result');await page.getByRole('button',{name:'Ask',exact:true}).click();await shot('ask');await page.getByRole('textbox',{name:'Ask GOOD TIMES'}).fill('Dinner and live music in Midtown for 4 people, no clubs');await page.getByRole('button',{name:'Find my options'}).click();await page.getByText('Controlled concierge test options.').waitFor();await shot('ask-result');await page.getByRole('button',{name:'← Plans',exact:true}).click();await nav('Profile');await shot('profile');await page.locator('.gt5-bell').click();await shot('radar')
 }catch(e){report.push({viewport:[width,height],error:e.message});console.error(width,e.message)}finally{await context.close()}
 fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(report,null,2))
}
await browser.close();console.log(JSON.stringify({captures:report.filter(x=>x.file).length,failures:report.filter(x=>x.error),overflows:report.filter(x=>x.geometry?.overflow>1)}));
