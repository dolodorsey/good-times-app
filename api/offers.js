// FREE IN THE A — public offers (GET), analytics events + partner submissions (POST).
// Reads only public.v_gt_offers_public (verified + approved + unexpired). Submissions go to the approval queue
// via gt_submit_offer; nothing a visitor sends can publish an offer.
const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const CITIES = new Set(['atlanta'])
const EVENTS = new Set(['section_view','category_view','impression','detail_view','save','share','claim_click','external_click','rsvp_click','ig_referral','alert_opt_in'])
const CATEGORIES = new Set(['food_drinks','events','giveaways','birthday','deals','exclusive_drops'])
const TYPES = new Set(['free','free_with_purchase','discount','giveaway'])

function send(res, status, payload, cache = 'no-store') {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cache)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null
const headers = { apikey: CONTENT_KEY, Authorization: `Bearer ${CONTENT_KEY}`, 'Content-Type': 'application/json' }

async function rpc(fn, args) {
  const r = await fetch(`${CONTENT_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) })
  if (!r.ok) throw new Error(`${fn} failed (${r.status})`)
  return r.status === 204 ? null : r.json().catch(() => null)
}

export default async function handler(req, res) {
  const method = req.method || 'GET'
  try {
    if (method === 'GET') {
      const url = new URL(req.url, 'http://localhost')
      const city = CITIES.has(url.searchParams.get('city')) ? url.searchParams.get('city') : 'atlanta'
      if (url.searchParams.get('kind') === 'ads') {
        const sel = 'id,advertiser,kind,disclosure_label,kicker,title,subtitle,image_url,cta_label,cta_url,placements,priority,ends_at'
        const r = await fetch(`${CONTENT_URL}/rest/v1/gt_ad_queue?select=${sel}&city_key=eq.${city}&order=priority.asc&limit=50`, { headers })
        if (!r.ok) throw new Error(`ads read failed (${r.status})`)
        const ads = await r.json()
        return send(res, 200, { ok: true, city, ads: Array.isArray(ads) ? ads : [] }, 'public, s-maxage=120, stale-while-revalidate=600')
      }
      const select = 'id,city_key,title,description,category,offer_type,merchant_name,venue_id,show_id,image_url,location,participating_locations,actual_value,requirements,claim_method,claim_url,redemption_instructions,source_url,source_type,starts_at,expires_at,verified_at,featured,featured_on'
      const r = await fetch(`${CONTENT_URL}/rest/v1/v_gt_offers_public?select=${select}&city_key=eq.${city}&order=featured.desc,expires_at.asc.nullslast&limit=200`, { headers })
      if (!r.ok) throw new Error(`offers read failed (${r.status})`)
      const offers = await r.json()
      return send(res, 200, { ok: true, city, offers: Array.isArray(offers) ? offers : [] }, 'public, s-maxage=60, stale-while-revalidate=300')
    }
    if (method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'Method not allowed' }) }
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}')
    if (body.action === 'track') {
      if (!EVENTS.has(body.event_type)) return send(res, 400, { ok: false, error: 'Unsupported event' })
      await rpc('gt_track_offer_event', { p: {
        event_type: body.event_type, offer_id: text(body.offer_id, 40), show_id: text(body.show_id, 40), city_key: 'atlanta',
        category: text(body.category, 40), anon_id: text(body.anon_id, 64), utm_source: text(body.utm_source, 80), utm_medium: text(body.utm_medium, 80),
        utm_campaign: text(body.utm_campaign, 120), utm_content: text(body.utm_content, 120), referrer: text(body.referrer, 300),
      } })
      return send(res, 202, { ok: true })
    }
    if (body.action === 'ad_track') {
      if (!['impression', 'click'].includes(body.event_type)) return send(res, 400, { ok: false, error: 'Unsupported event' })
      await rpc('gt_track_ad_event', { p: { ad_id: text(body.ad_id, 40), placement: text(body.placement, 40), event_type: body.event_type, anon_id: text(body.anon_id, 64), utm_source: text(body.utm_source, 80) } })
      return send(res, 202, { ok: true })
    }
    if (body.action === 'submit') {
      const o = body.offer && typeof body.offer === 'object' ? body.offer : {}
      if (!text(o.merchant_name, 160) || !text(o.title, 140) || !CATEGORIES.has(o.category) || !TYPES.has(o.offer_type)) return send(res, 400, { ok: false, error: 'Business, title, category and type are required.' })
      if (!/^https:\/\//i.test(String(o.source_url || ''))) return send(res, 400, { ok: false, error: 'Add an official https link where the offer can be confirmed.' })
      if (!text(o.submitter_contact, 200)) return send(res, 400, { ok: false, error: 'Add an email or phone so we can verify the offer.' })
      const id = await rpc('gt_submit_offer', { p: {
        city_key: 'atlanta', title: text(o.title, 140), merchant_name: text(o.merchant_name, 160), category: o.category, offer_type: o.offer_type,
        source_url: text(o.source_url, 500), requirements: text(o.requirements, 1000), submitter_contact: text(o.submitter_contact, 200),
        expires_at: /^\d{4}-\d{2}-\d{2}$/.test(String(o.expires_at || '')) ? `${o.expires_at}T23:59:00-05:00` : null,
      } })
      return send(res, 201, { ok: true, id, status: 'submitted_for_review' })
    }
    return send(res, 400, { ok: false, error: 'Unknown action' })
  } catch (error) {
    console.error('[GOOD TIMES offers]', error?.message || String(error))
    return send(res, 503, { ok: false, error: 'FREE IN THE A is unavailable right now.' })
  }
}
