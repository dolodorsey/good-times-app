import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL, KHG_SUPABASE_ANON_KEY, KHG_SUPABASE_URL } from './lib/supabase.js'

const ALLOWED_EVENTS = new Set([
  'landing_view','signup_cta','app_open','share_click','ticket_click','reservation_click','concierge_request','install_cta',
  'signup_complete','first_action',
])
const ATTRIBUTION_KEY='gt_attribution_v1'
const LAST_TOUCH_TTL_MS=30*24*60*60*1000
const FIRST_ACTION_KEY='gt_first_action_v1'
const TICKET_HOSTS = ['ticketmaster.com','eventbrite.com','axs.com','dice.fm','seatgeek.com','stubhub.com']
const RESERVATION_HOSTS = ['resy.com','opentable.com','tockhq.com','exploretock.com']
const ENTERPRISE_CAPTURE='https://wfkohcwxxsrhcxhepfql.supabase.co/functions/v1/marketing-event-capture'
const ENTERPRISE_BRAND_KEY='good-times'

function clean(value, max=160) { return String(value || '').trim().slice(0,max) }
function getStored(key){try{return localStorage.getItem(key)}catch{return null}}
function setStored(key,value){try{localStorage.setItem(key,value)}catch{}}
function visitorKey(){
  const existing=getStored('khg_vid')
  if(existing)return existing
  const created=crypto.randomUUID()
  setStored('khg_vid',created)
  return created
}
function enterpriseCode(){
  const params=new URLSearchParams(location.search)
  const incoming=clean(params.get('khg_track'),80)
  if(incoming){setStored(`khg_track:${ENTERPRISE_BRAND_KEY}`,incoming);return incoming}
  return getStored(`khg_track:${ENTERPRISE_BRAND_KEY}`)||''
}
function currentCity() {
  try {
    const stored = JSON.parse(localStorage.getItem('gt_personalization') || '{}')
    if (stored?.city) return clean(stored.city,80).toLowerCase().replace(/[\s-]+/g,'_')
  } catch {}
  const path = location.pathname.toLowerCase()
  const cities = ['atlanta','houston','miami','charlotte','dallas','phoenix','scottsdale','las_vegas','los_angeles','new_york','washington_dc']
  return cities.find(city => path.includes(city.replaceAll('_','-'))) || 'atlanta'
}
function readAttribution(){
  try{const parsed=JSON.parse(getStored(ATTRIBUTION_KEY)||'null');return parsed&&typeof parsed==='object'?parsed:{}}catch{return {}}
}
// First/last-touch attribution. First touch is written once and never overwritten;
// last touch is replaced whenever a URL carries campaign parameters.
export function captureAttribution(){
  if(typeof window==='undefined')return {}
  const params=new URLSearchParams(location.search)
  const touch={
    source:clean(params.get('utm_source')||params.get('source'),120),
    medium:clean(params.get('utm_medium'),80),
    campaign:clean(params.get('utm_campaign')||params.get('campaign'),160),
    content:clean(params.get('utm_content'),160),
    term:clean(params.get('utm_term'),160),
  }
  const stored=readAttribution()
  if(!touch.source&&!touch.medium&&!touch.campaign&&!touch.content)return stored
  touch.at=new Date().toISOString()
  touch.landing_path=clean(location.pathname,200)
  const next={first:stored.first||touch,last:touch}
  setStored(ATTRIBUTION_KEY,JSON.stringify(next))
  return next
}
function activeTouch(){
  const params=new URLSearchParams(location.search)
  const fromUrl=params.get('utm_source')||params.get('source')||params.get('utm_campaign')||params.get('campaign')||params.get('utm_medium')||params.get('utm_content')
  const {first,last}=captureAttribution()
  if(fromUrl&&last)return {touch:last,first,basis:'url'}
  const fresh=last?.at&&Date.now()-Date.parse(last.at)<LAST_TOUCH_TTL_MS
  if(fresh)return {touch:last,first,basis:'stored'}
  return {touch:null,first,basis:'none'}
}
function campaignContext() {
  const {touch,first,basis}=activeTouch()
  return {
    source: clean(touch?.source || 'direct',120),
    medium: clean(touch?.medium,80),
    campaign: clean(touch?.campaign,160),
    content: clean(touch?.content,160),
    term: clean(touch?.term,160),
    first: first || null,
    basis,
  }
}
function attributionMetadata(ctx){
  const f=ctx.first||{}
  return {
    utm_medium:ctx.medium||undefined,utm_content:ctx.content||undefined,utm_term:ctx.term||undefined,attribution_basis:ctx.basis,
    first_source:f.source||undefined,first_medium:f.medium||undefined,first_campaign:f.campaign||undefined,first_content:f.content||undefined,first_touch_at:f.at||undefined,
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
function enterpriseEventName(eventName){
  if(eventName==='landing_view'||eventName==='app_open')return 'page_view'
  if(eventName==='install_cta')return 'app_install_click'
  if(eventName==='concierge_request')return 'booking_interest'
  if(eventName==='signup_complete')return 'signup'
  if(eventName==='first_action')return 'conversion'
  return 'cta_click'
}
async function recordEnterpriseEvent(eventName, metadata={}){
  const code=enterpriseCode()
  const ctx=campaignContext()
  const { source,campaign }=ctx
  const f=ctx.first||{}
  try{
    const response=await fetch(ENTERPRISE_CAPTURE,{
      method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        ...(code?{code}:{brand_key:ENTERPRISE_BRAND_KEY}),
        event_type:enterpriseEventName(eventName),
        visitor_key:visitorKey(),
        metadata:{
          event_id:crypto.randomUUID(),
          source,
          medium:ctx.medium||'good_times_app',
          channel:'app',
          campaign_key:campaign||undefined,
          content_key:ctx.content||undefined,
          variant:f.source?clean(`first:${f.source}|${f.medium||''}|${f.campaign||''}|${f.content||''}`,300):undefined,
          conversion_type:eventName==='concierge_request'?'booking_interest':eventName==='first_action'?'first_action':eventName==='signup_complete'?'signup':undefined,
          app:'good-times',
          path:clean(`${location.pathname}${location.search}`,300),
          cta:clean(metadata?.label||eventName,200),
          platform:navigator.userAgent.includes('wv')?'native_webview':'web',
        },
      }),
    })
    if(!response.ok)return false
    const result=await response.json().catch(()=>null)
    if(result?.tracking_code)setStored(`khg_track:${ENTERPRISE_BRAND_KEY}`,result.tracking_code)
    return true
  }catch{return false}
}

