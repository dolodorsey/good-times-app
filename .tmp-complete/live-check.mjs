import fs from 'node:fs'
import assert from 'node:assert/strict'
import{contentRead}from'../api/compact-content.js'
import{parseScope}from'../api/compact-event-query.js'
import{readEventPage}from'../api/discovery-events.js'
import{GT_SUPABASE_URL,GT_SUPABASE_ANON_KEY}from'../src/lib/supabase.js'
import{selectedCityClock}from'../src/features/experience/good-times-event-clock.js'
const OUT=process.env.GT_COMPLETE_EVIDENCE||'/tmp/gt-live',report={at:new Date().toISOString(),public:[],account:{status:'NOT_TESTED'},failures:[]};fs.mkdirSync(OUT,{recursive:true})
try{
 const date=selectedCityClock('atlanta',Date.now()).date,scope=parseScope(new URLSearchParams({date,limit:'24'})),t=performance.now(),a=await readEventPage(scope)
 assert.ok(Array.isArray(a.items));assert.ok(a.items.every(e=>e.city_key==='atlanta'));report.public.push({test:'live eligible event page',rows:a.items.length,milliseconds:Math.round(performance.now()-t),cursor:Boolean(a.next_cursor)})
 if(a.next_cursor){const b=await readEventPage(parseScope(new URLSearchParams({date,limit:'24',cursor:a.next_cursor})));assert.equal(new Set([...a.items,...b.items].map(e=>e.event_key)).size,a.items.length+b.items.length);report.public.push({test:'pagination identity',rows:b.items.length})}
 for(const category of ['sports_watch','concerts_live_music','nightlife']){const b=await readEventPage(parseScope(new URLSearchParams({date,category,limit:'12'})));assert.ok(b.items.every(e=>e.category_key===category));report.public.push({test:'scoped category',category,rows:b.items.length,more:Boolean(b.next_cursor)})}
 const cats=await contentRead('gt_taxonomy_categories?select=category_key&is_active=eq.true'),subs=await contentRead('gt_taxonomy_subcategories?select=category_key,subcategory_key&is_active=eq.true');report.public.push({test:'full active taxonomy',categories:cats.length,subcategories:subs.length})
 if(!process.env.GT_UI_QA_SESSION)report.account={status:'BLOCKED',reason:'Existing designated QA session secret is not configured.'}
 else{let s;try{s=JSON.parse(process.env.GT_UI_QA_SESSION)}catch{throw new Error('QA session secret is invalid JSON (contents withheld).')}
 const headers=()=>({apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'})
 let u=await fetch(`${GT_SUPABASE_URL}/auth/v1/user`,{headers:headers(),signal:AbortSignal.timeout(10000)})
 if(!u.ok)report.account={status:'BLOCKED',reason:'Designated QA session could not authenticate; no credential changed.'}
 else{const user=await u.json(),own=await fetch(`${GT_SUPABASE_URL}/rest/v1/itineraries?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`,{headers:headers(),signal:AbortSignal.timeout(10000)});assert.ok(own.ok,'QA owner read failed');const others=await fetch(`${GT_SUPABASE_URL}/rest/v1/itineraries?user_id=neq.${encodeURIComponent(user.id)}&select=id&limit=1`,{headers:headers(),signal:AbortSignal.timeout(10000)});assert.ok(others.ok);assert.deepEqual(await others.json(),[],'Cross-owner itinerary visible');report.account={status:'READ_ISOLATION_PASSED',write_test:'NOT_PERFORMED',browser:'NOT_PERFORMED'}}}
}catch(e){report.failures.push(e.message);process.exitCode=1}
fs.writeFileSync(`${OUT}/live-read-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
