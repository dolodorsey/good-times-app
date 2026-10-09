import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {chromium} from 'playwright-core'
import {install,makeState} from './complete-upgrade-fixtures.mjs'
const BASE=process.env.GT_UI_BASE,OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts';
test('V5 guest discovery, keyboard, 200 percent reflow and accessibility scan',{skip:!BASE,timeout:90000},async()=>{
 const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true});const c=await browser.newContext({viewport:{width:390,height:844}});await install(c,makeState());await c.addInitScript(()=>localStorage.removeItem('gt_session'));const p=await c.newPage();const report=[];fs.mkdirSync(OUT,{recursive:true});
 try{await p.goto(BASE);await p.getByRole('button',{name:'Explore Atlanta as a guest'}).click();await p.locator('.gt5-app').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('gt_session')),null);for(const label of ['Home','Places','Plan','Entertainment','Profile']){await p.locator('.gt5-nav button').filter({hasText:new RegExp('^'+label+'$')}).click();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);await p.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const r=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))});report.push({screen:label,violations:r})}
 await p.locator('.gt5-nav button').filter({hasText:/^Home$/}).click();await p.setViewportSize({width:320,height:568});await p.evaluate(()=>document.documentElement.style.fontSize='200%');await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement!==document.body));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);await p.screenshot({path:OUT+'/guest-200-percent-text.png'});fs.writeFileSync(OUT+'/accessibility.json',JSON.stringify(report,null,2));const serious=report.flatMap(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>r.screen+':'+v.id));assert.deepEqual(serious,[])
 }finally{fs.writeFileSync(OUT+'/accessibility.json',JSON.stringify(report,null,2));await c.close();await browser.close()}
})
