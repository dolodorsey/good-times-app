import React, { useEffect, useMemo, useState } from 'react'
import GoodTimesInteractionHost from './GoodTimesInteractionHost.jsx'

const NAV=[['home','⌂','Home'],['map','⌖','Map'],['planner','✦','Planner'],['calendar','▦','Calendar'],['vault','▣','Vault']]
const CITY_BBOX={
  atlanta:'-84.62,33.60,-84.15,34.02',houston:'-95.82,29.52,-95.05,30.11',miami:'-80.38,25.61,-80.03,25.98',
  dallas:'-97.06,32.55,-96.55,33.08',charlotte:'-81.08,35.02,-80.58,35.42',los_angeles:'-118.67,33.70,-118.10,34.34',
  new_york:'-74.26,40.49,-73.68,40.92',las_vegas:'-115.42,35.93,-114.90,36.38',washington_dc:'-77.22,38.79,-76.84,39.02',
  phoenix:'-112.32,33.25,-111.80,33.78',scottsdale:'-112.02,33.42,-111.75,33.76',
}
const cityLabel=value=>String(value||'atlanta').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase()).replace('Washington Dc','Washington, DC')
const currentCity=()=>document.querySelector('.gtlive-topbar select')?.value||'atlanta'
const originalButtons=()=>[...document.querySelectorAll('.gtlive-nav button')]
const clickOriginal=needle=>{const button=originalButtons().find(item=>String(item.textContent||'').toLowerCase().includes(needle));if(button instanceof HTMLElement){button.click();return true}return false}
const activeOriginal=()=>String(document.querySelector('.gtlive-nav button.active')?.textContent||'').toLowerCase()
const directions=venue=>venue?.latitude!=null&&venue?.longitude!=null?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${venue.latitude},${venue.longitude}`)}`:venue?.address?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`:null

function PlannerSwitcher(){
  const [surface,setSurface]=useState('build')
  useEffect(()=>{
    const sync=()=>{const value=activeOriginal();setSurface(value.includes('plans')?'plans':'build')}
    const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});sync();return()=>observer.disconnect()
  },[])
  return <div style={{position:'fixed',top:'calc(68px + env(safe-area-inset-top, 0px))',left:'50%',transform:'translateX(-50%)',zIndex:8050,display:'flex',gap:5,padding:5,borderRadius:999,background:'rgba(8,8,13,.88)',backdropFilter:'blur(14px)',border:'1px solid rgba(212,168,83,.18)',boxShadow:'0 12px 36px rgba(0,0,0,.28)'}}>
    <button onClick={()=>clickOriginal('build')} style={{border:0,borderRadius:999,padding:'8px 13px',background:surface==='build'?'rgba(212,168,83,.18)':'transparent',color:surface==='build'?'#F2D58F':'rgba(245,240,232,.55)',fontSize:9,fontWeight:900,letterSpacing:'.1em',textTransform:'uppercase'}}>Build</button>
    <button onClick={()=>clickOriginal('plans')} style={{border:0,borderRadius:999,padding:'8px 13px',background:surface==='plans'?'rgba(212,168,83,.18)':'transparent',color:surface==='plans'?'#F2D58F':'rgba(245,240,232,.55)',fontSize:9,fontWeight:900,letterSpacing:'.1em',textTransform:'uppercase'}}>My Plans</button>
  </div>
}

export default function GoodTimesNavigationBridge(){
  const[tab,setTab]=useState('home')
  const[mapOpen,setMapOpen]=useState(false)
  const[city,setCity]=useState(()=>currentCity())
  const[venues,setVenues]=useState([])
  const[loading,setLoading]=useState(false)
  const[query,setQuery]=useState('')
  const[mapError,setMapError]=useState('')

  useEffect(()=>{
    if(document.getElementById('gt-five-nav-style'))return
    const style=document.createElement('style');style.id='gt-five-nav-style';style.textContent=`
      .gtlive-nav{opacity:0!important;pointer-events:none!important;transform:translateY(120%)!important}
      .gtlive-scroll{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}
      .gt-five-nav button:focus-visible{outline:2px solid #F2D58F;outline-offset:2px}
    `;document.head.append(style)
  },[])

  useEffect(()=>{
    const sync=()=>{
      if(mapOpen){setTab('map');return}
      const active=activeOriginal()
      if(active.includes('date'))setTab('calendar')
      else if(active.includes('vault'))setTab('vault')
      else if(active.includes('build')||active.includes('plans'))setTab('planner')
      else setTab('home')
      setCity(currentCity())
    }
    const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('change',sync,true);sync();return()=>{observer.disconnect();document.removeEventListener('change',sync,true)}
  },[mapOpen])

  async function openMap(){
    const nextCity=currentCity();setCity(nextCity);setMapOpen(true);setTab('map');setLoading(true);setMapError('');setQuery('')
    try{
      const response=await fetch(`/api/data?city=${encodeURIComponent(nextCity)}&event_limit=1&venue_limit=120`,{headers:{Accept:'application/json'},cache:'no-store'})
      const data=await response.json().catch(()=>null)
      if(!response.ok||!data?.ok||!Array.isArray(data.venues))throw new Error(data?.detail||data?.error||'Map inventory unavailable')
      setVenues(data.venues.filter(venue=>venue?.latitude!=null&&venue?.longitude!=null))
    }catch(error){setMapError(error instanceof Error?error.message:'Map inventory unavailable')}
    finally{setLoading(false)}
  }

  function navigate(id){
    if(id==='map'){void openMap();return}
    setMapOpen(false);setTab(id)
    if(id==='home')clickOriginal('now')||clickOriginal('home')
    if(id==='planner')clickOriginal('build')
    if(id==='calendar')clickOriginal('dates')
    if(id==='vault')clickOriginal('vault')
  }

  const filtered=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return venues;return venues.filter(v=>[v.name,v.neighborhood,v.category_key,v.subcategory,v.short_desc,...(v.is_black_owned?['black-owned']:[]),...(v.is_khg?['kollective']:[])].filter(Boolean).join(' ').toLowerCase().includes(needle))},[query,venues])
  const bbox=CITY_BBOX[city]||CITY_BBOX.atlanta
  const plannerVisible=!mapOpen&&tab==='planner'

  return <>
    <GoodTimesInteractionHost/>
    {plannerVisible&&<PlannerSwitcher/>}
    {mapOpen&&<section aria-label={`GOOD TIMES map for ${cityLabel(city)}`} style={{position:'fixed',inset:'0 0 calc(70px + env(safe-area-inset-bottom,0px)) 0',zIndex:7900,background:'#07070C',color:'#F5F0E8',overflowY:'auto'}}>
      <div style={{position:'sticky',top:0,zIndex:3,padding:'calc(14px + env(safe-area-inset-top,0px)) 16px 12px',background:'linear-gradient(180deg,rgba(7,7,12,.98),rgba(7,7,12,.90))',backdropFilter:'blur(14px)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
        <div style={{fontSize:9,letterSpacing:'.18em',fontWeight:900,color:'#D4A853'}}>LIVE CITY MAP</div>
        <div style={{display:'flex',alignItems:'end',gap:12,marginTop:3}}><div style={{flex:1}}><h1 style={{fontSize:28,margin:0,fontFamily:"'Playfair Display',serif"}}>{cityLabel(city)}</h1><p style={{fontSize:11,color:'rgba(245,240,232,.5)',margin:'4px 0 0'}}>{filtered.length} verified, deduped GOOD TIMES places</p></div><button onClick={()=>{setMapOpen(false);navigate('home')}} style={{width:38,height:38,borderRadius:99,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.05)',color:'#fff',fontSize:20}}>×</button></div>
        <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'0 12px',background:'rgba(255,255,255,.04)'}}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Neighborhood, food, nightlife, Black-owned…" style={{flex:1,minWidth:0,height:42,border:0,outline:0,background:'transparent',color:'#fff',fontSize:13}}/>{query&&<button onClick={()=>setQuery('')} style={{border:0,background:'transparent',color:'rgba(255,255,255,.55)',fontSize:18}}>×</button>}</div>
      </div>
      <div style={{height:'42vh',minHeight:270,position:'relative',borderBottom:'1px solid rgba(255,255,255,.08)'}}><iframe title={`${cityLabel(city)} GOOD TIMES map`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`} style={{width:'100%',height:'100%',border:0,filter:'saturate(.75) contrast(1.05)'}}/><div><b>{filtered.length}</b> map-ready places in {cityLabel(city)}</div><div style={{position:'absolute',left:12,bottom:12,padding:'7px 10px',borderRadius:999,background:'rgba(7,7,12,.82)',backdropFilter:'blur(8px)',fontSize:9,fontWeight:900,letterSpacing:'.08em',color:'#F2D58F'}}>CANONICAL LIVE INVENTORY</div></div>
      <div style={{padding:'14px 14px 36px'}}>
        {loading&&<div style={{padding:36,textAlign:'center',color:'rgba(245,240,232,.52)'}}>Loading live places…</div>}
        {mapError&&<div style={{padding:14,borderRadius:12,background:'rgba(255,80,80,.08)',color:'#ffb8b8'}}>{mapError}</div>}
        {!loading&&!mapError&&!filtered.length&&<div style={{padding:36,textAlign:'center',color:'rgba(245,240,232,.52)'}}>No matching map-ready places.</div>}
        <div style={{display:'grid',gap:10}}>{filtered.slice(0,60).map(venue=><article key={venue.id} style={{display:'grid',gridTemplateColumns:venue.hero_image?'78px 1fr':'1fr',gap:12,padding:11,border:'1px solid rgba(255,255,255,.08)',borderRadius:16,background:'rgba(255,255,255,.03)'}}>{venue.hero_image&&<img src={venue.hero_image} alt="" style={{width:78,height:78,borderRadius:11,objectFit:'cover'}}/>}<div style={{minWidth:0}}><div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:4}}>{venue.is_khg&&<span style={{fontSize:8,color:'#F2D58F',fontWeight:900}}>KOLLECTIVE</span>}{venue.is_black_owned&&<span style={{fontSize:8,color:'#A9F5D0',fontWeight:900}}>BLACK-OWNED</span>}</div><strong style={{fontSize:14}}>{venue.name}</strong><div style={{fontSize:10,color:'rgba(245,240,232,.48)',marginTop:3}}>{venue.neighborhood||venue.category_key}{venue.google_rating?` · ★ ${Number(venue.google_rating).toFixed(1)}`:''}</div><div style={{display:'flex',gap:7,marginTop:9,flexWrap:'wrap'}}>{directions(venue)&&<a href={directions(venue)} target="_blank" rel="noreferrer" style={{textDecoration:'none',padding:'7px 10px',borderRadius:9,background:'rgba(212,168,83,.14)',color:'#F2D58F',fontSize:9,fontWeight:900}}>Directions</a>}{(venue.booking_link||venue.website)&&<a href={venue.booking_link||venue.website} target="_blank" rel="noreferrer" style={{textDecoration:'none',padding:'7px 10px',borderRadius:9,border:'1px solid rgba(255,255,255,.1)',color:'#fff',fontSize:9,fontWeight:900}}>{venue.booking_link?'Book':'Website'}</a>}</div></div></article>)}</div>
      </div>
    </section>}

    <nav className="gt-five-nav" aria-label="GOOD TIMES main navigation" style={{position:'fixed',left:'50%',bottom:0,transform:'translateX(-50%)',zIndex:9100,width:'min(430px,100%)',height:'calc(70px + env(safe-area-inset-bottom,0px))',padding:'7px 8px env(safe-area-inset-bottom,0px)',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:2,background:'rgba(7,7,12,.96)',backdropFilter:'blur(18px)',borderTop:'1px solid rgba(255,255,255,.08)',boxShadow:'0 -12px 32px rgba(0,0,0,.28)'}}>
      {NAV.map(([id,icon,label])=><button key={id} onClick={()=>navigate(id)} aria-current={tab===id?'page':undefined} style={{border:0,background:id==='planner'&&tab===id?'linear-gradient(180deg,rgba(212,168,83,.18),rgba(212,168,83,.05))':'transparent',color:tab===id?'#F2D58F':'rgba(245,240,232,.48)',borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,fontSize:9,fontWeight:800,letterSpacing:'.04em',cursor:'pointer'}}><span style={{fontSize:id==='planner'?20:17,lineHeight:1}}>{icon}</span><small style={{fontSize:9,fontWeight:900}}>{label}</small></button>)}
    </nav>
  </>
}
