import {GT_SUPABASE_URL,GT_SUPABASE_ANON_KEY} from '../../../lib/supabase.js'
import {dateNumber} from '../good-times-event-clock.js'
import {list,itineraryWarnings} from './model.js'
export async function persistPlan(plan,session,{existing=false,fetcher=fetch}={}){
 if(!session?.user?.id||!session?.access_token)throw new Error('Please sign in again.')
 if(!/^[a-f0-9-]{36}$/i.test(plan.id)||dateNumber(plan.itinerary_date)===null||!list(plan.stops).length||plan.stops.length>10)throw new Error('The plan needs a date and at least one stop before saving.')
 if(itineraryWarnings(plan).some(w=>w.includes('stop order conflicts')))throw new Error('Fix the stop order or times before saving this plan.')
 const body={name:String(plan.name||'My Atlanta night').slice(0,120),city_id:'atlanta',itinerary_date:plan.itinerary_date,stops:plan.stops,group_size:plan.group_size||2,vibe_profile:plan.vibe_profile||{},metadata:{...plan.metadata,version:1},updated_at:new Date().toISOString()}
 let query=existing?`id=eq.${encodeURIComponent(plan.id)}&user_id=eq.${encodeURIComponent(session.user.id)}`:'on_conflict=id'
 if(existing&&plan.updated_at)query+='&updated_at=eq.'+encodeURIComponent(plan.updated_at)
 if(!existing)Object.assign(body,{id:plan.id,user_id:session.user.id,status:'draft',created_by:'user'})
 const response=await fetcher(`${GT_SUPABASE_URL}/rest/v1/itineraries?${query}`,{method:existing?'PATCH':'POST',headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:existing?'return=representation':'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(body),signal:AbortSignal.timeout(9000)})
 if(!response.ok)throw new Error('The plan could not be saved. Your changes are still on this screen.')
 let rows=await response.json();if(!rows.length&&existing)throw new Error('This plan changed elsewhere. Reopen the saved version before editing again.')
 if(!rows.length&&!existing){const reread=await fetcher(`${GT_SUPABASE_URL}/rest/v1/itineraries?id=eq.${plan.id}&user_id=eq.${encodeURIComponent(session.user.id)}&select=*`,{headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`},signal:AbortSignal.timeout(9000)});if(reread.ok)rows=await reread.json()}
 if(!rows?.[0]||rows[0].user_id!==session.user.id)throw new Error('Save was not confirmed. Retry from your saved plans.')
 return rows[0]
}
