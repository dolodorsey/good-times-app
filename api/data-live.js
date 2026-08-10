import {
  normalizeCity,
  clampLimit,
  dedupeCustomerVenues,
  dedupeCustomerEvents,
  inferCustomerTaxonomy,
  getEventFreshness,
} from './data.js'

const CONTENT_URL='https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY='sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const EVENT_FRESHNESS_MAX_HOURS=72
const CACHE=globalThis.__GT_DATA_LIVE_CACHE__||(globalThis.__GT_DATA_LIVE_CACHE__=new Map())

const SHOW_SELECT=[
  'id','event_name','event_type','genre','city_key','show_date','show_time','venue_name','ticket_url',
  'image_url','organizer','display_priority','good_times_score','category_key_v2','subcategory_key_v2',
  'is_featured','is_curated','updated_at',
].join(',')
const VENUE_SELECT=[
  'id','city_key','name','neighborhood','side_of_town','short_desc','hero_image','google_rating','google_reviews',
  'quality_score','price_range','vibe_tags','culture_tier','is_khg','is_culture_pick','is_black_owned','culture_tags',
  'instagram_handle','website','phone','booking_link','status','latitude','longitude','venue_category_key','venue_subcategory',
].join(',')

function headers(){return{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,Accept:'application/json'}}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function todayISO(){const d=new Date();return`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function safeImage(value){
  const text=String(value||'').trim()
  if(!text||/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text)||/maps\.gstatic\.com/i.test(text)||/[?&]key=/i.test(text))return null
  return text.startsWith('http://')?text.replace(/^http:\/\//i,'https://'):text
}
function decode(value){return String(value||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ')}

async function fetchRows(path,label){
  let lastError=null
  for(let attempt=0;attempt<2;attempt+=1){
    const controller=new AbortController()
    const timer=setTimeout(()=>controller.abort(),4500)
    try{
      const response=await fetch(`${CONTENT_URL}/rest/v1/${path}`,{headers:headers(),cache:'no-store',signal:controller.signal})
      const text=await response.text()
      if(!response.ok)throw new Error(`${label} HTTP ${response.status}: ${text.slice(0,180)}`)
      const rows=text?JSON.parse(text):[]
      if(!Array.isArray(rows))throw new Error(`${label} returned invalid data`)
      return rows
    }catch(error){
      lastError=error?.name==='AbortError'?new Error(`${label} timed out`):error
      if(attempt===0)await wait(160)
    }finally{clearTimeout(timer)}
  }
  throw lastError||new Error(`${label} failed`)
}

function eventMinutes(value){const m=String(value||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}
function nightlifePriority(item,today){
  if(item.show_date!==today)return 9
  const taxonomy=inferCustomerTaxonomy(item)
  const text=`${item.event_name||''} ${item.venue_name||''} ${item.event_type||''} ${item.genre||''}`.toLowerCase()
  const evening=eventMinutes(item.show_time)>=17*60
  const party=taxonomy.category==='nightlife'||taxonomy.category==='day_parties_brunch'||/\b(party|nightclub|club night|after party|after-party|lounge|rooftop|dj|dance|r&b|rnb|hip hop|hip-hop)\b/.test(text)
  if(party&&evening)return 0
  if(taxonomy.category==='concerts_live_music'&&evening)return 1
  if(evening)return 2
  if(party)return 3
  return 6
}
function rankEvents(rows,city,today){
  return [...rows].sort((a,b)=>{
    const date=String(a.show_date||'').localeCompare(String(b.show_date||''))
    if(date)return date
    if(city==='atlanta'&&a.show_date===today){
      const priority=nightlifePriority(a,today)-nightlifePriority(b,today)
      if(priority)return priority
      const time=eventMinutes(b.show_time)-eventMinutes(a.show_time)
      if(time)return time
    }
    return Number(b.good_times_score||0)-Number(a.good_times_score||0)||Number(a.display_priority||99)-Number(b.display_priority||99)
  })
}
function customerReadyEvent(item){
  const taxonomy=inferCustomerTaxonomy(item)
  const title=String(item.event_name||'').trim()
  const venue=String(item.venue_name||'').trim()
  if(!title||!venue||!taxonomy.category||!safeImage(item.image_url)||!item.ticket_url)return false
  if(/^(atlanta|houston|miami|dallas|charlotte|phoenix|scottsdale|las vegas|los angeles|new york|washington dc|tba|online|virtual|warehouse)$/i.test(venue))return false
  if(/\b(sold out|mon-fri 2026|make money fast|timeshare|webinar)\b/i.test(title))return false
  return true
}
function mapEvents(rows){return rows.map((item,index)=>{const taxonomy=inferCustomerTaxonomy(item);return{
  event_key:`show:${item.id}`,source_table:'gt_shows',source_id:item.id,city_key:item.city_key,
  title:decode(item.event_name),event_date:item.show_date,event_time:item.show_time,venue_name:decode(item.venue_name),
  raw_type:item.event_type,raw_category:item.genre,ticket_url:item.ticket_url,image_url:safeImage(item.image_url),organizer:decode(item.organizer),
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
  }))
  return dedupeCustomerVenues(normalized)
}
function send(response,status,payload,cache='MISS'){
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control',status===200?'public, s-maxage=60, stale-while-revalidate=600':'no-store')
  response.setHeader('X-Good-Times-Live-Gateway','v2')
  response.setHeader('X-Good-Times-Cache',cache)
  response.end(JSON.stringify(payload))
}

export default async function handler(request,response){
  if(!['GET','HEAD'].includes(request.method||'GET')){response.setHeader('Allow','GET, HEAD');return send(response,405,{ok:false,error:'Method not allowed'})}
  const url=new URL(request.url||'/api/data-live','https://thegoodtimesworldwide.com')
  const city=normalizeCity(url.searchParams.get('city'))
  const eventLimit=clampLimit(url.searchParams.get('event_limit'),120,180)
  const venueLimit=clampLimit(url.searchParams.get('venue_limit'),120,180)
  const today=todayISO()
  const eventFetchLimit=Math.min(Math.max(eventLimit*3,180),540)
  const venueFetchLimit=Math.min(Math.max(venueLimit*3,240),540)
  const eventPath=`gt_shows?select=${SHOW_SELECT}&city_key=eq.${encodeURIComponent(city)}&show_date=gte.${today}&status=in.(confirmed,tentative)&image_url=not.is.null&ticket_url=not.is.null&order=good_times_score.desc.nullslast,display_priority.asc.nullslast,show_date.asc&limit=${eventFetchLimit}`
  const venuePath=`mv_gt_venue_taxonomy_directory?select=${VENUE_SELECT}&city_key=eq.${encodeURIComponent(city)}&hero_image=not.is.null&order=quality_score.desc.nullslast,google_rating.desc.nullslast&limit=${venueFetchLimit}`
  const [eventResult,venueResult]=await Promise.allSettled([fetchRows(eventPath,'events'),fetchRows(venuePath,'venues')])
  const cacheKey=city
  if(eventResult.status==='rejected'&&venueResult.status==='rejected'){
    const stale=CACHE.get(cacheKey)
    if(stale&&Date.now()-stale.at<15*60*1000)return send(response,200,{...stale.payload,degraded:true,coverage:{...stale.payload.coverage,notice:'Live sources are refreshing; showing the most recent verified city snapshot.'}},'STALE')
    console.error('[GOOD TIMES data-live]',{city,events:eventResult.reason?.message,venues:venueResult.reason?.message})
    return send(response,503,{ok:false,connected:false,city,source:'good-times-fast-customer-inventory',generated_at:new Date().toISOString(),error:'GOOD TIMES live data is temporarily unavailable.'})
  }
  const rawEvents=eventResult.status==='fulfilled'?eventResult.value:[]
  const rawVenues=venueResult.status==='fulfilled'?venueResult.value:[]
  const freshness=eventResult.status==='fulfilled'?getEventFreshness(rawEvents,new Date()):{status:'unavailable',live:false,latest_update:null,age_hours:null}
  const readyEvents=freshness.live?rawEvents.filter(customerReadyEvent):[]
  const ranked=rankEvents(dedupeCustomerEvents(readyEvents),city,today)
  const events=mapEvents(ranked).slice(0,eventLimit)
  const venues=mapVenues(rawVenues).slice(0,venueLimit)
  const degraded=eventResult.status==='rejected'||venueResult.status==='rejected'||freshness.status==='stale'
  const payload={
    ok:true,connected:true,degraded,city,source:'good-times-fast-customer-inventory',generated_at:new Date().toISOString(),
    coverage:{events_live:freshness.live,event_status:freshness.status,event_latest_update:freshness.latest_update,event_age_hours:freshness.age_hours,event_freshness_max_hours:EVENT_FRESHNESS_MAX_HOURS,venues_live:venueResult.status==='fulfilled',notice:degraded?'One live source is refreshing; available verified inventory remains visible.':null},
    counts:{events:events.length,venues:venues.length},events,venues,
  }
  CACHE.set(cacheKey,{at:Date.now(),payload})
  if(request.method==='HEAD'){response.statusCode=200;response.setHeader('X-Good-Times-Events',String(events.length));response.setHeader('X-Good-Times-Venues',String(venues.length));response.setHeader('X-Good-Times-Degraded',String(degraded));return response.end()}
  return send(response,200,payload)
}
