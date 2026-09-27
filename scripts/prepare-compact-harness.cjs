// One-time development preparation; excluded from final source candidate.
const fs = require('node:fs'), assert = require('node:assert/strict')
const file = 'scripts/compact-nightlife-ui.test.mjs'
let code = fs.readFileSync(file, 'utf8')
function edit(from,to){assert.equal(code.split(from).length-1,1,`Harness anchor changed: ${from}`);code=code.replace(from,to)}
edit("import test from 'node:test'", "import test, {after} from 'node:test'")
edit('fs.mkdirSync(OUT,{recursive:true})', 'fs.mkdirSync(OUT,{recursive:true})\nconst fixtureBrowsers=[]\nafter(async()=>{await Promise.allSettled(fixtureBrowsers.map(browser=>browser.close()))})')
edit(' const ctx=await browser.newContext', ' fixtureBrowsers.push(browser)\n const ctx=await browser.newContext')
edit("const page=await ctx.newPage();page.on('pageerror'", "const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('pageerror'")
edit("if(p.startsWith('/api/'))return route.fulfill(json({ok:true,customer_ready:true", "if(p.startsWith('/api/'))return route.fulfill(json({ok:true,service:'good-times',customer_ready:true")
edit("await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000})", "await page.locator('.gt5-app').waitFor({state:'visible',timeout:30000}).catch(async error=>{await page.screenshot({path:path.join(OUT,`${width}x${height}-boot-failure.png`)});fs.writeFileSync(path.join(OUT,`${width}x${height}-boot-failure.json`),JSON.stringify({fixture:true,errors,body:await page.locator('body').innerText()},null,2));throw error})")
edit('return {columns:getComputedStyle', "return {gridWidth:document.querySelector('.gtc-venue-grid').getBoundingClientRect().width,minCardWidth:Math.min(...cards.map(card=>card.getBoundingClientRect().width)),columns:getComputedStyle")
edit('assert.equal(metrics.columns,width<768?2:4)', "fs.writeFileSync(path.join(OUT,`${width}x${height}-geometry.json`),JSON.stringify(metrics,null,2))\n   assert.equal(metrics.columns,metrics.gridWidth>=1100?4:metrics.gridWidth>=700?3:metrics.gridWidth<=307?1:2)\n   assert.ok(metrics.minCardWidth>=150,`Card width ${metrics.minCardWidth}px is unreadable`)")
fs.writeFileSync(file,code)
const component='src/features/experience/CompactTaxonomyBrowser.jsx'
let jsx=fs.readFileSync(component,'utf8').replace('in this type}', 'in this type')
jsx=jsx.replace('{refreshed&&rows.length>0?<small>Directory refreshed {refreshed} ET</small>:null}','').replace('<h2>{heading}</h2>','<h1>{heading}</h1>')
jsx=jsx.split('\n').filter(line=>!line.includes('const refreshed=result.asOf?')).join('\n')
fs.writeFileSync(component,jsx)
const cssFile='src/features/experience/good-times-compact-pilot.css'
let css=fs.readFileSync(cssFile,'utf8')
css=css.split('\n').filter(line=>!line.startsWith('@media(')).join('\n')
css+=`
/* Available app width, not the desktop viewport, decides density. */
.gt-premium-experience .gt5-app[data-compact="true"][data-screen="discover"] .gt5-taxonomy {padding:0 16px 20px!important;margin:0!important;width:100%!important;max-width:none!important;}
.gt-premium-experience .gt5-app[data-compact="true"][data-screen="discover"] .gt5-taxonomy .gtc-explore {container-type:inline-size;container-name:gt-compact;padding:0!important;margin:0!important;width:100%!important;max-width:none!important;}
.gt-premium-experience .gt5-app[data-compact="true"][data-screen="discover"]:has(.gtc-actions) .gtc-discover-title {display:none;}
.gt-premium-experience .gt5-app[data-compact="true"] .gtc-section-heading h1 {font:600 20px/1.3 var(--gt5-sans);color:#f7f2e9;letter-spacing:-.02em;margin:0;overflow-wrap:normal;word-break:normal;}
.gt-premium-experience .gt5-app[data-compact="true"][data-screen="discover"] .gtc-venue-grid .gt5-card-action {font:600 12px/1.4 var(--gt5-sans)!important;}
.gt-premium-experience .gt5-app[data-compact="true"][data-screen="discover"] .gtc-venue-grid .gt5-card-media {aspect-ratio:1.8;}
@container gt-compact (min-width:700px){.gt-premium-experience .gt5-app[data-compact="true"] :is(.gtc-category-grid,.gtc-subcategory-grid,.gtc-venue-grid,.gtc-skeletons){grid-template-columns:repeat(3,minmax(0,1fr))!important;}}
@container gt-compact (min-width:1100px){.gt-premium-experience .gt5-app[data-compact="true"] :is(.gtc-category-grid,.gtc-subcategory-grid,.gtc-venue-grid,.gtc-skeletons){grid-template-columns:repeat(4,minmax(0,1fr))!important;}}
@container gt-compact (max-width:307px){.gt-premium-experience .gt5-app[data-compact="true"] :is(.gtc-category-grid,.gtc-subcategory-grid,.gtc-venue-grid,.gtc-skeletons){grid-template-columns:minmax(0,1fr)!important;}}
`
fs.writeFileSync(cssFile,css)
console.log('Prepared health-fixture corrections, container-responsive cards and compact drilldown. Four-complete-entry acceptance gate remains unchanged.')
