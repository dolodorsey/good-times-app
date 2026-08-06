const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'

const CITY_ALIASES = {
  atlanta:'atlanta', houston:'houston', los_angeles:'los_angeles', 'los-angeles':'los_angeles',
  miami:'miami', charlotte:'charlotte', washington_dc:'washington_dc', 'washington-dc':'washington_dc',
  dallas:'dallas', new_york:'new_york', 'new-york':'new_york', phoenix:'phoenix',
  scottsdale:'scottsdale', las_vegas:'las_vegas', 'las-vegas':'las_vegas',
}
const SHOW_SELECT = [
  'id','event_name','event_type','genre','city_key','show_date','show_time','venue_name','ticket_url',
  'image_url','organizer','display_priority','good_times_score','category_key_v2','subcategory_key_v2',
  'is_featured','is_curated',
].join(',')
const VENUE_SELECT = [
  'id','name','slug','city_key','neighborhood','side_of_town','category_key','subcategory','address',
  'latitude','longitude','phone','website','instagram_handle','short_desc','vibe_tags','best_for','best_time',
  'price_range','dress_code','reservation_req','hours_summary','insider_tip','status','is_featured','is_verified',
  'quality_score','hero_image','booking_link','booking_platform','google_rating','google_reviews','culture_tier',
  'is_khg','is_culture_pick','is_black_owned','culture_score','source_count','culture_tags',
].join(',')

