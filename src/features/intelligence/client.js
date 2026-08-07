import {
  GT_SUPABASE_ANON_KEY,
  GT_SUPABASE_URL,
  KHG_SUPABASE_ANON_KEY,
  KHG_SUPABASE_URL,
} from '../../lib/supabase.js'
import { readSession } from '../auth/client.js'

const gtHeaders = (token = GT_SUPABASE_ANON_KEY) => ({
  apikey: GT_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})
const gatewayHeaders = {
  apikey: KHG_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${KHG_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, { cache: 'no-store', ...options, signal: options.signal || controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.detail || payload?.message || payload?.msg || payload?.error_description || payload?.error || `Request failed with HTTP ${response.status}`)
    }
    return payload
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('GOOD TIMES live data timed out. Please retry.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export function todayISO() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeCity(city) {
  return String(city || 'atlanta').toLowerCase().trim().replace(/[\s-]+/g, '_')
}

const liveDataCache = new Map()
const liveDataInflight = new Map()

async function loadSameOriginData(city) {
  const normalizedCity = normalizeCity(city)
  const cached = liveDataCache.get(normalizedCity)
  if (cached && Date.now() - cached.loadedAt < 30000) return cached.payload
  if (liveDataInflight.has(normalizedCity)) return liveDataInflight.get(normalizedCity)

  const request = fetchJson(`/api/data?city=${encodeURIComponent(normalizedCity)}&event_limit=500&venue_limit=400`)
    .then(payload => {
      if (!payload?.ok || !payload?.connected || !Array.isArray(payload.events) || !Array.isArray(payload.venues)) {
        throw new Error('GOOD TIMES data gateway returned an invalid response.')
      }
      liveDataCache.set(normalizedCity, { payload, loadedAt: Date.now() })
      return payload
    })
    .finally(() => liveDataInflight.delete(normalizedCity))

  liveDataInflight.set(normalizedCity, request)
  return request
}

async function loadVenuesDirect(normalizedCity, limit) {
  return fetchJson(
    `${KHG_SUPABASE_URL}/rest/v1/gt_venues?select=id,name,slug,city_key,neighborhood,side_of_town,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,best_time,price_range,dress_code,reservation_req,hours_summary,insider_tip,status,is_featured,is_verified,quality_score,hero_image,booking_link,booking_platform,google_rating,google_reviews,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_score,source_count,culture_tags&status=eq.active&city_key=eq.${encodeURIComponent(normalizedCity)}&hero_image=not.is.null&order=culture_tier.asc,culture_score.desc.nullslast,google_rating.desc.nullslast,quality_score.desc.nullslast&limit=${limit}`,
    { headers: gatewayHeaders },
  )
}

export async function loadExploreTaxonomy() {
  const [categories, subcategories] = await Promise.all([
    fetchJson(
      `${KHG_SUPABASE_URL}/rest/v1/gt_taxonomy_categories?select=category_key,category_name,description,sort_order&is_active=eq.true&order=sort_order.asc,category_name.asc`,
      { headers: gatewayHeaders },
    ),
    fetchJson(
      `${KHG_SUPABASE_URL}/rest/v1/gt_taxonomy_subcategories?select=category_key,subcategory_key,subcategory_name,description,sort_order,minimum_upcoming_inventory&is_active=eq.true&order=category_key.asc,sort_order.asc,subcategory_name.asc`,
      { headers: gatewayHeaders },
    ),
  ])

  const grouped = new Map()
  for (const row of subcategories || []) {
    if (!grouped.has(row.category_key)) grouped.set(row.category_key, [])
    grouped.get(row.category_key).push(row)
  }

  return (categories || []).map(category => ({
    id: category.category_key,
    name: category.category_name,
    description: category.description,
    subcategoryRows: grouped.get(category.category_key) || [],
  }))
}

export async function loadExploreDirectory(city = 'atlanta', { limit = 2500 } = {}) {
  const normalizedCity = normalizeCity(city)
  return fetchJson(
    `${KHG_SUPABASE_URL}/rest/v1/v_gt_venue_taxonomy_directory?select=id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,category_key,category_name,subcategory,subcategory_key,venue_category_key,venue_subcategory,tab_tags,search_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,sourced_from,website,phone,booking_link,status,taxonomy_confidence,latitude,longitude&city_key=eq.${encodeURIComponent(normalizedCity)}&order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast&limit=${limit}`,
    { headers: gatewayHeaders },
  )
}

export async function loadGoodTimesProfile(session = readSession()) {
  if (!session?.access_token || !session?.user?.id) return null
  const rows = await fetchJson(
    `${GT_SUPABASE_URL}/rest/v1/gt_user_profiles?auth_id=eq.${encodeURIComponent(session.user.id)}&select=*&limit=1`,
    { headers: gtHeaders(session.access_token) },
  )
  return rows?.[0] || null
}

export async function loadCanonicalEvents(city = 'atlanta', { limit = 500 } = {}) {
  const normalizedCity = normalizeCity(city)
  try {
    const payload = await loadSameOriginData(normalizedCity)
    return payload.events.slice(0, limit)
  } catch (gatewayError) {
    // Do not bypass the server freshness/customer-readiness gate with a direct event feed.
    console.warn('[GOOD TIMES live data] Same-origin event gateway failed; event inventory is hidden until the verified gateway recovers.', gatewayError)
    return []
  }
}

export async function loadCanonicalVenues(city = 'atlanta', { limit = 400 } = {}) {
  const normalizedCity = normalizeCity(city)
  try {
    const payload = await loadSameOriginData(normalizedCity)
    return payload.venues.slice(0, limit)
  } catch (gatewayError) {
    console.warn('[GOOD TIMES live data] Same-origin venue gateway failed; using direct verified venue feed.', gatewayError)
    return loadVenuesDirect(normalizedCity, limit)
  }
}

export async function checkGoodTimesLiveData(city = 'atlanta') {
  const payload = await loadSameOriginData(city)
  return {
    connected: Boolean(payload?.connected),
    degraded: Boolean(payload?.degraded),
    city: payload?.city || normalizeCity(city),
    events: Number(payload?.counts?.events || payload?.events?.length || 0),
    venues: Number(payload?.counts?.venues || payload?.venues?.length || 0),
    eventStatus: payload?.coverage?.event_status || null,
    eventsLive: Boolean(payload?.coverage?.events_live),
    eventAgeHours: payload?.coverage?.event_age_hours ?? null,
    notice: payload?.coverage?.notice || null,
    generatedAt: payload?.generated_at || null,
  }
}

export async function loadSavedItems(profileId, session = readSession()) {
  if (!profileId || !session?.access_token) return []
  return fetchJson(
    `${GT_SUPABASE_URL}/rest/v1/gt_saved_items?user_id=eq.${encodeURIComponent(profileId)}&select=id,item_type,item_id,saved_at&order=saved_at.desc`,
    { headers: gtHeaders(session.access_token) },
  )
}

export async function saveItem({ profileId, itemType, itemId }, session = readSession()) {
  if (!profileId || !session?.access_token) throw new Error('Please sign in again.')
  const response = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_saved_items?on_conflict=user_id,item_type,item_id`,
    {
      method: 'POST',
      headers: { ...gtHeaders(session.access_token), Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: profileId, item_type: itemType, item_id: String(itemId) }),
    },
  )
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || payload.error || 'Could not save this item.')
  }
  await recordTasteSignal({ entityType: itemType, entityId: itemId, signalType: 'save' }, session)
  return response.json().catch(() => [])
}

export async function unsaveItem({ profileId, itemType, itemId }, session = readSession()) {
  if (!profileId || !session?.access_token) throw new Error('Please sign in again.')
  await fetchJson(
    `${GT_SUPABASE_URL}/rest/v1/gt_saved_items?user_id=eq.${encodeURIComponent(profileId)}&item_type=eq.${encodeURIComponent(itemType)}&item_id=eq.${encodeURIComponent(String(itemId))}`,
    { method: 'DELETE', headers: { ...gtHeaders(session.access_token), Prefer: 'return=minimal' } },
  ).catch(() => null)
}

export async function loadItineraries(session = readSession()) {
  if (!session?.access_token || !session?.user?.id) return []
  return fetchJson(
    `${GT_SUPABASE_URL}/rest/v1/itineraries?user_id=eq.${encodeURIComponent(session.user.id)}&select=*&order=created_at.desc&limit=50`,
    { headers: gtHeaders(session.access_token) },
  )
}

export async function recordProductEvent({
  eventName,
  surface,
  objectType,
  objectId,
  city = 'atlanta',
  properties = {},
  clientEventId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
}, session = readSession()) {
  if (!session?.access_token || !session?.user?.id) return false
  try {
    const response = await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_product_events`, {
      method: 'POST',
      headers: { ...gtHeaders(session.access_token), Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        auth_id: session.user.id,
        client_event_id: clientEventId,
        event_name: eventName,
        surface,
        object_type: objectType,
        object_id: objectId == null ? null : String(objectId),
        city_slug: city,
        properties,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function recordTasteSignal({
  entityType,
  entityId,
  signalType,
  signalValue = 1,
  city = 'atlanta',
  metadata = {},
}, session = readSession()) {
  if (!session?.access_token || !session?.user?.id) return false
  try {
    const response = await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_taste_signals`, {
      method: 'POST',
      headers: { ...gtHeaders(session.access_token), Prefer: 'return=minimal' },
      body: JSON.stringify({
        auth_id: session.user.id,
        entity_type: entityType,
        entity_id: String(entityId),
        signal_type: signalType,
        signal_value: signalValue,
        city_slug: city,
        metadata,
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function askGoodTimesConcierge(input, session = readSession()) {
  if (!session?.access_token) throw new Error('Please sign in again.')
  return fetchJson(`${GT_SUPABASE_URL}/functions/v1/good-times-live-concierge`, {
    method: 'POST',
    headers: gtHeaders(session.access_token),
    body: JSON.stringify({ today: todayISO(), ...input }),
  })
}

export function cityLabel(city) {
  return ({
    atlanta: 'Atlanta', houston: 'Houston', los_angeles: 'Los Angeles', washington_dc: 'Washington, DC',
    miami: 'Miami', dallas: 'Dallas', charlotte: 'Charlotte', new_york: 'New York',
    phoenix: 'Phoenix', scottsdale: 'Scottsdale', las_vegas: 'Las Vegas',
  })[city] || String(city || '').replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase())
}

export const cityOptions = [
  ['atlanta', 'Atlanta'], ['houston', 'Houston'], ['los_angeles', 'Los Angeles'], ['miami', 'Miami'],
  ['charlotte', 'Charlotte'], ['washington_dc', 'Washington, DC'], ['new_york', 'New York'],
  ['dallas', 'Dallas'], ['phoenix', 'Phoenix'], ['scottsdale', 'Scottsdale'], ['las_vegas', 'Las Vegas'],
]
