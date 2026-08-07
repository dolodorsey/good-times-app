const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const DEFAULT_LIMIT = 15
const MAX_LIMIT = 25

function normalizeCity(value) {
  return String(value || 'atlanta').trim().toLowerCase().replace(/[\s-]+/g, '_')
}
function clampLimit(value) {
  const n = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT
}
function headers() {
  return { apikey: CONTENT_KEY, Authorization: `Bearer ${CONTENT_KEY}`, Accept: 'application/json' }
}
function safeTerm(value) {
  return String(value || '').trim().replace(/[(),]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
}
function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=60, stale-while-revalidate=300' : 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  if ((req.method || 'GET') !== 'GET') {
    res.setHeader('Allow', 'GET')
    return send(res, 405, { ok:false, error:'Method not allowed' })
  }

  const url = new URL(req.url || '/api/claim/search', 'https://thegoodtimesworldwide.com')
  const q = safeTerm(url.searchParams.get('q'))
  const city = normalizeCity(url.searchParams.get('city'))
  const limit = clampLimit(url.searchParams.get('limit'))
  if (q.length < 2) return send(res, 200, { ok:true, city, query:q, count:0, venues:[] })

  const wildcard = `*${q}*`
  const select = 'id,name,slug,city_key,neighborhood,address,phone,website,instagram_handle,status,is_verified,quality_score,hero_image'
  const params = new URLSearchParams()
  params.set('select', select)
  params.set('city_key', `eq.${city}`)
  params.set('status', 'eq.active')
  params.set('or', `(name.ilike.${wildcard},address.ilike.${wildcard},neighborhood.ilike.${wildcard})`)
  params.set('order', 'is_verified.desc,quality_score.desc.nullslast,name.asc')
  params.set('limit', String(limit))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3500)
  try {
    const response = await fetch(`${CONTENT_URL}/rest/v1/gt_venues?${params.toString()}`, {
      headers: headers(), cache:'no-store', signal:controller.signal,
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`venue search HTTP ${response.status}: ${text.slice(0, 180)}`)
    const rows = text ? JSON.parse(text) : []
    return send(res, 200, { ok:true, city, query:q, count:Array.isArray(rows) ? rows.length : 0, venues:Array.isArray(rows) ? rows : [] })
  } catch (error) {
    console.error('[GOOD TIMES claim search]', { city, query:q, message:error?.message || String(error) })
    return send(res, 503, { ok:false, city, query:q, error:'Venue search is temporarily unavailable.' })
  } finally {
    clearTimeout(timeout)
  }
}
