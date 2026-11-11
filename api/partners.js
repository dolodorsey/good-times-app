// GOOD TIMES — partner requests (venues, promoters, advertisers) from Profile → Partner with GOOD TIMES.
// Writes only to the review queue via gt_submit_partner_request; nothing is published automatically.
import { KHG_SUPABASE_URL as CONTENT_URL, KHG_SUPABASE_ANON_KEY as CONTENT_KEY } from '../src/lib/supabase.js'
const TYPES = new Set(['venue', 'promoter', 'advertiser'])
const INTERESTS = new Set(['listing', 'events', 'photos', 'free', 'featured', 'recurring', 'collab', 'home', 'entertainment', 'places', 'newsletter'])

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

export function partnerPayload(input = {}) {
  const r = input && typeof input === 'object' ? input : {}
  if (!TYPES.has(r.partner_type)) throw new Error('Choose venue, promoter or ad space.')
  const business = text(r.business_name, 160), contact = text(r.contact_name, 120), email = text(r.email, 200), phone = text(r.phone, 40)
  if (!business || !contact) throw new Error('Add your business and your name.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Check the email address.')
  if (!email && !(phone && phone.replace(/\D/g, '').length >= 10)) throw new Error('Add an email or a phone number.')
  const website = text(r.website, 300)
  return {
    city_key: 'atlanta', partner_type: r.partner_type, business_name: business, contact_name: contact, email, phone,
    instagram: text(r.instagram, 80)?.replace(/^@/, '') || null,
    website: website && /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : null,
    neighborhood: text(r.neighborhood, 120), budget: text(r.budget, 40), details: text(r.details, 1500),
    start_date: /^\d{4}-\d{2}-\d{2}$/.test(String(r.start_date || '')) ? r.start_date : null,
    interests: (Array.isArray(r.interests) ? r.interests : []).filter(i => INTERESTS.has(i)).slice(0, 10),
  }
}

export default async function handler(req, res) {
  if ((req.method || 'GET') !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { ok: false, error: 'Method not allowed' }) }
  let p
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}')
    p = partnerPayload(body.request)
  } catch (error) { return send(res, 400, { ok: false, error: error.message || 'Invalid request' }) }
  try {
    const r = await fetch(`${CONTENT_URL}/rest/v1/rpc/gt_submit_partner_request`, { method: 'POST', headers: { apikey: CONTENT_KEY, Authorization: `Bearer ${CONTENT_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p }) })
    if (!r.ok) throw new Error(`submit failed (${r.status})`)
    const id = await r.json().catch(() => null)
    return send(res, 201, { ok: true, id, status: 'submitted_for_review' })
  } catch (error) {
    console.error('[GOOD TIMES partners]', error?.message || String(error))
    return send(res, 503, { ok: false, error: 'Requests are unavailable right now. Email info@thegoodtimesworldwide.com and we’ll follow up.' })
  }
}
