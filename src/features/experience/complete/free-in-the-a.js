// FREE IN THE A — model, filters and tracking. Offers come only from public.v_gt_offers_public (verified + approved +
// unexpired) plus free-admission events already in the verified GOOD TIMES feed. Nothing here invents an offer,
// value, prize, date or partner. City-scoped (Atlanta first).
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {occurrenceUsable,safeImage,safeLink,displayDate,unique,cleanTitle} from './model.js'

export const FREE_CATEGORIES = Object.freeze([
  {id:'today',label:'Free Today',icon:'clock',blurb:'Active right now in Atlanta.'},
  {id:'food_drinks',label:'Free Food & Drinks',icon:'food',blurb:'Restaurant freebies, samples and promos.'},
  {id:'events',label:'Free Events',icon:'ticket',blurb:'Concerts, parties, museums and more — free admission.'},
  {id:'giveaways',label:'Giveaways',icon:'gift',blurb:'Legitimate, active drawings and prizes.'},
  {id:'birthday',label:'Birthday Freebies',icon:'cake',blurb:'Birthday rewards from participating businesses.'},
  {id:'deals',label:'Discounts & Deals',icon:'tag',blurb:'Real savings that aren’t 100% free.'},
  {id:'weekend',label:'Free This Weekend',icon:'calendar',blurb:'Free things to do Friday through Sunday.'},
  {id:'exclusive_drops',label:'Exclusive Drops',icon:'sparkle',blurb:'Verified offers created with GOOD TIMES partners.'},
])

export const OFFER_TYPE_LABEL = Object.freeze({free:'FREE',free_with_purchase:'FREE W/ PURCHASE',discount:'DEAL',giveaway:'GIVEAWAY'})
const host = u => { try { return new URL(u).hostname.replace(/^www\./,'') } catch { return null } }

/** A free-admission event from the verified feed, shaped as a FREE IN THE A card (links back to the event page). */
export function offerFromEvent(e){
  if(!e) return null
  return {
    id:`event:${e.event_key||e.id}`, kind:'event', event:e, category:'events', offer_type:'free',
    title:cleanTitle(e.title||e.event_name), merchant_name:e.venue_name||'Atlanta', image_url:e.image_url||null,
    location:e.venue_name||null, starts_at:e.event_date?`${e.event_date}T${e.event_time||'12:00'}:00`:null, expires_at:null,
    event_date:e.event_date, requirements:e.age_requirement?`Ages ${e.age_requirement}`:null,
    claim_method:safeLink(e.ticket_url)?'ticket':'rsvp', claim_url:safeLink(e.ticket_url), source_url:safeLink(e.source_url)||safeLink(e.ticket_url),
    verified_at:e.fact_verified_at||null, featured:Boolean(e.is_featured),
  }
}
export function freeEvents(events=[],now=Date.now()){
  return unique(events).filter(e=>e?.is_free===true&&occurrenceUsable(e,now)).map(offerFromEvent).filter(Boolean)
}

export function badgeFor(o){
  if(o.offer_type==='discount'&&o.actual_value) return String(o.actual_value).toUpperCase().slice(0,22)
  return OFFER_TYPE_LABEL[o.offer_type]||'FREE'
}
export function sourceLabel(o){ const h=host(o.source_url); return h?`Verified · ${h}`:null }
export function expiresLabel(o,now=Date.now()){
  if(!o.expires_at) return o.event_date?displayDate(o.event_date,{weekday:'short',month:'short',day:'numeric'}):null
  const ms=new Date(o.expires_at).getTime()-now
  if(!Number.isFinite(ms)) return null
  if(ms<=0) return 'Ended'
  const h=ms/36e5
  if(h<24) return `Ends in ${Math.max(1,Math.round(h))}h`
  return `Ends ${new Date(o.expires_at).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'America/New_York'})}`
}

