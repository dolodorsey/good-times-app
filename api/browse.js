import {publicApiHeaders} from '../src/lib/public-api-headers.js'
/** Read-only, bounded customer collections. Uses the existing public RLS/content gates.
 * No ingestion, credential discovery, account writes, schedule activation or raw SQL.
 */
import {KHG_SUPABASE_URL,KHG_SUPABASE_ANON_KEY} from '../src/lib/supabase.js'
import {inferCustomerTaxonomy} from './data.js'
import {correctDisplayEvents} from '../src/features/experience/complete/taxonomy.js'
import {eventTimeFields} from './event-time-display.js'
import {selectedCityClock,dateNumber,eventIsDiscoverable} from '../src/features/experience/good-times-event-clock.js'
import {safeLink,safeImage,occurrenceUsable,shiftDate} from '../src/features/experience/complete/model.js'
const KEY=/^[A-Za-z0-9_-]{1,100}$/
const SHOW_FIELDS='id,city_key,artist_id,venue_id,event_name,event_type,genre,show_date,show_time,doors_time,venue_name,venue_address,image_url,ticket_url,ticket_price_min,ticket_price_max,is_free,is_sold_out,age_requirement,description,organizer,source,source_url,status,quality_score,good_times_score,display_priority,is_featured,is_curated,category_key_v2,subcategory_key_v2,updated_at'
const VENUE_FIELDS='id,city_key,name,neighborhood,category_key,subcategory,address,latitude,longitude,phone,website,short_desc,long_desc,hero_image,photos,booking_link,hours,hours_summary,dress_code,price_range,age_range,status,is_verified,verification_status,verified_at,freshness_expires_at,is_stock_photo,photo_credit,vibe_tags,amenity_tags,dietary_tags,is_black_owned'
const quote=s=>'"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'
const textPattern=s=>'*'+s.replace(/[\\%_*]/g,x=>'\\'+x)+'*'
const typeHints={nightlife:['nightlife'],concerts_live_music:['concert'],sports_watch:['sports'],comedy_performing_arts:['comedy','play'],festivals_major_activations:['festival'],day_parties_brunch:['brunch']}
export function browseScope(url,now=Date.now()) {
 const p=new URL(url,'https://thegoodtimesworldwide.com').searchParams,c=selectedCityClock('atlanta',now)
 if(p.has('city')&&p.get('city')!=='atlanta')throw new Error('Atlanta is the current launch city.')
 const kind=p.get('kind')||'events';if(!['events','sports','venue'].includes(kind))throw new Error('Invalid collection.')
 const category=p.get('category')||null,subcategory=p.get('subcategory')||null
 if((category&&!KEY.test(category))||(subcategory&&!KEY.test(subcategory))||(subcategory&&!category))throw new Error('Invalid category selection.')
 const from=p.get('from')||c.serviceDate,to=p.get('to')||shiftDate(c.date,180)
 if(dateNumber(from)===null||dateNumber(to)===null||to<from||dateNumber(to)-dateNumber(from)>366)throw new Error('Invalid date range.')
 const query=(p.get('query')||'').trim().slice(0,120),limit=Math.min(48,Math.max(1,Number.parseInt(p.get('limit')||'24',10)||24))
 const id=p.get('id')||null;if(id&&!/^[a-zA-Z0-9:_-]{1,160}$/.test(id))throw new Error('Invalid item identity.')
 return {kind,city:'atlanta',category,subcategory,query,from,to,limit,id,venueId:p.get('venue_id')||null}
}
function signature(s){return JSON.stringify(s)}
export function cursorRead(value,scope) {if(!value)return null;if(value.length>3000)throw new Error('Invalid cursor.');let c;try{c=JSON.parse(Buffer.from(value,'base64url').toString('utf8'))}catch{throw new Error('Invalid cursor.')}if(c.scope!==signature(scope)||!c.id||typeof c.id!=='string'||c.id.length>128||dateNumber(c.date)===null)throw new Error('Refresh this collection to continue.');return c}
const cursorWrite=(row,scope)=>Buffer.from(JSON.stringify({scope:signature(scope),id:String(row.id),date:row.show_date||row.game_date})).toString('base64url')
export function showQuery(scope,cursor,now=Date.now()) {
 const params=new URLSearchParams({select:SHOW_FIELDS,city_key:'eq.atlanta',status:'in.(confirmed,tentative)',updated_at:`gte.${new Date(now-72*3600000).toISOString()}`,order:'show_date.asc,id.asc',limit:String(scope.limit+1)})
 const clauses=[`show_date.gte.${scope.from}`,`show_date.lte.${scope.to}`]
 if(scope.id){const id=scope.id.replace(/^show:/,'');if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Invalid event identity.');params.set('id','eq.'+id)}
 if(scope.venueId){if(!/^[a-f0-9-]{36}$/i.test(scope.venueId))throw new Error('Invalid venue identity.');params.set('venue_id','eq.'+scope.venueId)}
 if(scope.query)clauses.push('or('+['event_name','venue_name','genre','description'].map(f=>`${f}.ilike.${quote(textPattern(scope.query))}`).join(',')+')')
 if(scope.category){const types=typeHints[scope.category];clauses.push(types?`or(category_key_v2.eq.${scope.category},and(category_key_v2.is.null,event_type.in.(${types.join(',')})))`:`category_key_v2.eq.${scope.category}`)}
 if(scope.subcategory)clauses.push(`subcategory_key_v2.eq.${scope.subcategory}`)
 if(cursor)clauses.push(`or(show_date.gt.${cursor.date},and(show_date.eq.${cursor.date},id.gt.${quote(cursor.id)}))`)
 params.set('and','('+clauses.join(',')+')');return params
}
export function mapShow(row,now=Date.now()) {
 const taxonomy=inferCustomerTaxonomy(row),category=row.category_key_v2&&row.category_key_v2!=='needs_review'?row.category_key_v2:taxonomy.category
 if(row.category_key_v2==='needs_review'||row.city_key!=='atlanta'||!row.event_name||!row.venue_name||row.is_sold_out||!['confirmed','tentative'].includes(row.status))return null
 if(!Number.isFinite(Date.parse(row.updated_at))||Date.parse(row.updated_at)<now-72*3600000)return null
 if(!safeLink(row.ticket_url||row.source_url))return null
 // Strong source taxonomy rules remain authoritative; do not inherit arena=concert.
 const strongest=['sports_watch','comedy_performing_arts','wellness_fitness'].includes(taxonomy.category)?taxonomy.category:category
 const event={event_key:'show:'+row.id,id:row.id,city_key:'atlanta',source_table:'gt_shows',source_id:row.id,title:row.event_name,event_date:row.show_date,...eventTimeFields(row),category_key:strongest,subcategory_key:row.subcategory_key_v2||taxonomy.subcategory,venue_id:row.venue_id,venue_name:row.venue_name,venue_address:row.venue_address,image_url:safeImage(row.image_url),ticket_url:safeLink(row.ticket_url),source_url:safeLink(row.source_url),source_name:row.source,description:row.description,organizer:row.organizer,is_free:row.is_free===true,age_requirement:row.age_requirement,is_featured:row.is_featured,is_curated:row.is_curated,quality_score:row.quality_score,good_times_score:row.good_times_score,updated_at:row.updated_at,is_verified:row.status==='confirmed'}
 const fixed=correctDisplayEvents([event])[0];return fixed.category_key&&eventIsDiscoverable(fixed,'atlanta',now)?fixed:null
}
async function rows(table,params,fetcher) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500)
 try{const response=await fetcher(`${KHG_SUPABASE_URL}/rest/v1/${table}?${params}`,{method:'GET',headers:publicApiHeaders(KHG_SUPABASE_ANON_KEY),cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('The collection could not be refreshed.');const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid collection response.');return data}finally{clearTimeout(timer)}
}
export async function browse(url,{fetcher=globalThis.fetch,now=Date.now()}={}) {
 const scope=browseScope(url,now),cursor=cursorRead(new URL(url,'https://thegoodtimesworldwide.com').searchParams.get('cursor'),scope)
 if(scope.kind==='venue') {
  if(!scope.id||!/^[a-f0-9-]{36}$/i.test(scope.id))throw new Error('Invalid venue identity.')
  const params=new URLSearchParams({select:VENUE_FIELDS,id:'eq.'+scope.id,city_key:'eq.atlanta',status:'eq.active',is_verified:'eq.true',verification_status:'eq.verified_current',freshness_expires_at:'gt.'+new Date(now).toISOString(),limit:'1'})
  return {ok:true,items:await rows('gt_venues',params,fetcher),nextCursor:null,countType:'returned',asOf:new Date(now).toISOString()}
 }
 if(scope.kind==='sports') {
  const params=new URLSearchParams({select:'id,league,home_team,home_abbr,away_team,away_abbr,game_date,game_time,venue,city_key,status,home_score,away_score,home_logo,away_logo,is_home_game,updated_at',city_key:'eq.atlanta',game_date:'gte.'+scope.from,updated_at:'gte.'+new Date(now-72*3600000).toISOString(),order:'game_date.asc,id.asc',limit:'100'})
  const data=await rows('gt_sports_games',params,fetcher)
  return {ok:true,items:data.filter(x=>x.game_date<=scope.to&&x.city_key==='atlanta'),nextCursor:null,countType:'returned',asOf:new Date(now).toISOString(),notice:'Only recently updated provider records are shown. Scores require a live provider timestamp.'}
 }
 const data=await rows('gt_shows',showQuery(scope,cursor,now),fetcher),page=data.slice(0,scope.limit),seen=new Set()
 const items=page.map(x=>mapShow(x,now)).filter(e=>{if(!e||(scope.category&&e.category_key!==scope.category)||(scope.subcategory&&e.subcategory_key!==scope.subcategory))return false;const k=[e.title.toLowerCase(),e.venue_id||e.venue_name,e.event_date,e.event_time].join('|');if(seen.has(k))return false;seen.add(k);return true})
 return {ok:true,items,nextCursor:data.length>scope.limit&&page.length?cursorWrite(page.at(-1),scope):null,countType:'returned',asOf:new Date(now).toISOString(),scope,notice:!items.length&&data.length>scope.limit?'More source records are available to check.':null}
}
export default async function handler(request,response) {
 response.setHeader('Content-Type','application/json; charset=utf-8');response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff')
 if(request.method!=='GET'){response.statusCode=405;response.setHeader('Allow','GET');return response.end(JSON.stringify({ok:false,error:'Read-only endpoint.'}))}
 try{response.statusCode=200;response.end(JSON.stringify(await browse(request.url)))}catch(error){response.statusCode=/Invalid|Select|Refresh|launch city/.test(error.message)?400:503;response.end(JSON.stringify({ok:false,error:response.statusCode===400?error.message:'Could not refresh this collection. Please retry.'}))}
}
