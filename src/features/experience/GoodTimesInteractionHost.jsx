import React, { useEffect, useMemo, useState } from 'react'

const CITY_FALLBACKS = {
  atlanta:[-84.62,33.60,-84.15,34.02],
  houston:[-95.86,29.50,-95.00,30.15],
  los_angeles:[-118.70,33.70,-117.85,34.35],
  miami:[-80.45,25.55,-80.05,26.05],
  charlotte:[-81.15,34.95,-80.55,35.45],
  washington_dc:[-77.25,38.75,-76.80,39.05],
  new_york:[-74.30,40.45,-73.65,40.95],
  dallas:[-97.10,32.55,-96.45,33.15],
  phoenix:[-112.45,33.20,-111.70,33.80],
  scottsdale:[-112.05,33.35,-111.70,33.85],
  las_vegas:[-115.45,35.90,-114.85,36.40],
}

const cityLabel = value => String(value || 'atlanta').replaceAll('_',' ').replace(/\b\w/g, letter=>letter.toUpperCase())
const currentCity = () => document.querySelector('select[aria-label="City"]')?.value || 'atlanta'

function bboxFromVenues(venues, city) {
  const coords=(venues||[])
    .map(item=>[Number(item.longitude),Number(item.latitude)])
    .filter(([lng,lat])=>Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=90)
  if(coords.length<2)return CITY_FALLBACKS[city]||CITY_FALLBACKS.atlanta
  let minLng=Math.min(...coords.map(item=>item[0]))
  let maxLng=Math.max(...coords.map(item=>item[0]))
  let minLat=Math.min(...coords.map(item=>item[1]))
  let maxLat=Math.max(...coords.map(item=>item[1]))
  const lngPad=Math.max((maxLng-minLng)*.16,.025)
  const latPad=Math.max((maxLat-minLat)*.16,.02)
  minLng-=lngPad;maxLng+=lngPad;minLat-=latPad;maxLat+=latPad
  return [minLng,minLat,maxLng,maxLat]
}

