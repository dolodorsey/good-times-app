import React, { useEffect, useMemo, useState } from 'react'
import { readSession } from '../auth/client.js'
import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'

const LEDGER_URL=`${GT_SUPABASE_URL}/functions/v1/good-times-recommendation-ledger`
const MAP_BBOX={
  atlanta:'-84.62,33.60,-84.15,34.02',houston:'-95.82,29.52,-95.05,30.11',miami:'-80.38,25.61,-80.03,25.98',
  dallas:'-97.06,32.55,-96.55,33.08',charlotte:'-81.08,35.02,-80.58,35.42',los_angeles:'-118.67,33.70,-118.10,34.34',
  new_york:'-74.26,40.49,-73.68,40.92',las_vegas:'-115.42,35.93,-114.90,36.38',washington_dc:'-77.22,38.79,-76.84,39.02',
  phoenix:'-112.32,33.25,-111.80,33.78',scottsdale:'-112.02,33.42,-111.75,33.76',
}
const cityName=value=>String(value||'atlanta').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace('Washington Dc','Washington, DC')
const currentCity=()=>document.querySelector('.gtlive-topbar select')?.value||'atlanta'
const readPersonalization=()=>{try{return JSON.parse(localStorage.getItem('gt_personalization')||'{}')}catch{return{}}}
const writePersonalization=next=>{try{localStorage.setItem('gt_personalization',JSON.stringify({...readPersonalization(),...next,updated_at:new Date().toISOString()}))}catch{}}

function openExternal(url){if(!url)return;try{window.open(url,'_blank','noopener,noreferrer')}catch{window.location.href=url}}

