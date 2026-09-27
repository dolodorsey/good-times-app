import {randomUUID,createHash} from 'node:crypto'
import {contentRead,send,assertMethod,currentUser,accountRequest,readBody,uuid} from './compact-content.js'
import {parseScope} from './compact-event-query.js'
import {readEventPage} from './discovery-events.js'
import {publicDetails} from './compact-detail.js'
import {dateNumber,timeMinutes} from '../src/features/experience/good-times-event-clock.js'
import {generateSuggestedPlan,validatePlanInput,planWarnings,rankPlanVenues,hoursContain} from './compact-plan-rules.js'
const venueFields='id,name,city_key,address,neighborhood,side_of_town,category_key,subcategory,hero_image,website,booking_link,phone,hours,hours_summary,price_range,culture_score,quality_score,amenity_tags,dietary_tags,age_range,verification_status,freshness_expires_at'
async function venues(ids=[]){if(ids.some(id=>!uuid(id))||ids.length>8)throw Object.assign(new Error('Invalid place identifiers.'),{status:400});return contentRead(`gt_venues?select=${venueFields}&city_key=eq.atlanta&status=eq.active&is_verified=eq.true&verification_status=eq.verified_current&freshness_expires_at=gt.${encodeURIComponent(new Date().toISOString())}${ids.length?`&id=in.(${ids.join(',')})`:''}&order=quality_score.desc.nullslast,id.asc&limit=${ids.length||300}`)}
const invalid=message=>Object.assign(new Error(message),{status:400})
const origins=new Set(['https://thegoodtimesworldwide.com','https://www.thegoodtimesworldwide.com','https://good-times-app.vercel.app','https://localhost','capacitor://localhost','http://localhost'])
function cors(req,res){const origin=String(req.headers?.origin||'');if(origin&&!origins.has(origin)&&!/^https:\/\/good-times-[a-z0-9-]+-dr-dorseys-projects\.vercel\.app$/i.test(origin))throw Object.assign(new Error('Origin not allowed.'),{status:403});if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');}
async function eventInventory(spec,ids=[]){const page=await readEventPage(parseScope(new URLSearchParams({date:spec.date,to:spec.date,limit:'48'})));const wanted=[...new Set([...ids,spec.event?.replace(/^show:/,'')].filter(Boolean))];if(wanted.some(id=>!uuid(id)))throw invalid('Invalid event identifier.');const missing=wanted.filter(id=>!page.items.some(e=>e.event_key===`show:${id}`));const extra=missing.length?await publicDetails('event',missing):[];return [...page.items,...extra]}
export default async function handler(req,res){try{
 cors(req,res);if(req.method==='OPTIONS'){res.statusCode=204;res.end();return}if(!assertMethod(req,res,['POST']))return
 const {user,token}=await currentUser(req),body=readBody(req)
 if(!['generate','alternatives','save'].includes(body.action))throw invalid('Choose a supported planning action.')
 if(body.action==='save'){
  const plan=body.plan;if(!plan||!uuid(plan.id)||!Array.isArray(plan.stops)||plan.stops.length<1||plan.stops.length>8)throw invalid('Choose between one and eight valid stops.')
  const spec=validatePlanInput(plan.metadata?.spec||{date:plan.itinerary_date,people:plan.group_size})
  const ids=plan.stops.map(s=>String(s.id||''));if(new Set(ids).size!==ids.length||ids.some(id=>! /^(venue|show):/.test(id)||!uuid(id.split(':')[1])))throw invalid('Every stop must have a distinct valid identity.')
  const venueIds=ids.filter(id=>id.startsWith('venue:')).map(id=>id.slice(6)),eventIds=ids.filter(id=>id.startsWith('show:')).map(id=>id.slice(5))
  const allowed=venueIds.length?await venues(venueIds):[],map=new Map(rankPlanVenues(allowed,spec).map(v=>[`venue:${v.id}`,v])),events=eventIds.length?await publicDetails('event',eventIds):[],em=new Map(events.map(e=>[e.event_key,e])),stops=[]
  let prior=-1
  for(const raw of plan.stops){
   const v=map.get(raw.id),e=em.get(raw.id);if(!v&&!e)throw Object.assign(new Error('A selected stop no longer meets this plan. Recheck it before saving.'),{status:409})
   const date=v?String(raw.date||spec.date):e.event_date,time=v?String(raw.time||''):e.event_time,d=dateNumber(date),m=timeMinutes(time)
   if(d===null||m===null)throw invalid('Each stop needs a valid date and time.')
   const offset=(d-dateNumber(spec.date))*1440+m
   if(offset<spec.startMinute||offset>=spec.endMinute||offset<=prior)throw invalid('Stop times must be chronological and inside your selected window.')
   if(v&&hoursContain(v,date,m)===false)throw invalid('A selected place is closed at its proposed time.')
   prior=offset;stops.push({id:raw.id,type:v?'venue':'event',name:v?.name||e.title,venue:v?.name||e.venue_name,address:v?.address||e.venue_address,neighborhood:v?.neighborhood||null,date,time,role:String(raw.role||'Stop').slice(0,40),image_url:v?.hero_image||e.image_url,website:v?.website||null,booking_link:v?.booking_link||null,ticket_url:e?.ticket_url||null,phone:v?.phone||null,locked:Boolean(raw.locked),status:'SUGGESTED',hours_verified:v?hoursContain(v,date,m)===true:false})
  }
  const fingerprint=createHash('sha256').update(JSON.stringify({spec,stops})).digest('hex')
  const existing=await accountRequest(`itineraries?id=eq.${plan.id}&user_id=eq.${user.id}&select=*&limit=1`,token)
  if(existing?.[0]?.metadata?.content_fingerprint===fingerprint)return send(res,200,{ok:true,itinerary:existing[0]})
  if(existing?.[0]?.stops?.some(s=>['CONFIRMED','TICKETED','HELD'].includes(String(s.status).toUpperCase())))throw Object.assign(new Error('This itinerary includes booking records. Manage those bookings before replacing its stops.'),{status:409})
  const value={name:String(plan.name||'Your Atlanta plan').slice(0,100),city_id:'atlanta',itinerary_date:spec.date,stops,group_size:spec.people,status:'draft',created_by:'good_times',vibe_profile:{vibes:spec.vibes,lead:spec.lead,area:spec.area,budget:spec.budget},metadata:{source:'good-times-compact-planner-v1',spec,content_fingerprint:fingerprint,warnings:[...new Set([...planWarnings(stops),'Travel, booking availability and total prices need confirmation.'])],timing_verified:false,reservations_assumed:false},updated_at:new Date().toISOString()}
  let result
  if(existing?.length){if(!plan.updated_at||plan.updated_at!==existing[0].updated_at)throw Object.assign(new Error('This plan changed on another device. Reopen it before saving.'),{status:409});result=await accountRequest(`itineraries?id=eq.${plan.id}&user_id=eq.${user.id}&updated_at=eq.${encodeURIComponent(plan.updated_at)}`,token,{method:'PATCH',body:value});if(!result?.length)throw Object.assign(new Error('Your plan changed. Reopen it and try again.'),{status:409})}
  else result=await accountRequest('itineraries',token,{method:'POST',body:{...value,id:plan.id,user_id:user.id}})
  if(!result?.[0]?.id)throw Object.assign(new Error('Save could not be confirmed. Retry safely.'),{status:503})
  return send(res,200,{ok:true,itinerary:result[0]})
 }
 const spec=validatePlanInput(body.input||{}),v=await venues()
 if(spec.pinned&&!v.some(x=>x.id===spec.pinned))v.push(...await venues([spec.pinned]))
 if(body.action==='alternatives')return send(res,200,{ok:true,venues:rankPlanVenues(v,spec).slice(0,24)})
 const events=await eventInventory(spec),plan=generateSuggestedPlan({input:body.input,venues:v,events,id:randomUUID()})
 return send(res,200,{ok:true,itinerary:plan,events:events.slice(0,8),venues:rankPlanVenues(v,spec).slice(0,8),message:'Suggested from verified inventory. Review hours, travel and prices before booking.'})
 }catch(e){return send(res,e.status||422,{ok:false,error:e.status===503?'The planning service could not refresh. Please retry.':e.message||'Could not build the plan.'})}}