export async function recordGrowthEvent(eventName, metadata={}) {
  if (!ALLOWED_EVENTS.has(eventName)) return false
  const ctx = campaignContext()
  const { source, campaign } = ctx
  const legacyWrite=(async()=>{
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
          metadata:safeMetadata({ referrer:document.referrer || '', ...attributionMetadata(ctx), ...metadata }),
        }),
      })
      return response.ok
    } catch { return false }
  })()
  const enterpriseWrite=recordEnterpriseEvent(eventName,metadata)
  const [legacyOk,enterpriseOk]=await Promise.all([legacyWrite,enterpriseWrite])
  return legacyOk||enterpriseOk
}

const FIRST_ACTIONS=new Set(['ticket_click','reservation_click','concierge_request','share_click'])
function maybeFirstAction(eventName,metadata){
  if(!FIRST_ACTIONS.has(eventName)||getStored(FIRST_ACTION_KEY))return
  setStored(FIRST_ACTION_KEY,new Date().toISOString())
  recordGrowthEvent('first_action',{action:eventName,label:metadata?.label})
}
export function recordSignupComplete(metadata={}){return recordGrowthEvent('signup_complete',metadata)}

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
  captureAttribution()
  recordGrowthEvent('landing_view',{title:document.title})
  document.addEventListener('click', event => {
    const classified = classifyClick(event.target)
    if (classified) { recordGrowthEvent(classified[0],classified[1]); maybeFirstAction(classified[0],classified[1]) }
  }, { capture:true, passive:true })
}

// Copy first-touch attribution and Home Screen install state onto the signed-in user's own
// auth metadata so the CRM sync can tag the HighLevel contact (GT-IG, GT-IG-BIO, GT-INSTALLED...).
export async function syncAttributionToAccount(session){
  try{
    const userId=session?.user?.id, token=session?.access_token
    if(!userId||!token)return false
    const data={}
    const first=readAttribution().first
    const attrKey=`gt_attr_synced:${userId}`
    if(first?.source&&!getStored(attrKey)){
      data.gt_attribution={first_source:first.source,first_medium:first.medium||'',first_campaign:first.campaign||'',first_content:first.content||'',first_touch_at:first.at||''}
    }
    const standalone=(()=>{try{return matchMedia('(display-mode: standalone)').matches||!!navigator.standalone}catch{return false}})()
    const installKey=`gt_install_synced:${userId}`
    if(standalone&&!getStored(installKey))data.gt_installed_at=new Date().toISOString()
    if(!Object.keys(data).length)return false
    data.gt_meta_updated_at=new Date().toISOString()
    const response=await fetch(`${GT_SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({data})})
    if(!response.ok)return false
    if(data.gt_attribution)setStored(attrKey,'1')
    if(data.gt_installed_at)setStored(installKey,'1')
    return true
  }catch{return false}
}