export default function GoodTimesCompletionBridge(){
  const session=useMemo(()=>readSession(),[])
  const[blackOpen,setBlackOpen]=useState(false)
  const[blackLoading,setBlackLoading]=useState(false)
  const[blackVenues,setBlackVenues]=useState([])
  const[blackError,setBlackError]=useState('')
  const[blackCity,setBlackCity]=useState('atlanta')

  useEffect(()=>{
    if(!session?.access_token||!session?.user?.id)return
    let alive=true
    const syncProfile=async()=>{
      try{
        const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/gt_user_profiles?auth_id=eq.${encodeURIComponent(session.user.id)}&select=home_city,last_city,vibe_preferences,tab_interests&limit=1`,{headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`,Accept:'application/json'},cache:'no-store'})
        if(!response.ok)return
        const profile=(await response.json())?.[0]
        if(!profile||!alive)return
        const city=String(profile.last_city||profile.home_city||'atlanta').toLowerCase().replace(/[\s-]+/g,'_')
        const vibes=Array.isArray(profile.vibe_preferences)&&profile.vibe_preferences.length?profile.vibe_preferences:Array.isArray(profile.tab_interests)?profile.tab_interests:[]
        writePersonalization({city,vibes})
      }catch{}
    }
    void syncProfile()
    return()=>{alive=false}
  },[session])

  useEffect(()=>{
    if(!session?.access_token)return
    let cancelled=false
    const logServedFeed=async()=>{
      await new Promise(resolve=>setTimeout(resolve,1200))
      if(cancelled)return
      const personalization=readPersonalization()
      const city=currentCity()||personalization.city||'atlanta'
      const vibes=Array.isArray(personalization.vibes)?personalization.vibes.filter(Boolean).slice(0,5):[]
      const params=new URLSearchParams({city,event_limit:'18',venue_limit:'18'})
      if(vibes.length)params.set('vibes',vibes.join(','))
      try{
        const response=await fetch(`/api/data?${params}`,{headers:{Accept:'application/json'},cache:'no-store'})
        const payload=await response.json().catch(()=>null)
        if(!response.ok||!payload?.ok)return
        const eventItems=(payload.events||[]).slice(0,6).map(item=>({...item,object_type:'event',object_id:item.event_key}))
        const venueItems=(payload.venues||[]).slice(0,6).map(item=>({...item,object_type:'venue',object_id:item.id}))
        const items=[...eventItems,...venueItems]
        if(!items.length)return
        const fingerprint=[city,vibes.join(','),...items.map(item=>item.object_id)].join('|')
        const cacheKey=`gt_rec_ledger:${fingerprint}`
        if(sessionStorage.getItem(cacheKey)==='1')return
        const ledger=await fetch(LEDGER_URL,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({city,vibes,surface:'home',action:'home_feed',candidate_count:(payload.events?.length||0)+(payload.venues?.length||0),items})})
        if(ledger.ok)sessionStorage.setItem(cacheKey,'1')
      }catch{}
    }
    void logServedFeed()
    return()=>{cancelled=true}
  },[session])

  useEffect(()=>{
    const originalFetch=window.fetch.bind(window)
    window.fetch=async(input,init)=>{
      const response=await originalFetch(input,init)
      try{
        const raw=typeof input==='string'?input:input?.url
        if(response.ok&&raw&&String(raw).includes('/rest/v1/gt_user_profiles')&&String(init?.method||'GET').toUpperCase()==='PATCH'&&typeof init?.body==='string'){
          const body=JSON.parse(init.body)
          const city=String(body.last_city||body.home_city||currentCity()||'atlanta').toLowerCase().replace(/[\s-]+/g,'_')
          const vibes=Array.isArray(body.vibe_preferences)?body.vibe_preferences:Array.isArray(body.tab_interests)?body.tab_interests:readPersonalization().vibes||[]
          writePersonalization({city,vibes})
          window.setTimeout(()=>{
            const selector=document.querySelector('.gtlive-topbar select')
            if(selector instanceof HTMLSelectElement){selector.value=city;selector.dispatchEvent(new Event('change',{bubbles:true}))}
          },80)
        }
      }catch{}
      return response
    }
    return()=>{window.fetch=originalFetch}
  },[])

  useEffect(()=>{
    const syncMapAndQuickActions=()=>{
      const city=currentCity()
      const iframe=document.querySelector('.gtlive-map iframe')
      const bbox=MAP_BBOX[city]
      if(iframe instanceof HTMLIFrameElement&&bbox){
        const desired=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`
        if(iframe.src!==desired)iframe.src=desired
      }
      document.querySelectorAll('.gtlive-quick-row button').forEach(button=>{
        if(String(button.textContent||'').trim().startsWith('Black-Owned'))button.style.display=city==='atlanta'?'':'none'
      })
    }
    const observer=new MutationObserver(syncMapAndQuickActions)
    observer.observe(document.body,{childList:true,subtree:true})
    document.addEventListener('change',syncMapAndQuickActions,true)
    syncMapAndQuickActions()
    return()=>{observer.disconnect();document.removeEventListener('change',syncMapAndQuickActions,true)}
  },[])

  useEffect(()=>{
    const onClick=event=>{
      const target=event.target instanceof Element?event.target.closest('button'):null
      if(!target||!target.closest('.gtlive-quick-row'))return
      if(!String(target.textContent||'').trim().startsWith('Black-Owned'))return
      event.preventDefault();event.stopPropagation()
      const city=currentCity()
      if(city!=='atlanta')return
      setBlackCity(city);setBlackOpen(true);setBlackLoading(true);setBlackError('')
      fetch(`/api/data?city=${encodeURIComponent(city)}&event_limit=12&venue_limit=180`,{headers:{Accept:'application/json'},cache:'no-store'})
        .then(async response=>{const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw new Error(data?.error||'Directory unavailable');return data})
        .then(data=>setBlackVenues((data.venues||[]).filter(item=>item.is_black_owned).slice(0,80)))
        .catch(error=>setBlackError(error?.message||'Directory unavailable'))
        .finally(()=>setBlackLoading(false))
    }
    document.addEventListener('click',onClick,true)
    return()=>document.removeEventListener('click',onClick,true)
  },[])

  if(!blackOpen)return null
  return <div role="dialog" aria-modal="true" aria-label={`Black-owned ${cityName(blackCity)}`} style={{position:'fixed',inset:0,zIndex:9400,background:'rgba(4,4,8,.84)',backdropFilter:'blur(14px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onMouseDown={event=>{if(event.target===event.currentTarget)setBlackOpen(false)}}>
    <section style={{width:'min(760px,100%)',maxHeight:'88vh',overflow:'hidden',borderRadius:'28px 28px 0 0',background:'#0B0B11',border:'1px solid rgba(212,168,83,.18)',color:'#F5F0E8'}}>
      <header style={{padding:'20px',display:'flex',gap:14,borderBottom:'1px solid rgba(255,255,255,.08)'}}><div style={{flex:1}}><small style={{color:'#D4A853',fontWeight:900,letterSpacing:'.18em'}}>CULTURE DIRECTORY</small><h2 style={{margin:'5px 0',fontSize:30}}>Black-owned {cityName(blackCity)}</h2><p style={{margin:0,color:'rgba(245,240,232,.55)',fontSize:12}}>Verified GOOD TIMES places across food, nightlife, beauty, retail and experiences.</p></div><button onClick={()=>setBlackOpen(false)} aria-label="Close" style={{width:38,height:38,borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'#fff',fontSize:20}}>×</button></header>
      <div style={{overflowY:'auto',maxHeight:'calc(88vh - 118px)',padding:'16px 18px 34px'}}>
        {blackLoading&&<div style={{padding:40,textAlign:'center',color:'rgba(245,240,232,.55)'}}>Opening the verified directory…</div>}
        {blackError&&<div style={{padding:14,borderRadius:12,background:'rgba(255,80,80,.08)',color:'#ffb8b8'}}>{blackError}</div>}
        {!blackLoading&&!blackError&&!blackVenues.length&&<div style={{padding:40,textAlign:'center'}}>No verified ownership records are ready for this city yet.</div>}
        <div style={{display:'grid',gap:10}}>{blackVenues.map(venue=><article key={venue.id} style={{display:'flex',gap:12,padding:12,borderRadius:16,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)'}}>{venue.hero_image&&<img src={venue.hero_image} alt="" style={{width:72,height:72,borderRadius:12,objectFit:'cover'}}/>}<div style={{flex:1,minWidth:0}}><small style={{color:'#D4A853',fontWeight:800}}>{venue.neighborhood||'Atlanta'}</small><strong style={{display:'block',fontSize:16,marginTop:3}}>{venue.name}</strong><p style={{margin:'4px 0 8px',fontSize:11,color:'rgba(245,240,232,.52)'}}>{venue.short_desc||String(venue.category_key||'place').replaceAll('_',' ')}</p><div style={{display:'flex',gap:7}}>{venue.website&&<button onClick={()=>openExternal(venue.website)} style={{border:'1px solid rgba(212,168,83,.3)',background:'rgba(212,168,83,.09)',color:'#F2D58F',borderRadius:9,padding:'7px 10px',fontSize:10,fontWeight:800}}>Website</button>}{venue.booking_link&&<button onClick={()=>openExternal(venue.booking_link)} style={{border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'#fff',borderRadius:9,padding:'7px 10px',fontSize:10,fontWeight:800}}>Book</button>}</div></div></article>)}</div>
      </div>
    </section>
  </div>
}
