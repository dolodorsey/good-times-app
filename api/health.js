import {
  GT_SUPABASE_URL,
  GT_SUPABASE_ANON_KEY,
  KHG_SUPABASE_URL,
  KHG_SUPABASE_ANON_KEY,
} from '../src/lib/supabase.js'
import ATLANTA_FALLBACK_SNAPSHOT from './atlanta-fallback-snapshot.js'

const GT_URL = GT_SUPABASE_URL
const CONTENT_URL = KHG_SUPABASE_URL
const GT_ANON_KEY = GT_SUPABASE_ANON_KEY
const CONTENT_ANON_KEY = KHG_SUPABASE_ANON_KEY

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

async function probeAtlantaInventory(fetchImpl, now = new Date()) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const serviceDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const response = await fetchImpl(`${CONTENT_URL}/rest/v1/rpc/gt_public_live_inventory_cached`, {
      method: 'POST',
      headers: { ...headers(CONTENT_ANON_KEY), 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        p_city: 'atlanta',
        p_service_date: serviceDate,
        p_event_limit: 1,
        p_venue_limit: 1,
      }),
    })
    if (!response.ok) return false
    const payload = await response.json().catch(() => null)
    return Boolean(payload && Array.isArray(payload.events) && Array.isArray(payload.venues))
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

const SNAPSHOT_MAX_AGE_MS = 36 * 60 * 60 * 1000

function parseSnapshotTimestamp(value) {
  const normalized = String(value || '').trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
  return Date.parse(normalized)
}

function verifiedSnapshotReady(now = new Date()) {
  const refreshedAt = parseSnapshotTimestamp(ATLANTA_FALLBACK_SNAPSHOT?.refreshed_at)
  const ageMs = now.getTime() - refreshedAt
  return Boolean(
    Number.isFinite(refreshedAt) &&
    ageMs >= 0 &&
    ageMs <= SNAPSHOT_MAX_AGE_MS &&
    Array.isArray(ATLANTA_FALLBACK_SNAPSHOT?.events) &&
    ATLANTA_FALLBACK_SNAPSHOT.events.length > 0 &&
    Array.isArray(ATLANTA_FALLBACK_SNAPSHOT?.venues) &&
    ATLANTA_FALLBACK_SNAPSHOT.venues.length > 0
  )
}

export async function getGoodTimesHealth(fetchImpl = globalThis.fetch, now = new Date()) {
  const [customerReady, contentReady] = await Promise.all([
    probe(GT_URL, GT_ANON_KEY, 'gt_formula_versions?select=id&limit=1', fetchImpl),
    probeAtlantaInventory(fetchImpl, now),
  ])
  const fallbackReady = !contentReady && verifiedSnapshotReady(now)
  const degraded = customerReady && !contentReady && fallbackReady
  return {
    ok: customerReady && (contentReady || fallbackReady),
    degraded,
    service: 'good-times',
    customer_ready: customerReady,
    content_ready: contentReady,
    verified_snapshot_ready: fallbackReady,
    snapshot_refreshed_at: fallbackReady ? ATLANTA_FALLBACK_SNAPSHOT.refreshed_at : null,
    launch_scope: 'atlanta_only',
    generated_at: now.toISOString(),
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
  res.setHeader('X-Good-Times-Health', health.ok ? (health.degraded ? 'degraded' : 'ready') : 'unavailable')
  if (health.degraded) res.setHeader('X-Good-Times-Fallback', 'verified-atlanta-snapshot')
  if (!health.ok) res.setHeader('Retry-After', '30')
  if (req.method === 'HEAD') return res.status(health.ok ? 200 : 503).end()
  return res.status(health.ok ? 200 : 503).json(health)
}
