import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {install,makeState,venues,NOW} from './complete-upgrade-fixtures.mjs'

const BASE=process.env.GT_UI_BASE
const OUT=process.env.GT_UI_ARTIFACTS||'ui-artifacts'
let chromium;try{({chromium}=await import('playwright-core'))}catch{}

const uuid=i=>`${String(i).padStart(8,'0')}-bbbb-4bbb-8bbb-bbbbbbbbbbbb`
const interactiveNames=[
  'Puttshack Atlanta','Flight Club Atlanta','Cosm Atlanta','F1 Arcade Atlanta',
  'Andretti Indoor Karting','Topgolf Atlanta','Spin Art Nation Atlanta',
  'Great Big Game Show Atlanta','Sandbox VR - The Battery'
]
if(!venues.some(v=>v.name==='Puttshack Atlanta')){
  interactiveNames.forEach((name,i)=>venues.push({
    ...venues[0],
    id:uuid(800+i),
    name,
    category_key:'entertainment',
    venue_category_key:'entertainment',
    subcategory:i===0?'mini_golf':i===1?'darts_games':i===2?'immersive':i===3?'sim_racing':i===4?'karting_arcade':i===5?'golf_games':i===6?'interactive_art':i===7?'game_show':'vr',
    venue_subcategory:'Interactive',
    subcategory_key:'games_interactive',
    hero_image:i%2?'/venues/revel.webp':'/reference-base/atlanta-rooftop.webp',
    age_range:null,
    vibe_tags:['interactive','games'],
    search_tags:['interactive',name.toLowerCase()],
    hours:{periods:[{open:{day:0,time:'1000'},close:{day:1,time:'0000'}}]},
    quality_score:96-i
  }))
}

const viewports=[
  {width:390,height:844,label:'390'},
  {width:834,height:1194,label:'834'},
  {width:1440,height:900,label:'1440'},
]

function overlap(a,b){
  if(!a||!b)return false
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y
}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name),fullPage:false})}
async function navTo(page,name){
  const button=page.locator('.gt5-nav button').filter({hasText:new RegExp(`^${name}$`)})
  await button.click()
  await page.waitForTimeout(180)
}

