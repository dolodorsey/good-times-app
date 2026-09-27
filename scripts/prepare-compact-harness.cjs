// One-time development preparation; excluded from final source candidate.
const fs = require('node:fs'), assert = require('node:assert/strict')
const file = 'scripts/compact-nightlife-ui.test.mjs'
let code = fs.readFileSync(file, 'utf8')
function edit(from,to){assert.equal(code.split(from).length-1,1,`Harness anchor changed: ${from}`);code=code.replace(from,to)}
edit("import test from 'node:test'", "import test, {after} from 'node:test'")
edit('fs.mkdirSync(OUT,{recursive:true})', 'fs.mkdirSync(OUT,{recursive:true})\nconst fixtureBrowsers=[]\nafter(async()=>{await Promise.allSettled(fixtureBrowsers.map(browser=>browser.close()))})')
edit(' const ctx=await browser.newContext', ' fixtureBrowsers.push(browser)\n const ctx=await browser.newContext')
edit("const page=await ctx.newPage();page.on('pageerror'", "const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror'")
// Match the service contract; never bypass or change the production health gate.
edit("if(p.startsWith('/api/'))return route.fulfill(json({ok:true,customer_ready:true", "if(p.startsWith('/api/'))return route.fulfill(json({ok:true,service:'good-times',customer_ready:true")
edit("await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000})", "await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000}).catch(async error=>{await page.screenshot({path:path.join(OUT,`${width}x${height}-boot-failure.png`)});fs.writeFileSync(path.join(OUT,`${width}x${height}-boot-failure.json`),JSON.stringify({fixture:true,errors,body:await page.locator('body').innerText()},null,2));throw error})")
fs.writeFileSync(file,code)
const component='src/features/experience/CompactTaxonomyBrowser.jsx'
fs.writeFileSync(component,fs.readFileSync(component,'utf8').replace('in this type}', 'in this type'))
console.log('Fixture health contract and browser cleanup corrected. Assertions and production guards retained.')
