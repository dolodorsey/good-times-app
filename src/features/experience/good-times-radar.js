import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'
import { readSession } from '../auth/client.js'

const headers=(token=GT_SUPABASE_ANON_KEY)=>({
  apikey:GT_SUPABASE_ANON_KEY,
  Authorization:`Bearer ${token}`,
  'Content-Type':'application/json',
})

export const DEFAULT_ALERT_PREFS={
  intensity:'normal',just_announced:true,presale:true,on_sale:true,selling_fast:true,
  saved_reminders:true,event_changes:true,city_alerts:true,weekend_brief:true,nearby:false,
  push_enabled:true,email_enabled:false,timezone:'America/New_York',
}

export async function loadRadarState(session=readSession()){
  if(!session?.access_token||!session?.user?.id)return{follows:[],preferences:DEFAULT_ALERT_PREFS,alerts:[]}
  const token=session.access_token,authId=session.user.id
  const [followsResponse,prefsResponse,alertsResponse]=await Promise.all([
    fetch(`${GT_SUPABASE_URL}/rest/v1/gt_user_follows?auth_id=eq.${encodeURIComponent(authId)}&is_active=eq.true&select=id,entity_type,entity_id,city_slug,alert_level,metadata,created_at&order=created_at.desc`,{headers:headers(token),cache:'no-store'}),
    fetch(`${GT_SUPABASE_URL}/rest/v1/gt_alert_preferences?auth_id=eq.${encodeURIComponent(authId)}&select=*&limit=1`,{headers:headers(token),cache:'no-store'}),
    fetch(`${GT_SUPABASE_URL}/rest/v1/gt_alert_queue?auth_id=eq.${encodeURIComponent(authId)}&select=id,alert_type,object_type,object_id,city_slug,title,body,action_url,status,scheduled_for,delivered_at,created_at&order=created_at.desc&limit=30`,{headers:headers(token),cache:'no-store'}),
  ])
  const follows=followsResponse.ok?await followsResponse.json().catch(()=>[]):[]
  const prefs=prefsResponse.ok?await prefsResponse.json().catch(()=>[]):[]
  const alerts=alertsResponse.ok?await alertsResponse.json().catch(()=>[]):[]
  return{follows:follows||[],preferences:{...DEFAULT_ALERT_PREFS,...(prefs?.[0]||{})},alerts:alerts||[]}
}

export async function followEntity({entityType,entityId,citySlug,alertLevel='normal',metadata={}},session=readSession()){
  if(!session?.access_token||!session?.user?.id)throw new Error('Sign in to follow and get Radar alerts.')
  const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_user_follows?on_conflict=auth_id,entity_type,entity_id`,{
    method:'POST',
    headers:{...headers(session.access_token),Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify({auth_id:session.user.id,entity_type:entityType,entity_id:String(entityId),city_slug:citySlug||null,alert_level:alertLevel,metadata,is_active:true,updated_at:new Date().toISOString()}),
  })
  if(!response.ok)throw new Error('Could not follow this yet.')
  return(await response.json().catch(()=>[]))?.[0]||null
}

export async function unfollowEntity({entityType,entityId},session=readSession()){
  if(!session?.access_token||!session?.user?.id)return false
  const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_user_follows?auth_id=eq.${encodeURIComponent(session.user.id)}&entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(String(entityId))}`,{
    method:'DELETE',headers:{...headers(session.access_token),Prefer:'return=minimal'},
  })
  return response.ok
}

export async function saveRadarPreferences(next,session=readSession()){
  if(!session?.access_token||!session?.user?.id)throw new Error('Sign in to manage Radar alerts.')
  const payload={...DEFAULT_ALERT_PREFS,...next,auth_id:session.user.id,updated_at:new Date().toISOString()}
  const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_alert_preferences?on_conflict=auth_id`,{
    method:'POST',headers:{...headers(session.access_token),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload),
  })
  if(!response.ok)throw new Error('Could not save Radar settings.')
  return(await response.json().catch(()=>[]))?.[0]||payload
}

export async function enqueueRadarAlert({alertType,objectType,objectId,citySlug,title,body,actionUrl,dedupeKey,metadata={}},session=readSession()){
  if(!session?.access_token||!session?.user?.id)return false
  try{
    const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_alert_queue?on_conflict=dedupe_key`,{
      method:'POST',
      headers:{...headers(session.access_token),Prefer:'resolution=ignore-duplicates,return=minimal'},
      body:JSON.stringify({auth_id:session.user.id,alert_type:alertType,object_type:objectType||null,object_id:objectId==null?null:String(objectId),city_slug:citySlug||null,title,body:body||null,action_url:actionUrl||null,status:'queued',dedupe_key:dedupeKey||null,metadata}),
    })
    return response.ok
  }catch{return false}
}
