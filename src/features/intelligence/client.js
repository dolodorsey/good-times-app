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
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || payload?.msg || payload?.error_description || payload?.error || 'Request failed')
  }
  return payload
}

export function todayISO() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const normalizedCity = String(city || 'atlanta').toLowerCase().replace(/[\s-]+/g, '_')
  const today = todayISO()

  if (normalizedCity === 'atlanta') {
    return fetchJson(
      `${KHG_SUPABASE_URL}/rest/v1/gt_public_atlanta_feed?select=event_key,source_table,source_id,city_key,title,event_date,event_time,venue_name,raw_type,raw_category,ticket_url,image_url,organizer,display_priority,good_times_score,category_key,subcategory_key,is_featured,is_curated,rank_order,refreshed_at&event_date=gte.${today}&order=rank_order.asc&limit=${limit}`,
      { headers: gatewayHeaders },
    )
  }

  const rows = await fetchJson(
    `${KHG_SUPABASE_URL}/rest/v1/gt_shows?select=id,event_name,event_type,genre,city_key,show_date,show_time,venue_name,ticket_url,image_url,organizer,display_priority,good_times_score,category_key_v2,subcategory_key_v2,is_featured,is_curated&city_key=eq.${encodeURIComponent(normalizedCity)}&show_date=gte.${today}&status=in.(confirmed,tentative)&order=show_date.asc,display_priority.asc&limit=${limit}`,
    { headers: gatewayHeaders },
  )

  return (rows || []).map((item, index) => ({
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

export async function loadCanonicalVenues(city = 'atlanta', { limit = 400 } = {}) {
  const normalizedCity = String(city || 'atlanta').toLowerCase().replace(/[\s-]+/g, '_')
  return fetchJson(
    `${KHG_SUPABASE_URL}/rest/v1/gt_venues?select=id,name,slug,city_key,neighborhood,side_of_town,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,best_time,price_range,dress_code,reservation_req,hours_summary,insider_tip,status,is_featured,is_verified,quality_score,hero_image,booking_link,booking_platform,google_rating,google_reviews,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_score,source_count,culture_tags&status=eq.active&city_key=eq.${encodeURIComponent(normalizedCity)}&hero_image=not.is.null&order=culture_tier.asc,culture_score.desc.nullslast,google_rating.desc.nullslast,quality_score.desc.nullslast&limit=${limit}`,
    { headers: gatewayHeaders },
  )
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
  return fetchJson(`${GT_SUPABASE_URL}/functions/v1/good-times-concierge`, {
    method: 'POST',
    headers: gtHeaders(session.access_token),
    body: JSON.stringify({ today: todayISO(), ...input }),
  })
}

export function cityLabel(city) {
  return ({
    atlanta: 'Atlanta', houston: 'Houston', los_angeles: 'Los Angeles', miami: 'Miami',
    charlotte: 'Charlotte', washington_dc: 'Washington, DC', new_york: 'New York',
    dallas: 'Dallas', phoenix: 'Phoenix', scottsdale: 'Scottsdale', las_vegas: 'Las Vegas',
  })[city] || String(city || '').replaceAll('_', ' ').replace(/\b\w/g, value => value.toUpperCase())
}

export const cityOptions = [
  ['atlanta', 'Atlanta'], ['houston', 'Houston'], ['los_angeles', 'Los Angeles'], ['miami', 'Miami'],
  ['charlotte', 'Charlotte'], ['washington_dc', 'Washington, DC'], ['new_york', 'New York'],
  ['dallas', 'Dallas'], ['phoenix', 'Phoenix'], ['scottsdale', 'Scottsdale'], ['las_vegas', 'Las Vegas'],
]