function osmUrl(bbox) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox.join(','))}&layer=mapnik`
}

async function loadCityVenues(city) {
  const response=await fetch(`/api/data?city=${encodeURIComponent(city)}&event_limit=1&venue_limit=180`,{cache:'no-store',headers:{Accept:'application/json'}})
  const payload=await response.json().catch(()=>null)
  if(!response.ok||!payload?.ok||!Array.isArray(payload.venues))throw new Error(payload?.detail||payload?.error||'GOOD TIMES city inventory is unavailable.')
  return payload.venues
}

export default function GoodTimesInteractionHost(){
  const[blackOwned,setBlackOwned]=useState(null)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const[mapStatus,setMapStatus]=useState('')

  const orderedBlackOwned=useMemo(()=>{
    if(!blackOwned?.venues)return[]
    return [...blackOwned.venues].sort((a,b)=>Number(b.google_rating||0)-Number(a.google_rating||0))
  },[blackOwned])

  useEffect(()=>{
    let disposed=false
    let mapTimer=null

    const updateMap=async()=>{
      const iframe=document.querySelector('.gtlive-map iframe')
      if(!(iframe instanceof HTMLIFrameElement))return
      const city=currentCity()
      try{
        const venues=await loadCityVenues(city)
        if(disposed)return
        const mapReady=venues.filter(item=>Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude)))
        iframe.src=osmUrl(bboxFromVenues(mapReady,city))
        iframe.title=`${cityLabel(city)} GOOD TIMES map`
        const label=iframe.parentElement?.querySelector(':scope > div')
        if(label)label.innerHTML=`<b>${mapReady.length}</b> map-ready places in ${cityLabel(city)}`
        setMapStatus('')
      }catch(mapError){
        if(disposed)return
        iframe.src=osmUrl(CITY_FALLBACKS[city]||CITY_FALLBACKS.atlanta)
        iframe.title=`${cityLabel(city)} map`
        setMapStatus(`Live map inventory for ${cityLabel(city)} is reconnecting.`)
      }
    }

    const scheduleMap=()=>{
      if(mapTimer)window.clearTimeout(mapTimer)
      mapTimer=window.setTimeout(()=>void updateMap(),80)
    }

    const observer=new MutationObserver(()=>{
      if(document.querySelector('.gtlive-map iframe'))scheduleMap()
    })
    observer.observe(document.documentElement,{childList:true,subtree:true})

    const clickHandler=(event)=>{
      const target=event.target instanceof Element?event.target:null
      const button=target?.closest('button')
      if(!(button instanceof HTMLButtonElement))return
      const label=(button.textContent||'').replace(/›/g,'').trim()
      const isQuick=label==='Black-Owned'
      const section=button.closest('section')
      const isRailMore=label==='See more'&&/black-owned/i.test(section?.textContent||'')
      if(!isQuick&&!isRailMore)return
      event.preventDefault();event.stopImmediatePropagation()
      const city=currentCity()
      setLoading(true);setError('');setBlackOwned({city,venues:[]})
      void loadCityVenues(city).then(venues=>{
        const verified=venues.filter(item=>item.is_black_owned===true)
        setBlackOwned({city,venues:verified})
        if(!verified.length)setError(`No Black-owned places are verified in the current ${cityLabel(city)} live inventory yet.`)
      }).catch(loadError=>{
        setError(loadError?.message||'Black-owned inventory is reconnecting.')
      }).finally(()=>setLoading(false))
    }

    const changeHandler=(event)=>{
      const select=event.target
      if(select instanceof HTMLSelectElement&&select.getAttribute('aria-label')==='City')scheduleMap()
    }

    document.addEventListener('click',clickHandler,true)
    document.addEventListener('change',changeHandler,true)
    scheduleMap()
    return()=>{
      disposed=true
      observer.disconnect()
      document.removeEventListener('click',clickHandler,true)
      document.removeEventListener('change',changeHandler,true)
      if(mapTimer)window.clearTimeout(mapTimer)
    }
  },[])

  if(!blackOwned&&!mapStatus)return null
  return <>
    {mapStatus?<div role="status" style={{position:'fixed',left:'50%',bottom:86,transform:'translateX(-50%)',zIndex:6000,width:'min(420px,calc(100% - 28px))',padding:'10px 13px',borderRadius:14,background:'rgba(10,15,22,.94)',border:'1px solid rgba(255,255,255,.12)',color:'#fff',fontSize:11,fontWeight:700,textAlign:'center',backdropFilter:'blur(12px)'}}>{mapStatus}</div>:null}
    {blackOwned?<div role="dialog" aria-modal="true" aria-label={`Black-owned ${cityLabel(blackOwned.city)}`} onMouseDown={()=>setBlackOwned(null)} style={{position:'fixed',inset:0,zIndex:7000,background:'rgba(4,6,10,.78)',backdropFilter:'blur(16px)',display:'grid',placeItems:'end center',padding:12}}>
      <section onMouseDown={event=>event.stopPropagation()} style={{width:'min(760px,100%)',maxHeight:'86dvh',overflowY:'auto',borderRadius:26,background:'#0b0e14',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 30px 100px rgba(0,0,0,.55)',color:'#fff',padding:18}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:16}}><div><small style={{fontSize:9,fontWeight:900,letterSpacing:'.16em',color:'#d8b477'}}>CULTURE LAYER · VERIFIED LIVE INVENTORY</small><h2 style={{margin:'6px 0 4px',fontSize:28}}>Black-owned {cityLabel(blackOwned.city)}</h2><p style={{margin:0,color:'rgba(255,255,255,.58)',fontSize:12}}>Only places currently marked Black-owned in GOOD TIMES source data are shown here.</p></div><button type="button" onClick={()=>setBlackOwned(null)} style={{border:0,borderRadius:12,width:38,height:38,background:'rgba(255,255,255,.08)',color:'#fff',fontSize:22,cursor:'pointer'}}>×</button></header>
        {loading?<div style={{minHeight:180,display:'grid',placeItems:'center',color:'rgba(255,255,255,.65)',fontSize:12}}>Checking {cityLabel(blackOwned.city)} live inventory…</div>:null}
        {error&&!loading?<div style={{padding:14,borderRadius:14,background:'rgba(255,170,75,.1)',border:'1px solid rgba(255,190,110,.18)',color:'#f4d5a3',fontSize:12,lineHeight:1.5}}>{error}</div>:null}
        {!loading&&orderedBlackOwned.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:12}}>{orderedBlackOwned.map(venue=><article key={venue.id} style={{overflow:'hidden',borderRadius:18,border:'1px solid rgba(255,255,255,.09)',background:'rgba(255,255,255,.035)'}}>
          {venue.hero_image?<img src={venue.hero_image} alt="" style={{width:'100%',height:130,objectFit:'cover',display:'block'}}/>:null}
          <div style={{padding:14}}><small style={{fontSize:8,fontWeight:900,letterSpacing:'.12em',color:'#d8b477'}}>BLACK-OWNED · {String(venue.category_key||'PLACE').replaceAll('_',' ').toUpperCase()}</small><h3 style={{margin:'7px 0 4px',fontSize:18}}>{venue.name}</h3><p style={{margin:'0 0 10px',fontSize:11,lineHeight:1.45,color:'rgba(255,255,255,.57)'}}>{venue.neighborhood||venue.address||cityLabel(blackOwned.city)}{venue.google_rating?` · ★ ${Number(venue.google_rating).toFixed(1)}`:''}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{venue.website?<a href={venue.website} target="_blank" rel="noreferrer" style={linkStyle}>Website</a>:null}{venue.booking_link?<a href={venue.booking_link} target="_blank" rel="noreferrer" style={linkStyle}>Book</a>:null}</div></div>
        </article>)}</div>:null}
      </section>
    </div>:null}
  </>
}

const linkStyle={display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'9px 11px',borderRadius:10,border:'1px solid rgba(216,180,119,.28)',color:'#e7c58b',textDecoration:'none',fontSize:10,fontWeight:900,letterSpacing:'.06em'}
