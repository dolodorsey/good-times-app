/** GOOD TIMES public catalog search. Read-only, allowlisted fields, bounded pages. */
import { inferCustomerTaxonomy } from './data.js'
import { cityClock } from './data-live.js'
const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const ALLOWED_CATEGORIES=new Set(['concerts_live_music','nightlife','comedy_performing_arts','festivals_major_activations','dining_culinary','sports_watch','day_parties_brunch','arts_museums_culture','family_kids','wellness_fitness','attractions_experiences','entertainment'])
const EVENT_FIELDS='id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,organizer,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated,updated_at,source_url,is_free'
const VENUE_FIELDS='id,name,slug,city_key,neighborhood,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,price_range,dress_code,reservation_req,hours_summary,insider_tip,status,is_verified,quality_score,hero_image,booking_link,google_rating,source_count,updated_at,verification_status,freshness_expires_at'
const CACHE=new Map()
export function parseSearch(input, now=new Date()) {
  const url=input instanceof URL?input:new URL(input,'https://thegoodtimesworldwide.com')
  const scope=url.searchParams.get('scope')==='venues'?'venues':'entertainment'
  const q=String(url.searchParams.get('q')||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim().slice(0,100)
  const page=Math.max(0,Math.min(100,parseInt(url.searchParams.get('page')||'0',10)||0))
  const category=ALLOWED_CATEGORIES.has(url.searchParams.get('category'))?url.searchParams.get('category'):''
  const today=cityClock('atlanta',now).calendarDate
  const date=/^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date')||'')&&url.searchParams.get('date')>=today?url.searchParams.get('date'):''
  return {scope,q,page,category,today,date,limit:18}
}
export function searchPath(options) {
  const {scope,q,page,category,today,date,limit}=options
  const venue=scope==='venues',params=new URLSearchParams({select:venue?VENUE_FIELDS:EVENT_FIELDS,city_key:'eq.atlanta',limit:String(limit+1),offset:String(page*limit)})
  if(venue){params.set('status','eq.active');params.set('is_verified','eq.true');params.set('verification_status','eq.verified_current');params.set('freshness_expires_at',`gt.${new Date().toISOString()}`);params.set('order','quality_score.desc.nullslast,id.asc');if(category)params.set('category_key',`eq.${category}`)}
  else{params.set('status','in.(confirmed,tentative)');params.set('show_date',date?`eq.${date}`:`gte.${today}`);params.set('order','show_date.asc,show_time.asc.nullslast,id.asc');params.set('image_url','not.is.null');if(category)params.set('category_key_v2',`eq.${category}`)}
  const fields=venue?['name','neighborhood','subcategory','short_desc']:['event_name','venue_name','genre','event_type']
  if(q){const tokens=q.split(' ').slice(0,5);params.set('and',`(${tokens.map(token=>`or(${fields.map(field=>`${field}.ilike.*${token}*`).join(',')})`).join(',')})`)}
  return `${venue?'gt_venues':'gt_shows'}?${params}`
}
function httpUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
export function mapSearchRows(rows,scope) {
  if(scope==='venues')return rows.filter(row=>row.id&&row.name&&row.is_verified).map(row=>({...row,entity_type:'venue'}))
  return rows.flatMap(row=>{const taxonomy=inferCustomerTaxonomy(row);if(!row.event_name||!row.venue_name||!taxonomy.category||!httpUrl(row.image_url)||!httpUrl(row.ticket_url))return [];return [{event_key:`show:${row.id}`,source_id:row.id,source_table:'gt_shows',entity_type:'event',city_key:'atlanta',title:row.event_name,event_date:row.show_date,event_time:row.show_time,venue_name:row.venue_name,ticket_url:row.ticket_url,image_url:row.image_url,category_key:taxonomy.category,subcategory_key:taxonomy.subcategory,organizer:row.organizer,good_times_score:row.good_times_score,updated_at:row.updated_at,source_url:row.source_url,is_free:row.is_free}]})
}
function send(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',status===200?'public, s-maxage=30, stale-while-revalidate=60':'no-store');res.end(JSON.stringify(payload))}
export default async function handler(req,res) {
  if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{ok:false,error:'Method not allowed'})}
  const options=parseSearch(req.url),key=JSON.stringify(options),cache=CACHE.get(key)
  if(cache&&Date.now()-cache.time<30000)return send(res,200,cache.value)
  try{
    const upstream=await fetch(`${CONTENT_URL}/rest/v1/${searchPath(options)}`,{headers:{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`},signal:AbortSignal.timeout(6500)})
    if(!upstream.ok)throw new Error(`catalog_upstream_${upstream.status}`)
    const rows=await upstream.json();if(!Array.isArray(rows))throw new Error('invalid_catalog_response')
    const value={ok:true,city:'atlanta',scope:options.scope,query:options.q,page:options.page,items:mapSearchRows(rows.slice(0,options.limit),options.scope),has_more:rows.length>options.limit,next_page:rows.length>options.limit?options.page+1:null,generated_at:new Date().toISOString(),search_mode:'catalog-keyword',coverage:'Eligible published records; not limited to Home inventory'}
    if(CACHE.size>=80)CACHE.delete(CACHE.keys().next().value)
    CACHE.set(key,{time:Date.now(),value});return send(res,200,value)
  }catch(error){console.warn('[GOOD TIMES catalog search]',error.message);return send(res,503,{ok:false,error:'The catalog is temporarily unavailable. Your search is preserved. Please retry.'})}
}
