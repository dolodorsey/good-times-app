import baseHandler, { cityClock } from './data-live.js'

const MAX_EVENTS = 120
const MAX_VENUES = 180
const STALE_TTL_MS = 10 * 60 * 1000
const cache = globalThis.__GOOD_TIMES_FAST_DATA_CACHE__ || (globalThis.__GOOD_TIMES_FAST_DATA_CACHE__ = new Map())
const ALLOWED_VIBES = new Set(['grown','turnt','date','live','food','culture','free','vip'])
const EVENT_CATEGORIES = {
  grown:new Set(['nightlife','dining_culinary','dating_social']),
  turnt:new Set(['nightlife','concerts_live_music','day_parties_brunch']),
  date:new Set(['dating_social','dining_culinary','arts_museums_culture']),
  live:new Set(['concerts_live_music']),
  food:new Set(['dining_culinary','day_parties_brunch']),
  culture:new Set(['black_culture_diaspora','arts_museums_culture','community_civic']),
  free:new Set(['free_things_to_do','community_civic']),
  vip:new Set(['vip_exclusive','nightlife']),
}
const NIGHTLIFE_VENUES=/\b(utopia restaurant|vision restaurant|vision lounge|josephine lounge|p sports bar|penthouse|revel atlanta|opium atlanta|magic city|blue flame|strokers|cheetah atlanta|soho lounge)\b/i
const NIGHTLIFE_SIGNALS=/\b(after dark|after party|after-party|sundays?|party|nightlife|nightclub|club night|lounge|rooftop|dj|dance hall|dancehall|afrobeats|amapiano|r&b|rnb|hip hop|hip-hop)\b/i
const NON_PARTY_SIGNALS=/\b(yoga|pilates|fitness|workout|workshop|class|comedy|stand-up|stand up|theater|theatre|screening|artist talk|live music show|concert|symphony|lecture|seminar)\b/i
const APPROVED_VENUE_MEDIA='/brand-graphics/good_times/graphics/LOCATION_IMAGES/'
const CATEGORY_MEDIA_BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds'
const VENUE_CATEGORY_MEDIA={
  nightclub:'gt-cat-nightlife.webp',lounge:'gt-cat-nightlife.webp',hookah:'gt-cat-nightlife.webp',bar:'gt-cat-nightlife.webp',cocktail_bar:'gt-cat-nightlife.webp',rooftop:'gt-cat-nightlife.webp',speakeasy:'gt-cat-nightlife.webp',jazz:'gt-cat-nightlife.webp',entertainment:'gt-cat-nightlife.webp',
  restaurant:'gt-cat-dining.webp',food_and_dining:'gt-cat-dining.webp',food_hall:'gt-cat-dining.webp',coffee:'gt-cat-dining.webp',wine_bar:'gt-cat-dining.webp',brunch:'event-rooftop-party.jpg',
  culture:'gt-cat-culture.webp',museum:'gt-cat-culture.webp',gallery:'gt-cat-culture.webp',comedy:'event-comedy-show.jpg',event_creative:'gt-cat-culture.webp',
  spa:'gt-cat-wellness.webp',fitness:'gt-cat-wellness.webp',gym:'gt-cat-wellness.webp',shopping:'gt-cat-shopping.webp',housing:'gt-bg-waterfront-venue.webp',outdoor_adventures:'gt-cat-adventure.webp',
}

