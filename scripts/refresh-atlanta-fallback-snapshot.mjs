#!/usr/bin/env node
// Refreshes api/atlanta-fallback-snapshot.js from the canonical Atlanta
// live-inventory cache (gt_public_live_inventory_cache_only_v1) — the exact
// RPC the live gateway reads first. The embedded snapshot is the last-resort
// fallback when PostgREST is unavailable (PGRST002 / 57014 incident class) and
// expires after 36h (EMBEDDED_SNAPSHOT_MAX_AGE_MS in api/data-live.js).
//
// Refuses to write unless the payload is fresh, service-date matched,
// Atlanta-only, schema-compatible, and not a count collapse versus the
// currently committed snapshot. Never writes a degraded snapshot.
import {readFileSync,writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
export const SNAPSHOT_PATH=path.join(ROOT,'api','atlanta-fallback-snapshot.js')
const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR' // public publishable key, same as api/data-live.js
export const MIN_EVENTS=20
export const MIN_VENUES=50
export const MAX_COLLAPSE_RATIO=0.5
const REQUIRED_EVENT_KEYS=['id','city_key','event_name','venue_name','show_date','status']
const REQUIRED_VENUE_KEYS=['id','name','city_key']

export function serviceDateFor(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now)
  const get=t=>parts.find(p=>p.type===t)?.value
  const date=`${get('year')}-${get('month')}-${get('day')}`
  if(Number(get('hour'))>=4)return date
  const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)
}

export function parseSnapshotModule(source){
  const start=source.indexOf('{'),end=source.lastIndexOf('}')
  if(start<0||end<start)throw new Error('snapshot module has no JSON body')
  return JSON.parse(source.slice(start,end+1))
}

export function validateCacheResult(result,{serviceDate,previous}={}){
  const problems=[]
  if(!result||result.ok!==true)problems.push(`rpc not ok (${result?.reason||'no result'})`)
  if(result?.is_fresh!==true)problems.push('cache not fresh')
  if(result?.is_service_date_match!==true)problems.push('service date mismatch')
  if(serviceDate&&result?.service_date&&result.service_date!==serviceDate)problems.push(`service_date ${result.service_date} != ${serviceDate}`)
  if(result?.city!=='atlanta')problems.push(`city ${result?.city} != atlanta`)
  const events=result?.payload?.events,venues=result?.payload?.venues
  if(!Array.isArray(events)||!Array.isArray(venues)){problems.push('payload missing events/venues');return problems}
  if(events.length<MIN_EVENTS)problems.push(`events ${events.length} < ${MIN_EVENTS}`)
  if(venues.length<MIN_VENUES)problems.push(`venues ${venues.length} < ${MIN_VENUES}`)
  const wrongCity=[...events,...venues].filter(r=>r?.city_key!=='atlanta').length
  if(wrongCity)problems.push(`${wrongCity} non-Atlanta rows (P0 wrong-city)`)
  const missing=(rows,keys,label)=>{for(const k of keys)if(rows.some(r=>!(k in (r||{}))))problems.push(`${label} missing key ${k}`)}
  missing(events,REQUIRED_EVENT_KEYS,'event');missing(venues,REQUIRED_VENUE_KEYS,'venue')
  if(previous&&Array.isArray(previous.events)&&Array.isArray(previous.venues)){
    if(events.length<previous.events.length*MAX_COLLAPSE_RATIO)problems.push(`event count collapse ${previous.events.length} -> ${events.length}`)
    if(venues.length<previous.venues.length*MAX_COLLAPSE_RATIO)problems.push(`venue count collapse ${previous.venues.length} -> ${venues.length}`)
  }
  return problems
}

export function renderSnapshotModule(result){
  const snapshot={city:'atlanta',events:result.payload.events,venues:result.payload.venues,refreshed_at:result.cache_refreshed_at,service_date:result.service_date}
  return `// Auto-refreshed emergency snapshot from the canonical Atlanta live-inventory cache.
// Source: Supabase / gt_atlanta_live_inventory_cache_v1 via gt_public_live_inventory_cache_only_v1
// Refreshed by: scripts/refresh-atlanta-fallback-snapshot.mjs (.github/workflows/refresh-atlanta-fallback-snapshot.yml)
// Purpose: fail open quickly to the most recent verified Atlanta inventory when PostgREST is temporarily unavailable.
// Do not edit by hand.
export const ATLANTA_FALLBACK_SNAPSHOT = ${JSON.stringify(snapshot)}

export default ATLANTA_FALLBACK_SNAPSHOT
`
}

async function main(){
  const serviceDate=serviceDateFor()
  let previous=null
  try{previous=parseSnapshotModule(readFileSync(SNAPSHOT_PATH,'utf8'))}catch(e){console.warn('no readable previous snapshot:',e.message)}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000)
  let result
  try{
    const res=await fetch(`${CONTENT_URL}/rest/v1/rpc/gt_public_live_inventory_cache_only_v1`,{method:'POST',signal:controller.signal,
      headers:{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({p_city:'atlanta',p_service_date:serviceDate})})
    const text=await res.text()
    if(!res.ok)throw new Error(`HTTP ${res.status}: ${text.slice(0,240)}`)
    result=JSON.parse(text)
  }finally{clearTimeout(timer)}
  const problems=validateCacheResult(result,{serviceDate,previous})
  if(problems.length){console.error('REFUSING to write snapshot:\n - '+problems.join('\n - '));process.exit(2)}
  writeFileSync(SNAPSHOT_PATH,renderSnapshotModule(result))
  console.log(JSON.stringify({written:true,service_date:result.service_date,refreshed_at:result.cache_refreshed_at,events:result.payload.events.length,venues:result.payload.venues.length,previous:previous?{refreshed_at:previous.refreshed_at,events:previous.events.length,venues:previous.venues.length}:null}))
}

if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exit(1)})
