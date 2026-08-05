const CANONICAL_CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CANONICAL_CONTENT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJkemxtdHZvZHB5aGV0dmVrdGZ1byIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY5NTg0ODY0LCJleHAiOjIwODUxNjA4NjR9.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo'

const CITY_ALIASES = {
  atlanta: 'atlanta',
  houston: 'houston',
  los_angeles: 'los_angeles',
  'los-angeles': 'los_angeles',
  miami: 'miami',
  charlotte: 'charlotte',
  washington_dc: 'washington_dc',
  'washington-dc': 'washington_dc',
  dallas: 'dallas',
  new_york: 'new_york',
  'new-york': 'new_york',
  phoenix: 'phoenix',
  scottsdale: 'scottsdale',
  las_vegas: 'las_vegas',
  'las-vegas': 'las_vegas',
}

const EVENT_SELECT = [
  'event_key', 'source_table', 'source_id', 'city_key', 'title', 'event_date',
  'event_time', 'venue_name', 'raw_type', 'raw_category', 'ticket_url', 'image_url',
  'organizer', 'display_priority', 'good_times_score', 'category_key', 'subcategory_key',
  'is_featured', 'is_curated', 'rank_order', 'refreshed_at',
].join(',')

const SHOW_SELECT = [
  'id', 'event_name', 'event_type', 'genre', 'city_key', 'show_date', 'show_time',
  'venue_name', 'ticket_url', 'image_url', 'organizer', 'display_priority',
  'good_times_score', 'category_key_v2', 'subcategory_key_v2', 'is_featured', 'is_curated',
].join(',')

const VENUE_SELECT = [
  'id', 'name', 'slug', 'city_key', 'neighborhood', 'side_of_town', 'category_key',
  'subcategory', 'address', 'latitude', 'longitude', 'phone', 'website',
  'instagram_handle', 'short_desc', 'vibe_tags', 'best_for', 'best_time', 'price_range',
  'dress_code', 'reservation_req', 'hours_summary', 'insider_tip', 'status',
  'is_featured', 'is_verified', 'quality_score', 'hero_image', 'booking_link',
  'booking_platform', 'google_rating', 'google_reviews', 'culture_tier', 'is_khg',
  'is_culture_pick', 'is_black_owned', 'culture_score', 'source_count', 'culture_tags',
].join(',')

export function normalizeCity(value) {
  const normalized = String(value || 'atlanta').trim().toLowerCase().replace(/[\s]+/g, '_')
  return CITY_ALIASES[normalized] || 'atlanta'
}

export function clampLimit(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

export function buildGatewayQueries({ city = 'atlanta', today, eventLimit = 500, venueLimit = 400 }) {
  const normalizedCity = normalizeCity(city)
  const eventPath = normalizedCity === 'atlanta'
    ? `gt_public_atlanta_feed?select=${EVENT_SELECT}&event_date=gte.${today}&order=rank_order.asc&limit=${eventLimit}`
    : `gt_shows?select=${SHOW_SELECT}&city_key=eq.${encodeURIComponent(normalizedCity)}&show_date=gte.${today}&status=in.(confirmed,tentative)&order=show_date.asc,display_priority.asc&limit=${eventLimit}`

  const venuePath = `gt_venues?select=${VENUE_SELECT}&status=eq.active&city_key=eq.${encodeURIComponent(normalizedCity)}&hero_image=not.is.null&order=culture_tier.asc,culture_score.desc.nullslast,google_rating.desc.nullslast,quality_score.desc.nullslast&limit=${venueLimit}`

  return { normalizedCity, eventPath, venuePath }
}

function todayISO() {
  const date = new Date()
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function publicHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  }
}

async function fetchRows(baseUrl, key, path, label) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: publicHeaders(key),
      cache: 'no-store',
      signal: controller.signal,
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status}: ${text.slice(0, 240)}`)
    }
    const rows = text ? JSON.parse(text) : []
    if (!Array.isArray(rows)) throw new Error(`${label} returned an invalid payload`)
    return rows
  } finally {
    clearTimeout(timeout)
  }
}

function mapShows(rows) {
  return rows.map((item, index) => ({
    event_key: `show:${item.id}`,
    source_table: 'gt_shows',
    source_id: item.id,
    city_key: item.city_key,
    title: item.event_name,
    event_date: item.show_date,
    event_time: item.show_time,
    venue_name: item.venue_name,
    raw_type: item.event_type,
    raw_category: item.genre,
    ticket_url: item.ticket_url,
    image_url: item.image_url,
    organizer: item.organizer,
    display_priority: item.display_priority,
    good_times_score: item.good_times_score,
    category_key: item.category_key_v2 || item.event_type,
    subcategory_key: item.subcategory_key_v2,
    is_featured: item.is_featured,
    is_curated: item.is_curated,
    rank_order: index + 1,
  }))
}

function sendJson(response, status, payload) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}

export default async function handler(request, response) {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
    response.setHeader('Allow', 'GET, HEAD')
    return sendJson(response, 405, { ok: false, error: 'Method not allowed' })
  }

  const requestUrl = new URL(request.url || '/api/data', 'https://thegoodtimesworldwide.com')
  const contentUrl = process.env.VITE_CONTENT_SUPABASE_URL || process.env.VITE_KHG_SUPABASE_URL || CANONICAL_CONTENT_URL
  const contentKey = process.env.VITE_CONTENT_SUPABASE_ANON_KEY || process.env.VITE_KHG_SUPABASE_ANON_KEY || CANONICAL_CONTENT_KEY
  const city = normalizeCity(requestUrl.searchParams.get('city'))
  const eventLimit = clampLimit(requestUrl.searchParams.get('event_limit'), 500, 500)
  const venueLimit = clampLimit(requestUrl.searchParams.get('venue_limit'), 400, 400)
  const generatedAt = new Date().toISOString()
  const queries = buildGatewayQueries({ city, today: todayISO(), eventLimit, venueLimit })

  try {
    const [rawEvents, venues] = await Promise.all([
      fetchRows(contentUrl, contentKey, queries.eventPath, 'GOOD TIMES events'),
      fetchRows(contentUrl, contentKey, queries.venuePath, 'GOOD TIMES venues'),
    ])
    const events = city === 'atlanta' ? rawEvents : mapShows(rawEvents)
    const payload = {
      ok: true,
      connected: true,
      city,
      source: 'good-times-gateway',
      generated_at: generatedAt,
      counts: { events: events.length, venues: venues.length },
      events,
      venues,
    }
    if (request.method === 'HEAD') {
      response.statusCode = 200
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Good-Times-Events', String(events.length))
      response.setHeader('X-Good-Times-Venues', String(venues.length))
      return response.end()
    }
    return sendJson(response, 200, payload)
  } catch (error) {
    console.error('[GOOD TIMES data gateway]', {
      city,
      message: error?.message || String(error),
      generatedAt,
    })
    return sendJson(response, 503, {
      ok: false,
      connected: false,
      city,
      source: 'good-times-gateway',
      generated_at: generatedAt,
      error: 'GOOD TIMES live data is temporarily unavailable.',
      detail: error?.message || String(error),
    })
  }
}
