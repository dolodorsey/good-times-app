const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const EVENT_FRESHNESS_MAX_HOURS = 72

const CITY_ALIASES = {
  atlanta:'atlanta', houston:'houston', los_angeles:'los_angeles', 'los-angeles':'los_angeles',
  miami:'miami', charlotte:'charlotte', washington_dc:'washington_dc', 'washington-dc':'washington_dc',
  dallas:'dallas', new_york:'new_york', 'new-york':'new_york', phoenix:'phoenix',
  scottsdale:'scottsdale', las_vegas:'las_vegas', 'las-vegas':'las_vegas',
}
const SHOW_SELECT = [
  'id','event_name','event_type','genre','city_key','show_date','show_time','venue_name','ticket_url',
  'image_url','organizer','display_priority','good_times_score','category_key_v2','subcategory_key_v2',
  'is_featured','is_curated','updated_at',
].join(',')
const VENUE_SELECT = [
  'id','name','slug','city_key','neighborhood','side_of_town','category_key','subcategory','address',
  'latitude','longitude','phone','website','instagram_handle','short_desc','vibe_tags','best_for','best_time',
  'price_range','dress_code','reservation_req','hours_summary','insider_tip','status','is_featured','is_verified',
  'quality_score','hero_image','booking_link','booking_platform','google_rating','google_reviews','culture_tier',
  'is_khg','is_culture_pick','is_black_owned','culture_score','source_count','culture_tags',
].join(',')
const MUSIC_SUBCATEGORIES = new Set([
  'rnb_soul','hip_hop_rap','jazz','edm_dance','country','gospel','karaoke','open_mic',
  'arena_concerts','theater_concerts','intimate_shows','live_music','acoustic','concerts',
])

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
  const venueFetchLimit = Math.min(Math.max(venueLimit * 3, 240), 1600)
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
function normalizeText(value) { return String(value || '').toLowerCase().replace(/&[a-z0-9#]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim() }
function compact(value) { return normalizeText(value).replace(/\s+/g, '') }
function normalizeVenueName(value) { return compact(String(value || '').replace(/\b(venue|event)\s*$/i, '')) }
function normalizeAddress(value) {
  return compact(String(value || '')
    .replace(/\b(street|st\.)\b/gi,'st').replace(/\b(road|rd\.)\b/gi,'rd')
    .replace(/\b(avenue|ave\.)\b/gi,'ave').replace(/\b(boulevard|blvd\.)\b/gi,'blvd')
    .replace(/\b(northwest|nw\.)\b/gi,'nw').replace(/\b(northeast|ne\.)\b/gi,'ne')
    .replace(/\b(southwest|sw\.)\b/gi,'sw').replace(/\b(southeast|se\.)\b/gi,'se'))
}
function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ')
}
function venueCanonicalKey(item) {
  const name = normalizeVenueName(item?.name)
  const address = normalizeAddress(item?.address)
  if (name && address && !/^variousaccesspoints$/i.test(address)) return `${name}|${address}`
  return `id:${item?.id || Math.random()}`
}
function venueRecordScore(item) {
  return Number(item?.quality_score || 0) * 10
    + (item?.address ? 25 : 0) + (item?.latitude != null && item?.longitude != null ? 24 : 0)
    + (item?.website ? 18 : 0) + (item?.phone ? 14 : 0) + (item?.booking_link ? 12 : 0)
    + Number(item?.source_count || 0) * 2 + (item?.is_culture_pick ? 8 : 0) + (item?.is_featured ? 4 : 0)
}
export function dedupeCustomerVenues(rows) {
  const best = new Map()
  for (const item of rows || []) {
    if (!customerReadyVenue(item)) continue
    const key = venueCanonicalKey(item)
    const existing = best.get(key)
    if (!existing || venueRecordScore(item) > venueRecordScore(existing)) best.set(key, item)
  }
  return [...best.values()].sort((a,b) => venueRecordScore(b) - venueRecordScore(a))
}
function inferMusicSubcategory(text, fallback, genre) {
  if (/\br&b\b|\brnb\b|\bsoul\b/.test(text)) return 'rnb_soul'
  if (/hip hop|hip-hop|\brap\b/.test(text)) return 'hip_hop_rap'
  if (/\bjazz\b|\bblues\b/.test(text)) return 'jazz'
  if (/edm|techno|house music|electronic|dubstep/.test(text)) return 'edm_dance'
  if (cleanKey(genre) === 'country' || /country music|country singer|country artist|country concert/.test(text)) return 'country'
  if (/\bgospel\b/.test(text)) return 'gospel'
  if (/karaoke/.test(text)) return 'karaoke'
  if (/open mic/.test(text)) return 'open_mic'
  if (/\barena\b|\bstadium\b|gateway center|state farm|mercedes[- ]benz/.test(text)) return 'arena_concerts'
  if (/\btheatre\b|\btheater\b|symphony hall|cobb energy/.test(text)) return 'theater_concerts'
  return fallback && MUSIC_SUBCATEGORIES.has(fallback) ? fallback : 'intimate_shows'
}
function hasSportsSignal(text) {
  return /\b(sport|sports|game|match|matchup|football|basketball|baseball|soccer|hockey|wnba|nba|nfl|mlb|mls|ufc|mma|boxing|fight|race|racing|formula 1|f1|falcons|hawks|braves|atlanta united|dream)\b/.test(text)
}
export function inferCustomerTaxonomy(item) {
  const reviewed = cleanKey(item?.category_key_v2)
  const fallbackSub = cleanKey(item?.subcategory_key_v2) || null
  const rawType = cleanKey(item?.event_type)
  const text = normalizeText(`${item?.event_type || ''} ${item?.genre || ''} ${item?.event_name || ''} ${item?.venue_name || ''}`)

  if (/\b(5k|10k|marathon|run club|fun run|road race)\b/.test(text)) return { category:'wellness_fitness', subcategory:'runs_races' }
  if (/film tv tour|film tour|studio tour|sightseeing tour|walking tour|city tour/.test(text)) return { category:'attractions_experiences', subcategory:'tours_sightseeing' }
  if (/happy hour|cocktail night|wine tasting|wine down/.test(text)) return { category:'dining_culinary', subcategory:'wine_cocktails' }
  if (/career fair|job fair|college expo|business expo|entrepreneur expo|professional expo|startup expo/.test(text)) return { category:'business_professional', subcategory:/career|job/.test(text)?'career_fairs':'conferences_summits' }
  if (/stand up|stand-up|\bcomedy\b/.test(text)) return { category:'comedy_performing_arts', subcategory:'stand_up' }
  if (/\bimprov\b/.test(text)) return { category:'comedy_performing_arts', subcategory:'improv' }
  if (/burlesque|cabaret|variety show/.test(text)) return { category:'comedy_performing_arts', subcategory:'theater' }
  if (/music festival|food festival|culture festival|cultural festival|block party|\bfestival\b/.test(text)) {
    const subcategory = /food|tequila|wine|beer/.test(text) ? 'food_festivals' : /music|r&b|rnb|soul|jazz|hip hop|hip-hop/.test(text) ? 'music_festivals' : /block party/.test(text) ? 'block_parties' : 'cultural_festivals'
    return { category:'festivals_major_activations', subcategory }
  }
  if (/watch party/.test(text)) {
    return hasSportsSignal(text)
      ? { category:'sports_watch', subcategory:'watch_parties' }
      : { category:'nightlife', subcategory:'late_night' }
  }
  if (/\b(vs\.?|versus|boxing|ufc|mma|wrestling|fight night|home game|matchup)\b/.test(text)) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }

  const concertSignal = rawType === 'concert' || /live music|music show|concert|symphony|dj set|night sets|\br&b\b|\brnb\b|hip hop|hip-hop|\brap\b|\bjazz\b|\bgospel\b|karaoke|open mic/.test(text)
  if (concertSignal) return { category:'concerts_live_music', subcategory:inferMusicSubcategory(text, fallbackSub, item?.genre) }

  if (reviewed && reviewed !== 'needs_review') {
    if (reviewed === 'sports_watch' && !hasSportsSignal(text)) return { category:null, subcategory:null }
    return { category:reviewed, subcategory:fallbackSub }
  }
  if (/parade|convention|expo/.test(text)) return { category:'festivals_major_activations', subcategory:/parade/.test(text)?'parades':'conventions_expos' }
  if (/rave|nightlife|nightclub|club night|after party|after-party/.test(text)) return { category:'nightlife', subcategory:fallbackSub }
  if (/brunch|food|restaurant|chef|culinary/.test(text)) return { category:'dining_culinary', subcategory:fallbackSub }
  if (/career|business|entrepreneur|startup|technology|conference|summit|networking/.test(text)) return { category:'business_professional', subcategory:fallbackSub }
  if (/museum|gallery|art |screening|exhibit/.test(text)) return { category:'arts_museums_culture', subcategory:fallbackSub }
  if (/wellness|fitness|yoga|pilates/.test(text)) return { category:'wellness_fitness', subcategory:fallbackSub }
  if (/family|kids?|children|youth/.test(text)) return { category:'family_kids', subcategory:fallbackSub }
  if (/church|faith|worship|spiritual|inspirational/.test(text)) return { category:'faith_inspirational', subcategory:fallbackSub }
  if (/college|university|alumni|homecoming|hbcu|greek life/.test(text)) return { category:'college_alumni', subcategory:fallbackSub }
  if (/dating|singles?|mixer|speed dating/.test(text)) return { category:'dating_social', subcategory:fallbackSub }
  return { category:null, subcategory:null }
}
export function inferCustomerCategory(item) { return inferCustomerTaxonomy(item).category }
function customerReadyEvent(item, verifiedVenueNames, city) {
  const title = String(item.event_name || '').trim()
  const venue = String(item.venue_name || '').trim()
  const taxonomy = inferCustomerTaxonomy(item)
  if (!title || !taxonomy.category || !safePublicImage(item.image_url) || !item.ticket_url) return false
  if (!venue || /^(atlanta|houston|miami|dallas|charlotte|phoenix|scottsdale|las vegas|los angeles|new york|washington dc|tba|online|virtual|warehouse)$/i.test(venue)) return false
  if (/\b(sold out|mon-fri 2026|make money fast|timeshare|webinar)\b/i.test(title)) return false
  if (city !== 'atlanta') {
    const venueMatched = verifiedVenueNames.has(normalizeVenueName(venue))
    const priorityCurated = Boolean(item.is_curated || item.is_featured) && Number(item.display_priority || 99) <= 20
    if (!venueMatched && !priorityCurated) return false
  }
  return true
}
function customerReadyVenue(item) { return Boolean(item?.id && item.name && item.is_verified && (item.address || item.website || item.phone || item.booking_link || item.instagram_handle)) }
function canonicalTicketKey(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '').toLowerCase() || '/'
    if (path === '/search') {
      const q = normalizeText(url.searchParams.get('q') || '')
      const city = normalizeText(url.searchParams.get('city') || '')
      return `${host}${path}?q=${q}&city=${city}`
    }
    return `${host}${path}`
  } catch {
    return normalizeText(raw) || null
  }
}
function eventCanonicalKey(item) {
  const ticketKey = canonicalTicketKey(item?.ticket_url)
  if (ticketKey) return `ticket:${ticketKey}`
  return `${compact(item?.event_name)}|${item?.show_date || ''}|${normalizeVenueName(item?.venue_name)}`
}
function eventRecordScore(item) {
  return Number(item?.good_times_score || 0) * 10 - Number(item?.display_priority || 50)
    + (item?.is_curated ? 20 : 0) + (item?.is_featured ? 12 : 0) + (item?.show_time ? 6 : 0)
    + (item?.organizer ? 4 : 0) + (item?.subcategory_key_v2 ? 3 : 0)
}
export function dedupeCustomerEvents(rows) {
  const best = new Map()
  for (const item of rows || []) {
    const key = eventCanonicalKey(item)
    const existing = best.get(key)
    if (!existing || eventRecordScore(item) > eventRecordScore(existing)) best.set(key, item)
  }
  return [...best.values()].sort((a,b) => eventRecordScore(b) - eventRecordScore(a) || String(a.show_date || '').localeCompare(String(b.show_date || '')))
}
export function getEventFreshness(rows, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue)
  let latest = null
  for (const item of rows || []) {
    const stamp = item?.updated_at ? new Date(item.updated_at) : null
    if (!stamp || Number.isNaN(stamp.getTime())) continue
    if (!latest || stamp > latest) latest = stamp
  }
  if (!latest) return { status: rows?.length ? 'unknown' : 'empty', live:false, latest_update:null, age_hours:null }
  const ageHours = Math.max(0, (now.getTime() - latest.getTime()) / 3_600_000)
  return {
    status: ageHours <= EVENT_FRESHNESS_MAX_HOURS ? 'live' : 'stale',
    live: ageHours <= EVENT_FRESHNESS_MAX_HOURS,
    latest_update: latest.toISOString(),
    age_hours: Number(ageHours.toFixed(2)),
  }
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
  return rows.map((item, index) => {
    const taxonomy = inferCustomerTaxonomy(item)
    return {
      event_key:`show:${item.id}`, source_table:'gt_shows', source_id:item.id, city_key:item.city_key,
      title:decodeHtmlEntities(item.event_name), event_date:item.show_date, event_time:item.show_time, venue_name:decodeHtmlEntities(item.venue_name),
      raw_type:item.event_type, raw_category:item.genre, ticket_url:item.ticket_url, image_url:safePublicImage(item.image_url),
      organizer:decodeHtmlEntities(item.organizer), display_priority:item.display_priority, good_times_score:item.good_times_score,
      category_key:taxonomy.category, subcategory_key:taxonomy.subcategory,
      is_featured:item.is_featured, is_curated:item.is_curated, rank_order:index + 1,
    }
  })
}
function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}
export default async function handler(request, response) {
  if (!['GET','HEAD'].includes(request.method || 'GET')) { response.setHeader('Allow', 'GET, HEAD'); return sendJson(response, 405, { ok:false, error:'Method not allowed' }) }
  const requestUrl = new URL(request.url || '/api/data', 'https://thegoodtimesworldwide.com')
  const city = normalizeCity(requestUrl.searchParams.get('city'))
  const eventLimit = clampLimit(requestUrl.searchParams.get('event_limit'), 500, 500)
  const venueLimit = clampLimit(requestUrl.searchParams.get('venue_limit'), 500, 800)
  const generatedAt = new Date().toISOString()
  const queries = buildGatewayQueries({ city, today:todayISO(), eventLimit, venueLimit })
  const [eventResult, venueResult] = await Promise.allSettled([
    fetchRows(queries.eventPath,'GOOD TIMES events'),
    fetchRows(queries.venuePath,'GOOD TIMES venues'),
  ])
  if (eventResult.status === 'rejected' && venueResult.status === 'rejected') {
    console.error('[GOOD TIMES data gateway]',{
      city, generatedAt,
      events:eventResult.reason?.message || String(eventResult.reason),
      venues:venueResult.reason?.message || String(venueResult.reason),
    })
    return sendJson(response,503,{ok:false,connected:false,city,source:'good-times-customer-ready-inventory',generated_at:generatedAt,error:'GOOD TIMES live data is temporarily unavailable.'})
  }
  const rawEvents = eventResult.status === 'fulfilled' ? eventResult.value : []
  const rawVenues = venueResult.status === 'fulfilled' ? venueResult.value : []
  const eventFreshness = eventResult.status === 'fulfilled' ? getEventFreshness(rawEvents, new Date(generatedAt)) : { status:'unavailable', live:false, latest_update:null, age_hours:null }
  const venues = dedupeCustomerVenues(rawVenues).map(item => ({...item,hero_image:safePublicImage(item.hero_image)})).slice(0,venueLimit)
  const verifiedVenueNames = new Set(venues.map(item => normalizeVenueName(item.name)).filter(Boolean))
  const filteredEvents = eventFreshness.live ? rawEvents.filter(item => customerReadyEvent(item,verifiedVenueNames,city)) : []
  const events = mapShows(dedupeCustomerEvents(filteredEvents)).slice(0,eventLimit)
  const degraded = eventResult.status === 'rejected' || venueResult.status === 'rejected' || eventFreshness.status === 'stale'
  const coverage = {
    events_live:eventFreshness.live,
    event_status:eventFreshness.status,
    event_latest_update:eventFreshness.latest_update,
    event_age_hours:eventFreshness.age_hours,
    event_freshness_max_hours:EVENT_FRESHNESS_MAX_HOURS,
    venues_live:venueResult.status === 'fulfilled',
    notice:eventFreshness.status === 'stale' ? 'Live event coverage is refreshing for this city. Venue discovery remains available.' : null,
  }
  if (degraded) {
    console.warn('[GOOD TIMES data gateway degraded]',{
      city, generatedAt, event_freshness:eventFreshness,
      events:eventResult.status === 'rejected' ? eventResult.reason?.message || String(eventResult.reason) : null,
      venues:venueResult.status === 'rejected' ? venueResult.reason?.message || String(venueResult.reason) : null,
    })
  }
  if (request.method === 'HEAD') {
    response.statusCode=200; response.setHeader('Cache-Control','no-store'); response.setHeader('X-Good-Times-Events',String(events.length)); response.setHeader('X-Good-Times-Venues',String(venues.length)); response.setHeader('X-Good-Times-Degraded',String(degraded)); response.setHeader('X-Good-Times-Event-Status',eventFreshness.status); return response.end()
  }
  return sendJson(response,200,{ok:true,connected:true,degraded,city,source:'good-times-customer-ready-inventory',generated_at:generatedAt,coverage,counts:{events:events.length,venues:venues.length},events,venues})
}