for(const vp of viewports)test(`owner screenshot acceptance ${vp.label}`,{skip:!BASE||!chromium,timeout:120000},async()=>{
  fs.mkdirSync(OUT,{recursive:true})
  const browser=await chromium.launch({executablePath:process.env.GT_UI_CHROME_PATH,headless:true,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:vp.width,height:vp.height},timezoneId:'America/New_York'})
  const state=makeState()
  await install(context,state)
  const page=await context.newPage()
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message))
  try{
    await page.goto(BASE)
    await page.locator('.gt5-app').waitFor({timeout:15000})

    await navTo(page,'Home')
    await page.getByRole('button',{name:'Upcoming',exact:true}).click()
    await page.locator('.gtc-controls').waitFor()
    const dateBox=await page.locator('.gtc-controls label').filter({hasText:/^Date/}).boundingBox()
    const sortBox=await page.locator('.gtc-controls label').filter({hasText:/^Sort/}).boundingBox()
    assert.equal(overlap(dateBox,sortBox),false,'Date and Sort controls must never overlap')
    await shot(page,`owner-${vp.label}-upcoming-controls.png`)

    await navTo(page,'Discover')
    const placesSearch=page.getByRole('textbox',{name:'Search Atlanta places'})
    assert.equal(await placesSearch.getAttribute('placeholder'),'Place, activity or neighborhood…')
    await shot(page,`owner-${vp.label}-places.png`)

    await navTo(page,'Entertainment')
    const entertainmentSearch=page.getByRole('textbox',{name:'Search Entertainment'})
    assert.equal(await entertainmentSearch.getAttribute('placeholder'),'Clubs, concerts, sports, activities…')
    await shot(page,`owner-${vp.label}-entertainment.png`)

    await navTo(page,'Discover')
    await page.getByRole('navigation',{name:'Place shortcuts'}).getByRole('button',{name:'Nightlife',exact:true}).click()
    await page.locator('[data-gt-subcategories="nightlife"]').waitFor()
    await shot(page,`owner-${vp.label}-bars-lounges.png`)
    await page.getByRole('navigation',{name:'Place shortcuts'}).getByRole('button',{name:'Interactive',exact:true}).click()
    await page.locator('[data-gt-subcategories="entertainment"]').waitFor()
    await page.locator('[data-gt-subcategories="entertainment"] button').first().click()
    await page.locator('.gt-compact-results').waitFor()
    const interactiveText=(await page.locator('.gt-compact-results').innerText()).toLowerCase()
    for(const name of interactiveNames)assert.ok(interactiveText.includes(name.toLowerCase()),`Interactive missing ${name}`)
    await shot(page,`owner-${vp.label}-interactive-top.png`)
    await page.locator('.gt5-main').evaluate(el=>{el.scrollTop=el.scrollHeight})
    await shot(page,`owner-${vp.label}-interactive-bottom.png`)

    await navTo(page,'Plan')
    await page.getByRole('button',{name:/^Build It/}).click()
    const goodFood=page.locator('.gtc-mood-grid button').filter({hasText:'Good food'})
    if(await goodFood.count())await goodFood.click()
    await page.getByLabel('Date').waitFor()
    const formInputs=page.locator('.gtc-form input,.gtc-form select')
    for(let i=0;i<await formInputs.count();i+=1){const box=await formInputs.nth(i).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=vp.width+1,'Planner field must stay inside viewport')}
    await shot(page,`owner-${vp.label}-plan-basics.png`)
    for(let step=0;step<6;step++)await page.getByRole('button',{name:'Continue →',exact:true}).click()
    await page.getByRole('button',{name:'Build my plan',exact:true}).click()
    await page.locator('.gtc-itinerary').waitFor({timeout:15000})
    await shot(page,`owner-${vp.label}-plan-result.png`)
    await page.getByRole('button',{name:'Close itinerary'}).click()
    await page.locator('.gtc-itinerary').waitFor({state:'detached',timeout:10000})
    assert.ok(await page.locator('.gtc-planner').isVisible(),'Back from itinerary must restore Planner')
    await shot(page,`owner-${vp.label}-plan-back.png`)

    await page.getByRole('button',{name:'← Plans',exact:true}).click()
    await navTo(page,'Profile')
    await page.getByRole('button',{name:'Preferences',exact:true}).click()
    const pref=page.locator('.gtc-profile-panel')
    await pref.waitFor()
    const prefText=await pref.innerText()
    assert.match(prefText,/recorded interactions/i)
    assert.match(prefText,/separate from your explicit preferences/i)
    assert.doesNotMatch(prefText,/stage:/i)
    await shot(page,`owner-${vp.label}-profile-preferences.png`)

    if(vp.width===390){
      const launchContext=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/New_York'})
      await launchContext.addInitScript(({now,user})=>{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}};localStorage.setItem('gt_session',JSON.stringify({access_token:'owner-launch-session',expires_at:4102444800,user:{id:user}}))},{now:NOW,user:'11111111-1111-4111-8111-111111111111'})
      const launchPage=await launchContext.newPage()
      try{
        await launchPage.goto(BASE)
        await launchPage.locator('.gt-launch').waitFor({timeout:5000})
        await launchPage.waitForTimeout(500)
        await launchPage.screenshot({path:path.join(OUT,'owner-390-launch-0500ms.png')})
        await launchPage.locator('.gt-launch').waitFor({state:'detached',timeout:3000})
        assert.equal(await launchPage.locator('.gt-launch').count(),0,'Launch should complete after the protected 2-second cold-open window')
      }finally{await launchContext.close()}
    }

    assert.deepEqual(pageErrors,[])
  }finally{
    await context.close();await browser.close()
  }
})
