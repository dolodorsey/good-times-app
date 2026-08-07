import baseHandler from './data.js'

const MAX_EVENTS = 120
const MAX_VENUES = 180
const STALE_TTL_MS = 10 * 60 * 1000
const cache = globalThis.__GOOD_TIMES_FAST_DATA_CACHE__ || (globalThis.__GOOD_TIMES_FAST_DATA_CACHE__ = new Map())

function clamp(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

function cityKey(value) {
  return String(value || 'atlanta').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function captureResponse(response, onFinish) {
  const originalEnd = response.end.bind(response)
  response.end = body => {
    try { onFinish(response.statusCode || 200, body, response.getHeaders?.() || {}) } catch {}
    return originalEnd(body)
  }
}

export default async function handler(request, response) {
  const incoming = new URL(request.url || '/api/data', 'https://goodtimesworldwide.com')
  const city = cityKey(incoming.searchParams.get('city'))
  const eventLimit = clamp(incoming.searchParams.get('event_limit'), 100, MAX_EVENTS)
  const venueLimit = clamp(incoming.searchParams.get('venue_limit'), 140, MAX_VENUES)
  const key = `${city}:${eventLimit}:${venueLimit}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.at < 60_000 && request.method !== 'HEAD') {
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    response.setHeader('X-Good-Times-Cache', 'HIT')
    response.end(cached.body)
    return
  }

  const rewritten = new URL('/api/data', 'https://goodtimesworldwide.com')
  rewritten.searchParams.set('city', city)
  rewritten.searchParams.set('event_limit', String(eventLimit))
  rewritten.searchParams.set('venue_limit', String(venueLimit))
  request.url = `${rewritten.pathname}${rewritten.search}`

  captureResponse(response, (status, body) => {
    if (status === 200 && typeof body === 'string' && body.length > 20 && request.method !== 'HEAD') {
      cache.set(key, { at: Date.now(), body })
      if (cache.size > 40) {
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
      response.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=600')
      response.setHeader('X-Good-Times-Cache', 'STALE')
      response.end(stale.body)
      return
    }
    throw error
  }
}
