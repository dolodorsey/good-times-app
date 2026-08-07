import { KHG_SUPABASE_ANON_KEY, KHG_SUPABASE_URL } from './lib/supabase.js'

const ALLOWED_EVENTS = new Set([
  'landing_view','signup_cta','app_open','share_click','ticket_click','reservation_click','concierge_request','install_cta',
])
const TICKET_HOSTS = ['ticketmaster.com','eventbrite.com','axs.com','dice.fm','seatgeek.com','stubhub.com']
const RESERVATION_HOSTS = ['resy.com','opentable.com','tockhq.com','exploretock.com']

function clean(value, max=160) { return String(value || '').trim().slice(0,max) }
function currentCity() {
  try {
    const stored = JSON.parse(localStorage.getItem('gt_personalization') || '{}')
    if (stored?.city) return clean(stored.city,80).toLowerCase().replace(/[\s-]+/g,'_')
  } catch {}
  const path = location.pathname.toLowerCase()
  const cities = ['atlanta','houston','miami','charlotte','dallas','phoenix','scottsdale','las_vegas','los_angeles','new_york','washington_dc']
  return cities.find(city => path.includes(city.replaceAll('_','-'))) || 'atlanta'
}
function campaignContext() {
  const params = new URLSearchParams(location.search)
  return {
    source: clean(params.get('utm_source') || params.get('source') || 'direct',120),
    campaign: clean(params.get('utm_campaign') || params.get('campaign') || '',160),
  }
}
function safeMetadata(metadata={}) {
  const out={}
  for (const [key,value] of Object.entries(metadata || {})) {
    if (value == null) continue
    if (typeof value === 'string') out[clean(key,60)] = clean(value,300)
    else if (typeof value === 'number' || typeof value === 'boolean') out[clean(key,60)] = value
  }
  return out
}

export async function recordGrowthEvent(eventName, metadata={}) {
  if (!ALLOWED_EVENTS.has(eventName)) return false
  const { source, campaign } = campaignContext()
  try {
    const response = await fetch(`${KHG_SUPABASE_URL}/rest/v1/gt_growth_events`, {
      method:'POST',
      keepalive:true,
      headers:{
        apikey:KHG_SUPABASE_ANON_KEY,
        Authorization:`Bearer ${KHG_SUPABASE_ANON_KEY}`,
        'Content-Type':'application/json',
        Prefer:'return=minimal',
      },
      body:JSON.stringify({
        event_name:eventName,
        city_key:currentCity(),
        source,
        path:clean(`${location.pathname}${location.search}`,300),
        campaign,
        metadata:safeMetadata({ referrer:document.referrer || '', ...metadata }),
      }),
    })
    return response.ok
  } catch { return false }
}

function classifyClick(target) {
  const clickable = target?.closest?.('a,button,[role="button"]')
  if (!clickable) return null
  const text = clean(clickable.textContent,120).toLowerCase()
  const rawHref = clickable.getAttribute?.('href') || ''
  let href = rawHref
  let host = ''
  try { const url = new URL(rawHref,location.origin); href = url.href; host = url.hostname.replace(/^www\./,'').toLowerCase() } catch {}
  if (TICKET_HOSTS.some(value => host.endsWith(value)) || /ticket|tickets|buy passes|buy now/.test(text)) return ['ticket_click',{label:text,href}]
  if (RESERVATION_HOSTS.some(value => host.endsWith(value)) || /reserve|reservation|book table|book now/.test(text)) return ['reservation_click',{label:text,href}]
  if (/share|send to friend|invite/.test(text)) return ['share_click',{label:text,href}]
  if (/concierge|plan my night|build my night|request a concierge/.test(text)) return ['concierge_request',{label:text,href}]
  if (/download|install|app store|google play/.test(text)) return ['install_cta',{label:text,href}]
  if (/get started|create account|sign up|join good times/.test(text)) return ['signup_cta',{label:text,href}]
  return null
}

export function installGrowthTracking() {
  if (typeof window === 'undefined' || window.__GT_GROWTH_TRACKING__) return
  window.__GT_GROWTH_TRACKING__ = true
  recordGrowthEvent('landing_view',{title:document.title})
  document.addEventListener('click', event => {
    const classified = classifyClick(event.target)
    if (classified) recordGrowthEvent(classified[0],classified[1])
  }, { capture:true, passive:true })
}
