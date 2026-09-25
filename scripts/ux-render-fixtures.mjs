/** Deterministic catalog contracts for isolated UI tests, never production auth proof. */
import assert from 'node:assert/strict'
const json=body=>({status:200,contentType:'application/json',body:JSON.stringify(body)})
export async function installUXCatalogFixtures(context,events=[],venues=[]){
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.GT_UI_BASE).hostname),'UI fixtures must only run on a local test origin')
  await context.route('**/api/home-sports**',r=>r.fulfill(json({ok:true,city:'atlanta',games:[],teams:[{id:'hawks',name:'Atlanta Hawks',league:'NBA'}],coverage:'Isolated test fixture; not live game evidence.'})))
  await context.route('**/api/discovery-search**',r=>{const u=new URL(r.request().url()),scope=u.searchParams.get('scope'),q=(u.searchParams.get('q')||'').toLowerCase(),rows=scope==='venues'?venues:events;return r.fulfill(json({ok:true,scope,city:'atlanta',items:rows.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q)),has_more:false,next_page:null}))})
}
export const PRIMARY_LABELS=['Home','Entertainment','Plan','Venues','Profile']
export async function openUXTab(page,name){
  await page.locator('.gt5-nav').getByRole('button',{name,exact:true}).click()
  const selector={Home:'.gt-ux-home',Entertainment:'.gt-ux-directory',Venues:'.gt-ux-directory',Plan:'.gt-ux-planner',Profile:'.gt5-profile'}[name]
  await page.locator(selector+':visible').waitFor({timeout:10000})
  if(name==='Entertainment'||name==='Venues')await page.locator('.gt-ux-directory[aria-busy=false]:visible').waitFor({timeout:12000})
}
export async function assertVisibleTargets(page,selector){
 const sizes=await page.locator(selector).evaluateAll(items=>items.filter(el=>!el.closest('[hidden]')).map(el=>{const b=el.getBoundingClientRect();return{w:b.width,h:b.height,label:el.textContent}}))
 for(const size of sizes)assert.ok(size.w>=43.9&&size.h>=43.9,`Touch target below 44px: ${JSON.stringify(size)}`)
 return sizes
}
