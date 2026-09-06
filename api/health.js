const GT_PROJECT_REF = 'czocqfaovfpjweayniuw'
const CONTENT_PROJECT_REF = 'dzlmtvodpyhetvektfuo'
const GT_URL = `https://${GT_PROJECT_REF}.supabase.co`
const CONTENT_URL = `https://${CONTENT_PROJECT_REF}.supabase.co`
const GT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImN6b2NxZmFvdmZwandlYXluaXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzEzODAsImV4cCI6MjA4Mzk0NzM4MH0.6-3rmA9tZXHLVg5N6a_82rKA9Kvrj4gRrUUiSczovho'
// Keep the content-plane probe aligned with the publishable key used by the live GOOD TIMES catalog.
// The previous legacy JWT key is no longer authorized by the active content project and caused false 401 health failures.
const CONTENT_PUBLISHABLE_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'

const HEALTH_TIMEOUT_MS = 4500

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
}

async function probe(url, key, query, fetchImpl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(`${url}/rest/v1/${query}`, {
      headers: headers(key),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return false
    const payload = await response.json().catch(() => null)
    return Array.isArray(payload) && payload.length > 0
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function getGoodTimesHealth(fetchImpl = globalThis.fetch) {
  const [customerReady, contentReady] = await Promise.all([
    probe(GT_URL, GT_ANON_KEY, 'gt_formula_versions?select=id&limit=1', fetchImpl),
    probe(CONTENT_URL, CONTENT_PUBLISHABLE_KEY, 'gt_venues?select=id&status=eq.active&limit=1', fetchImpl),
  ])
  return {
    ok: customerReady && contentReady,
    service: 'good-times',
    customer_ready: customerReady,
    content_ready: contentReady,
    generated_at: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(204).end()
  }
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(405).json({ ok: false, service: 'good-times', error: 'method_not_allowed' })
  }

  const health = await getGoodTimesHealth()
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Good-Times-Health', health.ok ? 'ready' : 'unavailable')
  if (!health.ok) res.setHeader('Retry-After', '30')
  if (req.method === 'HEAD') return res.status(health.ok ? 200 : 503).end()
  return res.status(health.ok ? 200 : 503).json(health)
}
