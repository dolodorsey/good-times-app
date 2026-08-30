import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'
import { readSession } from '../auth/client.js'

const headers=(token=GT_SUPABASE_ANON_KEY)=>({
  apikey:GT_SUPABASE_ANON_KEY,
  Authorization:`Bearer ${token}`,
  'Content-Type':'application/json',
})

function sessionKey(){
  try{
    const existing=localStorage.getItem('gt_ad_session_key')
    if(existing)return existing
    const next=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`
    localStorage.setItem('gt_ad_session_key',next)
    return next
  }catch{return `${Date.now()}-${Math.random()}`}
}

export async function loadGoodTimesAd(placementKey,citySlug){
  try{
    const url=new URL(`${GT_SUPABASE_URL}/rest/v1/v_gt_active_ads`)
    url.searchParams.set('placement_key',`eq.${placementKey}`)
    url.searchParams.set('select','placement_key,surface,placement_format,min_width,min_height,campaign_id,advertiser_name,campaign_name,priority,city_slugs,creative_id,format,headline,body,image_url,advertiser_logo_url,cta_text,cta_url,alt_text')
    url.searchParams.set('order','priority.asc')
    url.searchParams.set('limit','12')
    const response=await fetch(url,{headers:headers(),cache:'no-store'})
    if(!response.ok)return null
    const rows=await response.json().catch(()=>[])
    return (rows||[]).find(row=>!Array.isArray(row.city_slugs)||row.city_slugs.length===0||row.city_slugs.includes(citySlug))||null
  }catch{return null}
}

export async function trackGoodTimesAd({ad,placementKey,citySlug,eventType}){
  if(!ad?.campaign_id||!ad?.creative_id)return false
  const session=readSession()
  try{
    const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_ad_events`,{
      method:'POST',
      headers:{...headers(session?.access_token||GT_SUPABASE_ANON_KEY),Prefer:'return=minimal'},
      body:JSON.stringify({
        campaign_id:ad.campaign_id,
        creative_id:ad.creative_id,
        placement_key:placementKey,
        city_slug:citySlug,
        event_type:eventType,
        auth_id:session?.user?.id||null,
        session_key:sessionKey(),
        metadata:{surface:ad.surface||null},
      }),
    })
    return response.ok
  }catch{return false}
}