/** Only CTAs backed by a real redemption path. */
export function offerActions(o){
  const out=[]
  const claim=safeLink(o.claim_url)
  if(o.kind==='event'){
    if(claim) out.push({id:'tickets',label:'Get Free Tickets',href:claim,track:'claim_click'})
    out.push({id:'details',label:'Get Details',open:true,track:'rsvp_click'})
  }else{
    if(claim&&o.offer_type==='giveaway') out.push({id:'enter',label:'Enter Giveaway',href:claim,track:'claim_click'})
    else if(claim&&o.offer_type==='discount') out.push({id:'deal',label:'View Deal',href:claim,track:'claim_click'})
    else if(claim) out.push({id:'claim',label:'Claim Offer',href:claim,track:'claim_click'})
    if(o.location&&/\d/.test(o.location)) out.push({id:'directions',label:'Get Directions',href:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.location)}`,track:'external_click'})
    if(!claim&&o.source_url) out.push({id:'details',label:'Get Details',href:o.source_url,track:'external_click'})
  }
  return out
}

const dayStart=(now)=>selectedCityClock('atlanta',now).date
export function isFreeToday(o,now=Date.now()){
  const today=dayStart(now)
  if(o.kind==='event') return o.event_date===today
  const started=!o.starts_at||new Date(o.starts_at).getTime()<=now
  const notEnded=!o.expires_at||new Date(o.expires_at).getTime()>now
  return started&&notEnded&&o.offer_type!=='discount'
}
export function isThisWeekend(o,now=Date.now()){
  if(o.kind==='event') return eventIsThisWeekend(o.event,'atlanta',now)
  if(o.offer_type==='discount') return false
  const c=selectedCityClock('atlanta',now),d=new Date(`${c.date}T12:00:00Z`),dow=d.getUTCDay()
  const fri=new Date(d);fri.setUTCDate(d.getUTCDate()+(dow===0?-2:dow===6?-1:5-dow))
  const sun=new Date(fri);sun.setUTCDate(fri.getUTCDate()+2)
  const s=o.starts_at?new Date(o.starts_at):null,e=o.expires_at?new Date(o.expires_at):null
  return (!s||s<=new Date(`${sun.toISOString().slice(0,10)}T23:59:59Z`))&&(!e||e>=new Date(`${fri.toISOString().slice(0,10)}T00:00:00Z`))
}
export function endingSoon(list,now=Date.now()){
  return list.filter(o=>o.expires_at&&new Date(o.expires_at).getTime()>now&&new Date(o.expires_at).getTime()-now<72*36e5).sort((a,b)=>new Date(a.expires_at)-new Date(b.expires_at))
}
export function inCategory(list,cat,now=Date.now()){
  if(cat==='today') return list.filter(o=>isFreeToday(o,now))
  if(cat==='weekend') return list.filter(o=>isThisWeekend(o,now))
  return list.filter(o=>o.category===cat)
}
export function featuredOfTheDay(list,now=Date.now()){
  const today=dayStart(now)
  return list.find(o=>o.kind!=='event'&&o.featured&&(!o.featured_on||o.featured_on===today))
    ||list.find(o=>o.kind!=='event'&&o.featured)
    ||list.find(o=>safeImage(o.image_url)&&isFreeToday(o,now))
    ||list.find(o=>safeImage(o.image_url))||list[0]||null
}

// ── tracking (raw events; claim_click ≠ redemption) ──────────────────────────────────────────────
const SESSION_IMPRESSIONS=new Set()
const anonId=()=>{try{let v=localStorage.getItem('gt-anon-id');if(!v){v=crypto.randomUUID();localStorage.setItem('gt-anon-id',v)}return v}catch{return null}}
export function attribution(){
  try{
    const u=new URL(window.location.href),keep={}
    for(const k of ['utm_source','utm_medium','utm_campaign','utm_content']) if(u.searchParams.get(k)) keep[k]=u.searchParams.get(k).slice(0,120)
    if(Object.keys(keep).length) sessionStorage.setItem('gt-free-utm',JSON.stringify(keep))
    return JSON.parse(sessionStorage.getItem('gt-free-utm')||'{}')
  }catch{return {}}
}
export function trackOffer(event_type,{offer=null,category=null}={}){
  if(event_type==='impression'){const k=offer?.id;if(!k||SESSION_IMPRESSIONS.has(k))return;SESSION_IMPRESSIONS.add(k)}
  const body={event_type,city_key:'atlanta',category:category||offer?.category||null,anon_id:anonId(),referrer:(typeof document!=='undefined'?document.referrer:'')||null,...attribution()}
  if(offer?.kind==='event') body.show_id=offer.event?.id||null; else if(offer?.id) body.offer_id=offer.id
  try{const blob=JSON.stringify({action:'track',...body});if(navigator.sendBeacon) navigator.sendBeacon('/api/offers',new Blob([blob],{type:'application/json'}));else fetch('/api/offers',{method:'POST',headers:{'content-type':'application/json'},body:blob,keepalive:true}).catch(()=>{})}catch{/* tracking is best-effort */}
}

// Offers aren't a saved-item type in accounts yet, so offer saves stay on this device (events use account saves).
const SAVE_KEY='gt-free-saved'
export function savedOfferIds(){try{return new Set(JSON.parse(localStorage.getItem(SAVE_KEY)||'[]'))}catch{return new Set()}}
export function toggleSavedOffer(id){const s=savedOfferIds();s.has(id)?s.delete(id):s.add(id);try{localStorage.setItem(SAVE_KEY,JSON.stringify([...s]))}catch{/* */}return s}

export function shareUrl(o){
  const u=new URL(typeof window!=='undefined'?window.location.origin:'https://thegoodtimesworldwide.com')
  u.searchParams.set('free','1');u.searchParams.set('offer',o.id)
  u.searchParams.set('utm_source','share');u.searchParams.set('utm_medium','app');u.searchParams.set('utm_campaign','free_in_the_a')
  return u.toString()
}
export async function shareOffer(o){
  const url=shareUrl(o),text=`${o.title} — ${o.merchant_name} · FREE IN THE A on GOOD TIMES`
  try{if(navigator.share){await navigator.share({title:o.title,text,url});return 'shared'}await navigator.clipboard.writeText(url);return 'copied'}catch{return 'cancelled'}
}

export async function loadOffers(city='atlanta'){
  let j=null
  try{const r=await fetch(`/api/offers?city=${encodeURIComponent(city)}`,{headers:{accept:'application/json'}});if(r.ok)j=await r.json()}catch{j=null}
  if(!j||!j.ok) throw new Error('Live offers are refreshing — free events below are still current.')
  return Array.isArray(j.offers)?j.offers.map(o=>({...o,kind:'offer'})):[]
}
