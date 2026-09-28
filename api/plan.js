import {publicApiHeaders} from '../src/lib/public-api-headers.js'
/** Generates a suggested plan from public eligible content; does not reserve, purchase or persist. */
import {KHG_SUPABASE_URL,KHG_SUPABASE_ANON_KEY,GT_SUPABASE_URL,GT_SUPABASE_ANON_KEY} from '../src/lib/supabase.js'
import {browse} from './browse.js'
import {composePlan,normalizePlanInput} from '../src/features/experience/complete/planner.js'
import {shiftDate} from '../src/features/experience/complete/model.js'
export async function generatePlan(input,{fetcher=globalThis.fetch,now=Date.now(),token}={}){
 if(!token)throw new Error('Sign in to build a plan.')
 const auth=await fetcher(`${GT_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(5000)})
 if(!auth.ok||!(await auth.json())?.id)throw new Error('Sign in to build a plan.')
 const p=normalizePlanInput(input,now),params=new URLSearchParams({select:'id,city_key,name,category_key,subcategory,neighborhood,address,hero_image,booking_link,website,phone,hours,age_range,price_range,vibe_tags,status,is_verified,verification_status,quality_score,good_times_score',city_key:'eq.atlanta',status:'eq.active',is_verified:'eq.true',verification_status:'eq.verified_current',freshness_expires_at:'gt.'+new Date(now).toISOString(),quality_score:'gte.55',order:'quality_score.desc.nullslast,id.asc',limit:'150'})
 // Venue records do not contain good_times_score. The canonical venue quality is quality_score.
 params.set('select',params.get('select').replace(',good_times_score',''))
 if(p.area)params.set('neighborhood','ilike.'+p.area.replace(/[%*]/g,'').slice(0,70))
 if(p.budget)params.set('price_range','eq.'+p.budget)
 const [eventData,response]=await Promise.all([browse('/api/browse?'+new URLSearchParams({from:p.date,to:shiftDate(p.date,1),limit:'48'}),{fetcher,now}),fetcher(`${KHG_SUPABASE_URL}/rest/v1/gt_venues?${params}`,{headers:publicApiHeaders(KHG_SUPABASE_ANON_KEY),signal:AbortSignal.timeout(6500)})])
 if(!response.ok)throw new Error('Could not verify places for this plan. Retry.')
 const venues=await response.json();if(!Array.isArray(venues))throw new Error('Invalid venue response.')
 // A named anchor is fetched exactly rather than being lost beyond the recommendation page.
 let anchorItems=[];if(p.anchorId){const event=/^show:/.test(p.anchorId);anchorItems=(await browse('/api/browse?'+new URLSearchParams({kind:event?'events':'venue',id:p.anchorId.replace(/^venue:/,''),from:p.date,to:p.date}),{fetcher,now})).items}
 return composePlan(p,{events:[...anchorItems.filter(i=>i.event_key),...eventData.items],venues:[...anchorItems.filter(i=>!i.event_key),...venues],now,requestId:input.requestId&&/^[a-f0-9-]{36}$/i.test(input.requestId)?input.requestId:globalThis.crypto.randomUUID()})
}
export default async function handler(req,res){res.setHeader('Access-Control-Allow-Origin','https://localhost');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Vary','Origin');if(req.method==='OPTIONS'){res.statusCode=204;return res.end()}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');if(req.method!=='POST'){res.statusCode=405;res.setHeader('Allow','POST');return res.end(JSON.stringify({ok:false,error:'Use POST to generate a suggested plan.'}))}try{const data=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!data||JSON.stringify(data).length>6000)throw new Error('Invalid plan request.');const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const result=await generatePlan(data,{token});res.statusCode=200;res.end(JSON.stringify(result))}catch(e){const safe=/Choose|start time|Keep this plan|Invalid plan|Sign in/.test(e.message);res.statusCode=/Sign in/.test(e.message)?401:safe?400:503;res.end(JSON.stringify({ok:false,error:safe?e.message:'Could not verify a plan right now. Retry; no booking or account change was submitted.'}))}}
