import {publicApiHeaders} from '../src/lib/public-api-headers.js'
import {KHG_SUPABASE_URL,KHG_SUPABASE_ANON_KEY} from '../src/lib/supabase.js'
import {safeLink,safeImage} from '../src/features/experience/complete/model.js'
import {withHouseVenue,isHiddenListing} from './house-programming.js'

/** Read-only Kollective house programming (the founder's own events) for every city
 * where the Kollective runs them. Source: gt_house_listings → gt_shows, re-verified
 * every 4h from the official Kollective Eventbrite listings. Venues are "Venue TBA"
 * until a listing announces one. Ticket links appear only for published, public
 * listings: invite-only and unpublished events never get one.
 * This is not a city feed: Atlanta discovery lanes stay on /api/data-fast.
 */
export const HOUSE_CITY_LABELS = {atlanta:'Atlanta, GA',washington_dc:'Washington, DC'}

export function houseAccess(row) {
  if (row.admission_type === 'invite_only') return 'invite_only'
  if (!safeLink(row.ticket_url)) return 'tickets_pending'
  return row.is_free ? 'free_rsvp' : 'tickets'
}

export function mapHouseEvent(source) {
  if (isHiddenListing(source)) return null
  const row = withHouseVenue(source)
  if (!row?.id || !row.event_name || !HOUSE_CITY_LABELS[row.city_key]) return null
  const access = houseAccess(row)
  return {
    event_key: 'show:' + row.id, id: row.id, city_key: row.city_key, city_label: HOUSE_CITY_LABELS[row.city_key],
    series_key: row.series_key || null, brand: row.brand || null,
    title: row.event_name, event_type: row.event_type, category_key: row.category_key_v2 || null,
    event_date: row.show_date, event_time: row.show_time || null, end_date: row.end_date || null, end_time: row.end_time || null,
    timezone: row.timezone || 'America/New_York',
    venue_name: row.venue_name, venue_address: row.venue_address || null, venue_tba: Boolean(row.venue_tba),
    image_url: safeImage(row.image_url), description: row.description || null,
    access, is_free: row.is_free === true,
    // Never expose a link for invite-only or unpublished listings.
    ticket_url: access === 'tickets' || access === 'free_rsvp' ? safeLink(row.ticket_url) : null,
    status: row.status, organizer: row.organizer || null, updated_at: row.updated_at,
  }
}

export async function houseProgramming(fetcher = fetch) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetcher(`${KHG_SUPABASE_URL}/rest/v1/rpc/gt_public_house_programming_v1`, {
      method: 'POST', headers: publicApiHeaders(KHG_SUPABASE_ANON_KEY, {'Content-Type': 'application/json'}),
      body: '{}', cache: 'no-store', signal: controller.signal,
    })
    if (!response.ok) throw new Error('House programming could not be refreshed.')
    const rows = await response.json()
    if (!Array.isArray(rows)) throw new Error('Invalid house programming response.')
    const events = rows.map(mapHouseEvent).filter(Boolean)
    return {ok: true, source: 'kollective-house-programming', generated_at: new Date().toISOString(), counts: {events: events.length}, events}
  } finally { clearTimeout(timer) }
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'GET') {
    response.statusCode = 405; response.setHeader('Allow', 'GET'); response.setHeader('Cache-Control', 'no-store')
    return response.end(JSON.stringify({ok: false, error: 'Read-only endpoint.'}))
  }
  try {
    const payload = await houseProgramming()
    response.statusCode = 200
    response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
    response.end(JSON.stringify(payload))
  } catch {
    response.statusCode = 503; response.setHeader('Cache-Control', 'no-store')
    response.end(JSON.stringify({ok: false, error: 'Kollective events are temporarily unavailable.'}))
  }
}
