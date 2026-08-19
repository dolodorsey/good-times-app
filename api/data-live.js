import {
  normalizeCity,
  clampLimit,
  dedupeCustomerVenues,
  dedupeCustomerEvents,
  inferCustomerTaxonomy,
  getEventFreshness,
} from './data.js'
import { scoreGoodTimesEvent } from './good-times-intelligence.js'

const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const EVENT_FRESHNESS_MAX_HOURS=72
const CACHE=globalThis.__GT_DATA_LIVE_CACHE__||(globalThis.__GT_DATA_LIVE_CACHE__=new Map())
const CITY_TIMEZONES=Object.freeze({
  atlanta:'America/New_York',
  charlotte:'America/New_York',
  miami:'America/New_York',
  new_york:'America/New_York',
  washington_dc:'America/New_York',
  houston:'America/Chicago',
  dallas:'America/Chicago',
  los_angeles:'America/Los_Angeles',
  las_vegas:'America/Los_Angeles',
  phoenix:'America/Phoenix',
  scottsdale:'America/Phoenix',
})

function headers(){return{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,Accept:'application/json','Content-Type':'application/json'}}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function shiftISODate(value,days){const d=new Date(`${value}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function clockPart(parts,type){return parts.find(part=>part.type===type)?.value||''}
export function cityClock(city,now=new Date()){
  const normalized=normalizeCity(city)
  const timeZone=CITY_TIMEZONES[normalized]||'America/New_York'
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now)
  const calendarDate=`${clockPart(parts,'year')}-${clockPart(parts,'month')}-${clockPart(parts,'day')}`
  const hour=Number(clockPart(parts,'hour')||0)
  const minute=Number(clockPart(parts,'minute')||0)
  const serviceDate=hour<4?shiftISODate(calendarDate,-1):calendarDate
  const serviceMinute=(hour<4?24*60:0)+(hour*60)+minute
  return{timeZone,calendarDate,serviceDate,hour,minute,serviceMinute}
}
function safeImage(value){
  const text=String(value||'').trim()
  if(!text||/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text)||/maps\.gstatic\.com/i.test(text)||/[?&]key=/i.test(text))return null
  return text.startsWith('http://')?text.replace(/^http:\/\//i,'https://'):text
}
function decode(value){return String(value||'').replace(/&amp;/gi,'&').replace(/&#8217;/gi,"'").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ')}

async function fetchInventoryRPC({city,serviceDate,eventFetchLimit,venueFetchLimit}){
  let lastError=null
  for(let attempt=0;attempt<2;attempt+=1){
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),7000)
    try{
      const response=await fetch(`${CONTENT_URL}/rest/v1/rpc/gt_public_live_inventory`,{
        method:'POST',headers:headers(),cache:'no-store',signal:controller.signal,
        body:JSON.stringify({p_city:city,p_service_date:serviceDate,p_event_limit:eventFetchLimit,p_venue_limit:venueFetchLimit}),
      })
      const text=await response.text()
      if(!response.ok)throw new Error(`inventory RPC HTTP ${response.status}: ${text.slice(0,240)}`)
      const payload=text?JSON.parse(text):null
      if(!payload||!Array.isArray(payload.events)||!Array.isArray(payload.venues))throw new Error('inventory RPC returned invalid data')
      return payload
    }catch(error){
      lastError=error?.name==='AbortError'?new Error('inventory RPC timed out'):error
      if(attempt===0)await wait(180)
    }finally{clearTimeout(timer)}
  }
  throw lastError||new Error('inventory RPC failed')
}

function eventMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}
function nightlifePriority(item,serviceDate){
  if(item.show_date!==serviceDate)return 9
  const taxonomy=inferCustomerTaxonomy(item)
  const text=`${item.event_name||''} ${item.venue_name||''} ${item.event_type||''} ${item.genre||''}`.toLowerCase()
  const evening=eventMinutes(item.show_time)>=17*60
  const party=taxonomy.category==='nightlife'||taxonomy.category==='day_parties_brunch'||/\b(party|nightclub|club night|after party|after-party|lounge|rooftop|dj|dance|r&b|rnb|hip hop|hip-hop|afrobeats|amapiano)\b/.test(text)
  if(party&&evening)return 0
  if(taxonomy.category==='concerts_live_music'&&evening)return 1
  if(evening)return 2
  if(party)return 3
  return 6
}
function intelligenceEventScore(item){
  const taxonomy=inferCustomerTaxonomy(item)
  return scoreGoodTimesEvent({
    ...item,
    title:item.event_name,
    event_date:item.show_date,
    event_time:item.show_time,
    raw_type:item.event_type,
    raw_category:item.genre,
    category_key:taxonomy.category,
    subcategory_key:taxonomy.subcategory,
    source_name:item.source,
    image_url:safeImage(item.image_url),
    is_verified:item.status==='confirmed',
  }).total
}
function rankEvents(rows,clock){
  return [...rows].sort((a,b)=>{
    const date=String(a.show_date||'').localeCompare(String(b.show_date||''))
    if(date)return date
    if(a.show_date===clock.serviceDate){
      const priority=nightlifePriority(a,clock.serviceDate)-nightlifePriority(b,clock.serviceDate)
      if(priority)return priority
      const time=eventMinutes(b.show_time)-eventMinutes(a.show_time)
      if(time)return time
    }
    return intelligenceEventScore(b)-intelligenceEventScore(a)||Number(a.display_priority||99)-Number(b.display_priority||99)
  })
}
function isStaleServiceDayEvent(item,clock){
  if(item.show_date!==clock.serviceDate)return false
  const start=eventMinutes(item.show_time)
  if(start<0)return false
  return start<clock.serviceMinute-(6*60)
}
function customerReadyEvent(item,clock){
  const taxonomy=inferCustomerTaxonomy(item)
  const title=String(item.event_name||'').trim()
  const venue=String(item.venue_name||'').trim()
  if(!title||!venue||!taxonomy.category||!safeImage(item.image_url)||!item.ticket_url||isStaleServiceDayEvent(item,clock))return false
  if(/^(atlanta|houston|miami|dallas|charlotte|phoenix|scottsdale|las vegas|los angeles|new york|washington dc|tba|tbd|online|virtual|warehouse)$/i.test(venue))return false
  if(/\b(online reserved|zoom id|virtual event|sold out|mon-fri 2026|make money fast|timeshare|webinar)\b/i.test(`${title} ${venue}`))return false
  return true
}
function mapEvents(rows){return rows.map((item,index)=>{const taxonomy=inferCustomerTaxonomy(item);return{
  event_key:`show:${item.id}`,source_table:'gt_shows',source_id:item.id,city_key:item.city_key,
  title:decode(item.event_name),event_date:item.show_date,event_time:item.show_time,venue_name:decode(item.venue_name),
  raw_type:item.event_type,raw_category:item.genre,description:decode(item.description),ticket_url:item.ticket_url,image_url:safeImage(item.image_url),organizer:decode(item.organizer),
  source_name:item.source,source_url:item.source_url,is_verified:item.status==='confirmed',quality_score:item.quality_score,freshness_tier:item.freshness_tier,updated_at:item.updated_at,
  display_priority:item.display_priority,good_times_score:item.good_times_score,category_key:taxonomy.category,subcategory_key:taxonomy.subcategory,
  is_featured:item.is_featured,is_curated:item.is_curated,rank_order:index+1,
}})}
function mapVenues(rows){
  const normalized=rows.map(row=>({
    ...row,
    is_verified:true,
    category_key:row.venue_category_key||'venue',
    subcategory:row.venue_subcategory||row.subcategory||null,
    hero_image:safeImage(row.hero_image),
  })).filter(row=>row.hero_image)
  return dedupeCustomerVenues(normalized)
}
function send(response,status,payload,cache='MISS'){
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control',status===200?'public, s-maxage=60, stale-while-revalidate=600':'no-store')
  response.setHeader('X-Good-Times-Live-Gateway','v7')
  response.setHeader('X-Good-Times-Cache',cache)
  response.end(JSON.stringify(payload))
}

export default async function handler(request,response){
  if(!['GET','HEAD'].includes(request.method||'GET')){response.setHeader('Allow','GET, HEAD');return send(response,405,{ok:false,error:'Method not allowed'})}
  const url=new URL(request.url||'/api/data-live','https://thegoodtimesworldwide.com')
  const city=normalizeCity(url.searchParams.get('city'))
  const eventLimit=clampLimit(url.searchParams.get('event_limit'),120,180)
  const venueLimit=clampLimit(url.searchParams.get('venue_limit'),120,180)
  const clock=cityClock(city)
  const eventFetchLimit=Math.min(Math.max(eventLimit*4,360),720)
  const venueFetchLimit=Math.min(Math.max(venueLimit*3,240),540)
  const cacheKey=`${city}:${clock.serviceDate}`
  let inventory
  try{
    inventory=await fetchInventoryRPC({city,serviceDate:clock.serviceDate,eventFetchLimit,venueFetchLimit})
  }catch(error){
    const stale=CACHE.get(cacheKey)
    if(stale&&Date.now()-stale.at<15*60*1000)return send(response,200,{...stale.payload,degraded:true,coverage:{...stale.payload.coverage,notice:'Live sources are refreshing; showing the most recent verified city snapshot.'}},'STALE')
    console.error('[GOOD TIMES data-live]',{city,error:error?.message})
    return send(response,503,{ok:false,connected:false,city,source:'good-times-fast-customer-inventory',generated_at:new Date().toISOString(),error:'GOOD TIMES live data is temporarily unavailable.'})
  }
  const rawEvents=inventory.events
  const rawVenues=inventory.venues
  const freshness=getEventFreshness(rawEvents,new Date())
  const readyEvents=freshness.live?rawEvents.filter(item=>customerReadyEvent(item,clock)):[]
  const ranked=rankEvents(dedupeCustomerEvents(readyEvents),clock)
  const events=mapEvents(ranked).slice(0,eventLimit)
  const venues=mapVenues(rawVenues).slice(0,venueLimit)
  const degraded=freshness.status==='stale'
  const payload={
    ok:true,connected:true,degraded,city,source:'good-times-fast-customer-inventory',generated_at:new Date().toISOString(),
    local_clock:{time_zone:clock.timeZone,calendar_date:clock.calendarDate,service_date:clock.serviceDate,hour:clock.hour,minute:clock.minute},
    coverage:{events_live:freshness.live,event_status:freshness.status,event_latest_update:freshness.latest_update,event_age_hours:freshness.age_hours,event_freshness_max_hours:EVENT_FRESHNESS_MAX_HOURS,venues_live:true,notice:degraded?'Live event freshness is outside the normal window; verified venue inventory remains visible.':null},
    counts:{events:events.length,venues:venues.length},events,venues,
  }
  CACHE.set(cacheKey,{at:Date.now(),payload})
  if(request.method==='HEAD'){response.statusCode=200;response.setHeader('X-Good-Times-Events',String(events.length));response.setHeader('X-Good-Times-Venues',String(venues.length));response.setHeader('X-Good-Times-Degraded',String(degraded));response.setHeader('X-Good-Times-Service-Date',clock.serviceDate);response.setHeader('X-Good-Times-Live-Gateway','v7');return response.end()}
  return send(response,200,payload)
}
