const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const ALLOWED = new Set(['landing_view','signup_cta','app_open','share_click','ticket_click','reservation_click','concierge_request','install_cta'])

function text(value, max) {
  return String(value || '').trim().slice(0, max) || null
}
function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('Cache-Control','no-store')
  res.setHeader('X-Content-Type-Options','nosniff')
  res.end(JSON.stringify(payload))
}

export default async function handler(req,res) {
  if ((req.method || 'GET') !== 'POST') {
    res.setHeader('Allow','POST')
    return send(res,405,{ok:false,error:'Method not allowed'})
  }
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}')
    const eventName = text(body.event_name,60)
    if (!ALLOWED.has(eventName)) return send(res,400,{ok:false,error:'Unsupported event'})
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}
    const payload = {
      event_name:eventName,
      city_key:text(body.city_key,80),
      source:text(body.source,120),
      path:text(body.path,300),
      campaign:text(body.campaign,160),
      metadata:JSON.parse(JSON.stringify(metadata).slice(0,4000) || '{}'),
    }
    const response = await fetch(`${CONTENT_URL}/rest/v1/gt_growth_events`,{
      method:'POST',
      headers:{apikey:CONTENT_KEY,Authorization:`Bearer ${CONTENT_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Growth event insert failed (${response.status})`)
    return send(res,202,{ok:true})
  } catch(error) {
    console.error('[GOOD TIMES growth track]',error?.message || String(error))
    return send(res,503,{ok:false,error:'Tracking unavailable'})
  }
}