export function normalizeCity(value) {
  const normalized = String(value || 'atlanta').trim().toLowerCase().replace(/[\s]+/g, '_')
  return CITY_ALIASES[normalized] || 'atlanta'
}
export function clampLimit(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback
}
export function buildGatewayQueries({ city='atlanta', today, eventLimit=500, venueLimit=500 }) {
  const normalizedCity = normalizeCity(city)
  const eventFetchLimit = Math.min(Math.max(eventLimit * 4, 180), 1200)
  const venueFetchLimit = Math.min(Math.max(venueLimit * 2, 200), 1200)
  return {
    normalizedCity,
    eventPath: `gt_shows?select=${SHOW_SELECT}&city_key=eq.${encodeURIComponent(normalizedCity)}&show_date=gte.${today}&status=in.(confirmed,tentative)&image_url=not.is.null&order=good_times_score.desc.nullslast,display_priority.asc.nullslast,show_date.asc&limit=${eventFetchLimit}`,
    venuePath: `gt_venues?select=${VENUE_SELECT}&status=eq.active&city_key=eq.${encodeURIComponent(normalizedCity)}&is_verified=eq.true&hero_image=not.is.null&order=quality_score.desc.nullslast,culture_score.desc.nullslast,google_rating.desc.nullslast&limit=${venueFetchLimit}`,
  }
}
function todayISO() {
  const date = new Date()
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`
}
function headers() {
  return { apikey: CONTENT_KEY, Authorization: `Bearer ${CONTENT_KEY}`, Accept: 'application/json' }
}
function safePublicImage(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!text || /maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text) || /[?&]key=/i.test(text)) return null
  return text.startsWith('http://') ? text.replace(/^http:\/\//i, 'https://') : text
}
function cleanKey(value) { return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_') }
function normalizeName(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '') }
export function inferCustomerCategory(item) {
  const reviewed = cleanKey(item?.category_key_v2)
  if (reviewed && reviewed !== 'needs_review') return reviewed
  const text = `${item?.event_type || ''} ${item?.genre || ''} ${item?.event_name || ''}`.toLowerCase()
  if (/concert|live music|r&b|rnb|hip[- ]?hop|rap|jazz|gospel|karaoke|open mic|piano|symphony/.test(text)) return 'concerts_live_music'
  if (/festival|block party|parade|convention/.test(text)) return 'festivals_major_activations'
  if (/comedy|stand[- ]?up|theater|theatre|musical|spoken word|poetry|burlesque/.test(text)) return 'comedy_performing_arts'
  if (/\b(vs\.?|versus|game|match|boxing|ufc|mma|race|racing|sports?)\b/.test(text)) return 'sports_watch'
  if (/rave|nightlife|nightclub|club night|dj |party|after[- ]?party/.test(text)) return 'nightlife'
  if (/brunch|food|restaurant|chef|wine|cocktail|tasting|culinary/.test(text)) return 'dining_culinary'
  if (/career|business|entrepreneur|startup|technology|conference|summit|networking|expo/.test(text)) return 'business_professional'
  if (/museum|gallery|art |film|screening|exhibit/.test(text)) return 'arts_museums_culture'
  if (/wellness|fitness|yoga|pilates|run club|5k|10k/.test(text)) return 'wellness_fitness'
  if (/family|kids?|children|youth/.test(text)) return 'family_kids'
  if (/church|faith|worship|spiritual|inspirational/.test(text)) return 'faith_inspirational'
  if (/college|university|alumni|homecoming|hbcu|greek life/.test(text)) return 'college_alumni'
  if (/dating|singles?|mixer|speed dating/.test(text)) return 'dating_social'
  return null
}
function customerReadyEvent(item, verifiedVenueNames, city) {
  const title = String(item.event_name || '').trim()
  const venue = String(item.venue_name || '').trim()
  const category = inferCustomerCategory(item)
  if (!title || !category || !safePublicImage(item.image_url) || !item.ticket_url) return false
  if (!venue || /^(atlanta|houston|miami|dallas|charlotte|phoenix|scottsdale|las vegas|los angeles|new york|washington dc|tba|online|virtual|warehouse)$/i.test(venue)) return false
  if (/\b(sold out|mon-fri 2026|make money fast|timeshare|webinar)\b/i.test(title)) return false
  if (city !== 'atlanta') {
    const venueMatched = verifiedVenueNames.has(normalizeName(venue))
    const priorityCurated = Boolean(item.is_curated || item.is_featured) && Number(item.display_priority || 99) <= 20
    if (!venueMatched && !priorityCurated) return false
  }
  return true
}
function customerReadyVenue(item) {
  return Boolean(item?.id && item.name && item.is_verified && (item.address || item.website || item.phone || item.booking_link || item.instagram_handle))
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function fetchRows(path, label) {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6500)
    try {
      const response = await fetch(`${CONTENT_URL}/rest/v1/${path}`, { headers: headers(), cache:'no-store', signal:controller.signal })
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(`${label} returned HTTP ${response.status}: ${text.slice(0, 240)}`)
        if (response.status < 500) throw error
        lastError = error
      } else {
        const rows = text ? JSON.parse(text) : []
        if (!Array.isArray(rows)) throw new Error(`${label} returned an invalid payload`)
        return rows
      }
    } catch (error) {
      lastError = error?.name === 'AbortError' ? new Error(`${label} request timed out`) : error
      if (attempt === 2) throw lastError
    } finally { clearTimeout(timeout) }
    if (attempt < 2) await wait(180 * (attempt + 1))
  }
  throw lastError || new Error(`${label} failed`)
}
function mapShows(rows) {
  return rows.map((item, index) => ({
    event_key:`show:${item.id}`, source_table:'gt_shows', source_id:item.id, city_key:item.city_key,
    title:item.event_name, event_date:item.show_date, event_time:item.show_time, venue_name:item.venue_name,
    raw_type:item.event_type, raw_category:item.genre, ticket_url:item.ticket_url, image_url:safePublicImage(item.image_url),
    organizer:item.organizer, display_priority:item.display_priority, good_times_score:item.good_times_score,
    category_key:inferCustomerCategory(item), subcategory_key:item.subcategory_key_v2,
    is_featured:item.is_featured, is_curated:item.is_curated, rank_order:index + 1,
  }))
}
function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}
export default async function handler(request, response) {
  if (!['GET','HEAD'].includes(request.method || 'GET')) {
    response.setHeader('Allow', 'GET, HEAD'); return sendJson(response, 405, { ok:false, error:'Method not allowed' })
  }
  const requestUrl = new URL(request.url || '/api/data', 'https://thegoodtimesworldwide.com')
  const city = normalizeCity(requestUrl.searchParams.get('city'))
  const eventLimit = clampLimit(requestUrl.searchParams.get('event_limit'), 500, 500)
  const venueLimit = clampLimit(requestUrl.searchParams.get('venue_limit'), 500, 800)
  const generatedAt = new Date().toISOString()
  const queries = buildGatewayQueries({ city, today:todayISO(), eventLimit, venueLimit })
  try {
    const [rawEvents, rawVenues] = await Promise.all([fetchRows(queries.eventPath,'GOOD TIMES events'),fetchRows(queries.venuePath,'GOOD TIMES venues')])
    const venues = rawVenues.filter(customerReadyVenue).map(item => ({...item,hero_image:safePublicImage(item.hero_image)})).slice(0,venueLimit)
    const verifiedVenueNames = new Set(venues.map(item => normalizeName(item.name)).filter(Boolean))
    const events = mapShows(rawEvents.filter(item => customerReadyEvent(item,verifiedVenueNames,city))).slice(0,eventLimit)
    if (request.method === 'HEAD') {
      response.statusCode=200; response.setHeader('Cache-Control','no-store'); response.setHeader('X-Good-Times-Events',String(events.length)); response.setHeader('X-Good-Times-Venues',String(venues.length)); return response.end()
    }
    return sendJson(response,200,{ok:true,connected:true,city,source:'good-times-customer-ready-inventory',generated_at:generatedAt,counts:{events:events.length,venues:venues.length},events,venues})
  } catch (error) {
    console.error('[GOOD TIMES data gateway]',{city,message:error?.message||String(error),generatedAt})
    return sendJson(response,503,{ok:false,connected:false,city,source:'good-times-customer-ready-inventory',generated_at:generatedAt,error:'GOOD TIMES live data is temporarily unavailable.',detail:error?.message||String(error)})
  }
}
