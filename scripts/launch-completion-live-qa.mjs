import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// This canary intentionally reuses pre-existing DND QA contacts. Never use real leads.
const targets = [
  {brand:'good_times', name:'GOOD TIMES', url:'https://thegoodtimesworldwide.com/launch-updates.html', programs:['user_acquisition','business_listings']},
  {brand:'sos', name:'S.O.S.', url:'https://thesuperherosonstandby.com/launch-updates/', programs:['customer_marketing','service_providers']},
  {brand:'mission_365', name:'MISSION 365', url:'https://mission-365.vercel.app/launch-updates.html', programs:['mission_organizers','volunteers','donors','corporate_sponsors']},
];
const base='https://dzlmtvodpyhetvektfuo.supabase.co/functions/v1/app-launch-crm';
const output=path.resolve('artifacts/launch-completion');
await fs.mkdir(output,{recursive:true});
const report={started_at:new Date().toISOString(),scope:'Live browser resubmission of existing DND QA fixtures; no new customer signup or outbound send certification',brands:[],errors:[]};
const browser=await chromium.launch({headless:true});
try {
  for(const target of targets){
    const item={brand:target.brand,programs:[],screens:[],checks:[]};
    const dir=path.join(output,target.brand);await fs.mkdir(dir,{recursive:true});
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const page=await context.newPage();
    try {
      const res=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(res.status(),200,'The live signup route must return 200');
      await page.locator('form select[name="program_key"]').waitFor({timeout:15000});
      assert.equal(await page.locator('input[name="email_consent"]').isChecked(),false,'Consent cannot be prechecked');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'No mobile horizontal overflow');
      await page.screenshot({path:path.join(dir,'mobile-form.png'),fullPage:true});
      item.screens.push(target.brand+'/mobile-form.png');
      for(const program of target.programs){
        const email=`qa-${target.brand}-${program}-20260916@example.invalid`;
        await page.locator('select[name="program_key"]').selectOption(program);
        await page.locator('input[name="full_name"]').fill('LAUNCH QA - DO NOT CONTACT');
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="city"]').fill('Atlanta');
        await page.locator('input[name="postal_code"]').fill('30303');
        await page.locator('input[name="email_consent"]').uncheck();
        let receipt;
        for(let attempt=0;attempt<2;attempt++){
          const responsePromise=page.waitForResponse(r=>r.url().startsWith(base)&&r.request().method()==='POST',{timeout:25000});
          await page.locator('button[type="submit"]').click();
          const response=await responsePromise;const body=await response.json();
          assert.equal(response.status(),202,`${target.brand}/${program} accepted`);
          assert.equal(body.ok,true);assert.match(body.receipt_id,/^[0-9a-f-]{36}$/i);
          if(receipt)assert.equal(body.receipt_id,receipt,'Duplicate submission must reuse receipt');
          receipt=body.receipt_id;
          await page.waitForFunction(()=>document.querySelector('button[type="submit"]')?.disabled===false);
        }
        item.programs.push({program,receipt_id:receipt,submissions:2,email_consent:false,status:'passed'});
      }
      await page.screenshot({path:path.join(dir,'mobile-confirmation.png'),fullPage:true});
      item.screens.push(target.brand+'/mobile-confirmation.png');
      await page.setViewportSize({width:1440,height:1100});
      await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.screenshot({path:path.join(dir,'desktop-form.png'),fullPage:true});
      item.screens.push(target.brand+'/desktop-form.png');
      const negative=await page.evaluate(async({base,brand})=>{
        const r=await fetch(base+'?brand='+brand,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand_key:'wrong_brand',program_key:'user_acquisition',email_consent:false})});
        return {status:r.status,body:await r.json()};
      },{base,brand:target.brand});
      assert.equal(negative.status,400);assert.equal(negative.body.error,'brand_mismatch');
      item.checks.push('unselected_email_consent','mobile_layout','duplicate_receipt','wrong_brand_rejected');
      item.status='passed';
    } catch(error){item.status='failed';item.error=String(error.message||error);report.errors.push({brand:target.brand,error:item.error});await page.screenshot({path:path.join(dir,'failure.png'),fullPage:true}).catch(()=>{});}
    finally {await context.close();report.brands.push(item);}
  }
  const api=await browser.newContext();
  try {
    const denied=await api.request.post(base+'?brand=sos',{headers:{Origin:'https://thegoodtimesworldwide.com'},data:{brand_key:'sos',email_consent:false,program_key:'customer_marketing'}});
    assert.equal(denied.status(),403);assert.equal((await denied.json()).error,'origin_denied');
    report.cross_brand_origin='passed';
    const response=await api.request.get('https://thegoodtimesworldwide.com/api/data?city=atlanta&event_limit=180&qa=completion-v3');
    assert.equal(response.status(),200);const data=await response.json();
    assert.equal(data.ok,true);assert.equal(data.city,'atlanta');assert.equal(data.source,'good-times-fast-customer-inventory');
    assert.ok(data.events.length>0&&data.events.length<=112,'Curated feed must be nonempty and capped');
    assert.equal(new Set(data.events.map(e=>e.event_key)).size,data.events.length);
    assert.equal(data.events.some(e=>/open.?mic|webinar|timeshare|season tickets|parking pass/i.test(e.title)),false);
    report.good_times_feed={status:'passed',counts:data.counts,degraded:data.degraded,source:data.source,generated_at:data.generated_at,categories:Object.fromEntries([...new Set(data.events.map(e=>e.category_key))].map(k=>[k,data.events.filter(e=>e.category_key===k).length]))};
    await fs.writeFile(path.join(output,'good_times','public-feed.json'),JSON.stringify(data,null,2));
    const page=await api.newPage();await page.setViewportSize({width:390,height:844});
    await page.goto('https://thegoodtimesworldwide.com/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(7000);await page.screenshot({path:path.join(output,'good_times','mobile-app.png'),fullPage:true});
  } catch(error){report.errors.push({phase:'cross-brand-and-public-feed',error:String(error.message||error)});}
  finally {await api.close();}
} finally {
  await browser.close();report.finished_at=new Date().toISOString();report.ok=report.errors.length===0;
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
if(!report.ok)process.exitCode=1;