function clamp(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}
function cityKey(value) { return String(value || 'atlanta').trim().toLowerCase().replace(/[\s-]+/g, '_') }
function parseVibes(value) {
  return [...new Set(String(value || '').split(',').map(v=>v.trim().toLowerCase()).filter(v=>ALLOWED_VIBES.has(v)))].slice(0,5)
}
function textOf(item) {
  return [item?.title,item?.name,item?.venue_name,item?.raw_type,item?.raw_category,item?.category_key,item?.subcategory_key,item?.subcategory,...(item?.vibe_tags||[])].filter(Boolean).join(' ').toLowerCase()
}
function eventMinutes(value){const match=String(value||'').match(/^(\d{1,2}):(\d{2})/);return match?Number(match[1])*60+Number(match[2]):-1}
function nightlifeSubcategory(item){
  const text=textOf(item)
  if(/\bafter party|after-party\b/.test(text))return'after_parties'
  if(/\brooftop\b/.test(text))return'rooftop_nights'
  if(/\b(sundays?|weekly)\b/.test(text))return'weekly_parties'
  if(/\b(after dark|late night)\b/.test(text))return'late_night'
  if(/\blounge\b/.test(text))return'lounges'
  return item?.subcategory_key&&String(item.subcategory_key).startsWith('night')?item.subcategory_key:'weekly_parties'
}
export function normalizeCustomerEventTaxonomy(item){
  if(!item)return item
  const text=textOf(item)
  const venue=String(item.venue_name||'')
  const rawType=String(item.raw_type||'').toLowerCase()
  const start=eventMinutes(item.event_time)
  const evening=start<0||start>=17*60
  const explicitDayParty=item.category_key==='day_parties_brunch'||/\b(day party|brunch party)\b/i.test(text)
  if(explicitDayParty&&start>=0&&start<18*60)return item
  const knownVenue=NIGHTLIFE_VENUES.test(venue)
  const partySignal=NIGHTLIFE_SIGNALS.test(text)
  const protectedNonParty=NON_PARTY_SIGNALS.test(text)&&rawType!=='nightlife'
  const recurringNightlife=(rawType==='nightlife')||(knownVenue&&evening&&partySignal&&!protectedNonParty)
  if(!recurringNightlife)return item
  return{...item,category_key:'nightlife',subcategory_key:nightlifeSubcategory(item),taxonomy_source:'customer_nightlife_override'}
}
function sameNightPriority(item,serviceDate){
  if(item?.event_date!==serviceDate)return 9
  const text=textOf(item)
  const minutes=eventMinutes(item?.event_time)
  const evening=minutes>=17*60
  const party=item?.category_key==='nightlife'||item?.category_key==='day_parties_brunch'||/\b(party|nightclub|club night|after party|after-party|lounge|rooftop|dj|dance|r&b|rnb|hip hop|hip-hop|afrobeats|amapiano)\b/.test(text)
  if(party&&evening)return 0
  if(item?.category_key==='concerts_live_music'&&evening)return 1
  if(evening)return 2
  if(party)return 3
  return 6
}
function eventScore(item,index,vibes) {
  let score = Number(item?.good_times_score || 0) * 10 - Number(item?.display_priority || 50) - index / 1000
  const text=textOf(item)
  for (const vibe of vibes) {
    if (EVENT_CATEGORIES[vibe]?.has(item?.category_key)) score += 180
    if (vibe==='grown' && /grown|r&b|soul|cocktail|lounge|rooftop/.test(text)) score += 80
    if (vibe==='turnt' && /party|club|dj|hip hop|rap|edm/.test(text)) score += 80
    if (vibe==='date' && /date|dinner|wine|art|comedy|rooftop/.test(text)) score += 80
    if (vibe==='live' && /concert|live music|jazz|r&b|rap|soul|gospel/.test(text)) score += 90
    if (vibe==='food' && /food|brunch|chef|tasting|dining/.test(text)) score += 90
    if (vibe==='culture' && /black|culture|museum|art|hbcu|diaspora/.test(text)) score += 90
    if (vibe==='free' && /free|community|market|park/.test(text)) score += 100
    if (vibe==='vip' && /vip|exclusive|premium|celebrity|table/.test(text)) score += 100
  }
  if (item?.is_curated) score += 25
  if (item?.is_featured) score += 15
  return score
}
export function hasApprovedGoodTimesVenueMedia(item){
  return String(item?.hero_image||'').includes(APPROVED_VENUE_MEDIA)
}
export function brittleVenueImage(url){
  const value=String(url||'')
  return !value||/logo|wordmark|logotype|artboard|fit=pad|bottle/i.test(value)
}
export function customerVenueMedia(item){
  if(hasApprovedGoodTimesVenueMedia(item))return item
  if(!brittleVenueImage(item?.hero_image))return item
  const key=String(item?.venue_category_key||item?.category_key||'').toLowerCase()
  const fallback=VENUE_CATEGORY_MEDIA[key]||'gt-cat-nightlife.webp'
  return{...item,hero_image:`${CATEGORY_MEDIA_BASE}/${fallback}`,image_source:'good_times_category_fallback',image_is_category_fallback:true}
}
function venueScore(item,index,vibes) {
  let score = Number(item?.quality_score || 0) * 10 + Number(item?.culture_score || 0) * 2 + Number(item?.google_rating || 0) * 20 - index / 1000
  const text=textOf(item)
  for (const vibe of vibes) {
    if (vibe==='grown' && /lounge|cocktail|rooftop|restaurant|fine dining|jazz/.test(text)) score += 170
    if (vibe==='turnt' && /nightclub|club|party|hookah|late night/.test(text)) score += 170
    if (vibe==='date' && /restaurant|rooftop|cocktail|wine|date|brunch/.test(text)) score += 170
    if (vibe==='live' && /live music|jazz|concert|music|bar/.test(text)) score += 150
    if (vibe==='food' && /restaurant|brunch|coffee|food|dining|chef/.test(text)) score += 170
    if (vibe==='culture' && (item?.is_black_owned || item?.is_culture_pick || /culture|museum|gallery|black/.test(text))) score += 190
    if (vibe==='free' && /park|market|museum|community|public/.test(text)) score += 120
    if (vibe==='vip' && (item?.is_featured || /vip|exclusive|luxury|premium|bottle/.test(text))) score += 180
  }
  if (hasApprovedGoodTimesVenueMedia(item)) score += 180
  if (item?.is_black_owned) score += 70
  if (item?.is_culture_pick) score += 60
  if (/nightclub|lounge|rooftop|hookah|late night/.test(text)) score += 45
  if (item?.booking_link) score += 18
  if (item?.is_featured) score += 15
  return score
}
function venueIdentity(item){
  return String(item?.venue_name||'location-tba').toLowerCase().replace(/\b(restaurant|and|&|the|at)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')
}
export function diversifyEventsByVenue(events){
  const groups=new Map()
  for(const item of events||[]){const date=item?.event_date||'undated';if(!groups.has(date))groups.set(date,[]);groups.get(date).push(item)}
  const output=[]
  for(const rows of groups.values()){
    const seen=new Set(),repeats=[]
    for(const item of rows){const key=venueIdentity(item);if(!seen.has(key)){seen.add(key);output.push(item)}else repeats.push(item)}
    output.push(...repeats)
  }
  return output
}
function personalizeBody(body,vibes,city) {
  if (typeof body !== 'string') return body
  try {
    const payload=JSON.parse(body)
    if (!payload?.ok || !Array.isArray(payload.events) || !Array.isArray(payload.venues)) return body
    payload.events=payload.events.map(normalizeCustomerEventTaxonomy)
    payload.venues=payload.venues.map(customerVenueMedia)
    const serviceDate=payload?.local_clock?.service_date||cityClock(city).serviceDate
    if(vibes.length){
      payload.events=[...payload.events]
        .map((item,index)=>({item,index,score:eventScore(item,index,vibes)}))
        .sort((a,b)=>{
          const date=String(a.item?.event_date||'').localeCompare(String(b.item?.event_date||''))
          if(date)return date
          if(a.item?.event_date===serviceDate){
            const urgency=sameNightPriority(a.item,serviceDate)-sameNightPriority(b.item,serviceDate)
            if(urgency)return urgency
            const time=eventMinutes(b.item?.event_time)-eventMinutes(a.item?.event_time)
            if(time)return time
          }
          return b.score-a.score||a.index-b.index
        })
        .map(({item})=>item)
      payload.venues=[...payload.venues].map((item,index)=>({item,index,score:venueScore(item,index,vibes)})).sort((a,b)=>b.score-a.score).map(({item})=>item)
      payload.personalized=true
      payload.personalization={vibes,service_date:serviceDate,ordering:'service-date-then-nightlife-then-taste'}
    }
    payload.events=diversifyEventsByVenue(payload.events)
    payload.curation={...(payload.curation||{}),venue_diversity:true,venue_media_guard:true,ordering:'date-then-one-strong-move-per-venue-before-repeats'}
    return JSON.stringify(payload)
  } catch { return body }
}
function captureResponse(response,vibes,city,onFinish) {
  const originalEnd = response.end.bind(response)
  response.end = body => {
    const status=response.statusCode || 200
    const output=status===200 ? personalizeBody(body,vibes,city) : body
    try { onFinish(status, output, response.getHeaders?.() || {}) } catch {}
    return originalEnd(output)
  }
}

export default async function handler(request, response) {
  const incoming = new URL(request.url || '/api/data-fast', 'https://thegoodtimesworldwide.com')
  const city = cityKey(incoming.searchParams.get('city'))
  const eventLimit = clamp(incoming.searchParams.get('event_limit'), 100, MAX_EVENTS)
  const venueLimit = clamp(incoming.searchParams.get('venue_limit'), 140, MAX_VENUES)
  const vibes=parseVibes(incoming.searchParams.get('vibes'))
  const clock=cityClock(city)
  const vibeKey=vibes.join(',') || 'default'
  const key = `${city}:${clock.serviceDate}:${eventLimit}:${venueLimit}:${vibeKey}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.at < 60_000 && request.method !== 'HEAD') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'private, max-age=0, s-maxage=60, stale-while-revalidate=600')
    response.setHeader('X-Good-Times-Cache', 'HIT')
    if(vibes.length)response.setHeader('X-Good-Times-Personalized','true')
    response.end(cached.body)
    return
  }

  const rewritten = new URL('/api/data-live', 'https://thegoodtimesworldwide.com')
  rewritten.searchParams.set('city', city)
  rewritten.searchParams.set('event_limit', String(eventLimit))
  rewritten.searchParams.set('venue_limit', String(venueLimit))
  request.url = `${rewritten.pathname}${rewritten.search}`

  captureResponse(response,vibes,city,(status,body)=>{
    if (status === 200 && typeof body === 'string' && body.length > 20 && request.method !== 'HEAD') {
      cache.set(key, { at: Date.now(), body })
      if(vibes.length)response.setHeader('X-Good-Times-Personalized','true')
      if (cache.size > 80) {
        const oldest = [...cache.entries()].sort((a,b) => a[1].at - b[1].at)[0]?.[0]
        if (oldest) cache.delete(oldest)
      }
    }
  })

  try {
    await baseHandler(request, response)
  } catch (error) {
    const stale = cache.get(key)
    if (stale && Date.now() - stale.at < STALE_TTL_MS && !response.headersSent && request.method !== 'HEAD') {
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'private, max-age=0, s-maxage=30, stale-while-revalidate=600')
      response.setHeader('X-Good-Times-Cache', 'STALE')
      if(vibes.length)response.setHeader('X-Good-Times-Personalized','true')
      response.end(stale.body)
      return
    }
    throw error
  }
}
