import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { clearSession, readSession, updatePreferences } from '../auth/client.js'
import {
  askGoodTimesConcierge,
  cityLabel,
  cityOptions,
  loadGoodTimesProfile,
  loadItineraries,
  loadSavedItems,
  recordProductEvent,
  recordTasteSignal,
  saveItem,
  todayISO,
  unsaveItem,
} from '../intelligence/client.js'
import { CATEGORY_META, FALLBACK_TAXONOMY, GT_SCENE_BASE, TAXONOMY_TOTALS, categoryScene } from './live-taxonomy.js'
import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'

const NAV = [
  ['home','⌂','Now'],['dates','▦','Dates'],['build','✦','Build'],['plans','≋','Plans'],['explore','◇','Explore'],['vault','▣','Vault'],
]
const VIBES = [
  ['grown','Grown & Sexy'],['turnt','High Energy'],['date','Date Night'],['live','Live Music'],['food','Foodie'],['culture','Culture'],['free','Free'],['vip','VIP'],
]
const VIBE_CATEGORY = {
  grown:['nightlife','dining_culinary','dating_social'], turnt:['nightlife','concerts_live_music','day_parties_brunch'],
  date:['dating_social','dining_culinary','arts_museums_culture'], live:['concerts_live_music','nightlife'],
  food:['dining_culinary','day_parties_brunch'], culture:['black_culture_diaspora','arts_museums_culture'],
  free:['free_things_to_do','community_civic'], vip:['vip_exclusive','nightlife'],
}
const CATEGORY_LABEL = Object.fromEntries(FALLBACK_TAXONOMY.map(item=>[item.id,item.name]))
const BG_FALLBACK = `${GT_SCENE_BASE}/gt-homescreen-atlanta.webp`

async function getJson(path) {
  const response = await fetch(path, { cache:'no-store', headers:{ Accept:'application/json' } })
  const payload = await response.json().catch(()=>null)
  if (!response.ok || !payload?.ok) throw new Error(payload?.detail || payload?.error || `Request failed (${response.status})`)
  return payload
}
function formatDate(value, long=false) {
  if (!value) return 'Date TBA'
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString(undefined, long
    ? { weekday:'long',month:'long',day:'numeric',year:'numeric' }
    : { weekday:'short',month:'short',day:'numeric' })
}
function formatTime(value) {
  if (!value || value === 'TBA') return 'Time TBA'
  const match = String(value).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
}
function daysAway(value) {
  const today = new Date(`${todayISO()}T12:00:00`)
  const date = new Date(`${value}T12:00:00`)
  return Math.round((date - today) / 86400000)
}
function mergeTaxonomy(live=[]) {
  const liveMap = new Map(live.map(item=>[item.id,item]))
  return FALLBACK_TAXONOMY.map(base=>{
    const remote = liveMap.get(base.id) || {}
    const remoteSubs = new Map((remote.subcategories || []).map(item=>[item.id,item]))
    return {
      ...base,...remote,
      icon:CATEGORY_META[base.id]?.icon || base.icon,
      accent:CATEGORY_META[base.id]?.accent || base.accent,
      scene:CATEGORY_META[base.id]?.scene || base.scene,
      subcategories:base.subcategories.map(sub=>({ ...sub,...(remoteSubs.get(sub.id)||{}) })),
    }
  })
}
function mediaUrl(value) {
  const text=String(value||'').trim()
  if(!text)return BG_FALLBACK
  if(text.startsWith('/')||text.startsWith('data:')||text.startsWith('blob:')||text.includes('dzlmtvodpyhetvektfuo.supabase.co'))return text
  return `/api/media?url=${encodeURIComponent(text)}`
}
function eventImage(event) { return mediaUrl(event?.image_url || BG_FALLBACK) }
function venueImage(venue) { return mediaUrl(venue?.hero_image || BG_FALLBACK) }
function buildDateRange(when) {
  const start=new Date(`${todayISO()}T12:00:00`)
  const normalized=String(when||'tonight').toLowerCase()
  if(normalized.includes('tomorrow'))start.setDate(start.getDate()+1)
  else if(normalized.includes('weekend')){const delta=(5-start.getDay()+7)%7;start.setDate(start.getDate()+delta)}
  const end=new Date(start)
  if(normalized.includes('weekend'))end.setDate(end.getDate()+2)
  const iso=value=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`
  return {start:iso(start),end:iso(end)}
}
async function persistFallbackPlan(plan,session) {
  if(!session?.access_token||!session?.user?.id)return null
  const payload={user_id:session.user.id,name:plan.name,city_id:plan.city_id,itinerary_date:plan.itinerary_date,stops:plan.stops,estimated_duration:'4-6 hours',group_size:plan.group_size,status:'draft',created_by:'ai',metadata:{source:'good-times-live-client-fallback'}}
  const response=await fetch(`${GT_SUPABASE_URL}/rest/v1/itineraries`,{method:'POST',headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)})
  if(!response.ok)throw new Error('Could not sync this plan to your account.')
  const rows=await response.json().catch(()=>[])
  return rows?.[0]||null
}
function uniqueBy(rows,keyFn) {
  const seen=new Set();return rows.filter(row=>{const key=keyFn(row);if(!key||seen.has(key))return false;seen.add(key);return true})
}

function EventCard({event,saved,onOpen,onSave,wide=false}) {
  const meta=CATEGORY_META[event.category_key]||CATEGORY_META.nightlife
  return <article className={`gtlive-event ${wide?'wide':''}`} onClick={onOpen} style={{'--accent':meta.accent}}>
    <img src={eventImage(event)} alt="" loading="lazy"/><div className="gtlive-card-veil"/>
    <button className={saved?'saved':''} onClick={click=>{click.stopPropagation();onSave()}} aria-label="Save event">{saved?'★':'☆'}</button>
    <div className="gtlive-event-date"><b>{new Date(`${event.event_date}T12:00:00`).getDate()}</b><span>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</span></div>
    <div className="gtlive-card-copy"><small>{CATEGORY_LABEL[event.category_key]||'GOOD TIMES PICK'}</small><h3>{event.title}</h3><p>{formatTime(event.event_time)} · {event.venue_name||'Location TBA'}</p></div>
  </article>
}
function VenueCard({venue,saved,onOpen,onSave}) {
  return <article className="gtlive-venue" onClick={onOpen}>
    <img src={venueImage(venue)} alt="" loading="lazy"/><div className="gtlive-card-veil"/>
    <button className={saved?'saved':''} onClick={click=>{click.stopPropagation();onSave()}} aria-label="Save place">{saved?'★':'☆'}</button>
    <div className="gtlive-venue-tags">{venue.is_black_owned&&<span>BLACK-OWNED</span>}{venue.is_khg&&<span>KOLLECTIVE</span>}</div>
    <div className="gtlive-card-copy"><small>{String(venue.category_key||'place').replaceAll('_',' ')}</small><h3>{venue.name}</h3><p>{venue.neighborhood||cityLabel(venue.city_key)}{venue.google_rating?` · ★ ${Number(venue.google_rating).toFixed(1)}`:''}</p></div>
  </article>
}
function Rail({title,kicker,action,children}) {
  return <section className="gtlive-section"><div className="gtlive-section-head"><div><span>{kicker}</span><h2>{title}</h2></div>{action}</div><div className="gtlive-rail">{children}</div></section>
}
function InlineNotice({children,onRetry}) {
  return <div className="gtlive-notice"><span>!</span><p>{children}</p>{onRetry&&<button onClick={onRetry}>Retry</button>}</div>
}
function Modal({children,onClose}) {
  return <div className="gtlive-modal-backdrop" onMouseDown={onClose}><div className="gtlive-modal" onMouseDown={event=>event.stopPropagation()}><button className="gtlive-close" onClick={onClose}>×</button>{children}</div></div>
}

export default function GoodTimesLiveApp() {
  const session=useMemo(()=>readSession(),[])
  const [screen,setScreen]=useState('home')
  const [city,setCity]=useState('atlanta')
  const [profile,setProfile]=useState(null)
  const [events,setEvents]=useState([])
  const [venues,setVenues]=useState([])
  const [taxonomy,setTaxonomy]=useState(()=>mergeTaxonomy())
  const [savedItems,setSavedItems]=useState([])
  const [serverPlans,setServerPlans]=useState([])
  const [localPlans,setLocalPlans]=useState(()=>{try{return JSON.parse(localStorage.getItem('gt_live_plans')||'[]')}catch{return[]}})
  const [loading,setLoading]=useState(true)
  const [dataError,setDataError]=useState('')
  const [catalogError,setCatalogError]=useState('')
  const [query,setQuery]=useState('')
  const [dateMode,setDateMode]=useState('upcoming')
  const [eventCategory,setEventCategory]=useState('all')
  const [selectedEvent,setSelectedEvent]=useState(null)
  const [selectedVenue,setSelectedVenue]=useState(null)
  const [selectedCategory,setSelectedCategory]=useState(null)
  const [selectedSubcategory,setSelectedSubcategory]=useState(null)
  const [directory,setDirectory]=useState([])
  const [directoryLoading,setDirectoryLoading]=useState(false)
  const [mapMode,setMapMode]=useState(false)
  const [vaultType,setVaultType]=useState('events')
  const [toast,setToast]=useState('')
  const [build,setBuild]=useState({occasion:'A night out',when:'tonight',group:'2',area:'',budget:'mid',vibes:['grown']})
  const [building,setBuilding]=useState(false)
  const [buildResult,setBuildResult]=useState(null)

  const loadAccount=useCallback(async nextProfile=>{
    if(!nextProfile?.id)return
    const [saved,plans]=await Promise.all([
      loadSavedItems(nextProfile.id,session).catch(()=>[]),loadItineraries(session).catch(()=>[]),
    ])
    setSavedItems(saved||[]);setServerPlans(plans||[])
  },[session])

  const loadCity=useCallback(async nextCity=>{
    setLoading(true);setDataError('');setCatalogError('')
    const [dataResult,catalogResult]=await Promise.allSettled([
      getJson(`/api/data?city=${encodeURIComponent(nextCity)}&event_limit=500&venue_limit=700`),
      getJson(`/api/catalog?city=${encodeURIComponent(nextCity)}&mode=taxonomy`),
    ])
    if(dataResult.status==='fulfilled'){
      setEvents(dataResult.value.events||[]);setVenues(dataResult.value.venues||[])
    }else setDataError(dataResult.reason?.message||'Live inventory is reconnecting.')
    if(catalogResult.status==='fulfilled') setTaxonomy(mergeTaxonomy(catalogResult.value.categories||[]))
    else {setTaxonomy(mergeTaxonomy());setCatalogError(catalogResult.reason?.message||'Live category counts are reconnecting.')}
    setLoading(false)
  },[])

  useEffect(()=>{let active=true;(async()=>{
    const nextProfile=await loadGoodTimesProfile(session).catch(()=>null)
    if(!active)return
    setProfile(nextProfile)
    const nextCity=nextProfile?.last_city||nextProfile?.home_city||'atlanta'
    setCity(nextCity)
    await Promise.all([loadCity(nextCity),loadAccount(nextProfile)])
  })();return()=>{active=false}},[loadAccount,loadCity,session])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(timer)},[toast])

  const savedKeys=useMemo(()=>new Set(savedItems.map(item=>`${item.item_type}:${item.item_id}`)),[savedItems])
  const hero=useMemo(()=>events.find(item=>item.is_featured&&item.image_url)||events.find(item=>item.image_url)||null,[events])
  const tonight=useMemo(()=>events.filter(item=>item.event_date===todayISO()),[events])
  const nextSeven=useMemo(()=>events.filter(item=>daysAway(item.event_date)>=0&&daysAway(item.event_date)<=7),[events])
  const blackOwned=useMemo(()=>venues.filter(item=>item.is_black_owned),[venues])
  const hotPlaces=useMemo(()=>venues.filter(item=>item.is_featured||item.is_culture_pick||Number(item.google_rating)>=4.5),[venues])
  const eventCategories=useMemo(()=>{
    const counts=new Map();events.forEach(item=>counts.set(item.category_key,(counts.get(item.category_key)||0)+1));return [...counts].sort((a,b)=>b[1]-a[1])
  },[events])
  const filteredEvents=useMemo(()=>{
    const needle=query.toLowerCase().trim()
    return events.filter(item=>{
      const categoryOk=eventCategory==='all'||item.category_key===eventCategory
      const away=daysAway(item.event_date)
      const dateOk=dateMode==='today'?away===0:dateMode==='week'?away>=0&&away<=7:away>=0
      const searchOk=!needle||[item.title,item.venue_name,item.category_key,item.subcategory_key,item.organizer].filter(Boolean).join(' ').toLowerCase().includes(needle)
      return categoryOk&&dateOk&&searchOk
    })
  },[dateMode,eventCategory,events,query])
  const selectedTaxonomy=taxonomy.find(item=>item.id===selectedCategory)||null
  const filteredDirectory=useMemo(()=>{
    const needle=query.toLowerCase().trim()
    return directory.filter(item=>!needle||[item.name,item.neighborhood,item.short_desc,item.subcategory,...(item.vibe_tags||[])].filter(Boolean).join(' ').toLowerCase().includes(needle))
  },[directory,query])
  const savedEvents=useMemo(()=>events.filter(item=>savedKeys.has(`event:${item.event_key}`)),[events,savedKeys])
  const savedVenues=useMemo(()=>venues.filter(item=>savedKeys.has(`venue:${item.id}`)),[venues,savedKeys])
  const plans=useMemo(()=>[...localPlans,...serverPlans],[localPlans,serverPlans])

  const switchCity=async nextCity=>{
    setCity(nextCity);setSelectedCategory(null);setSelectedSubcategory(null);setDirectory([]);setQuery('')
    if(session?.user?.id)await updatePreferences(session.user.id,{last_city:nextCity},session.access_token).catch(()=>false)
    await loadCity(nextCity)
  }
  const toggleSave=async(type,id)=>{
    if(!profile?.id){setToast('Your profile is reconnecting.');return}
    const key=`${type}:${id}`;const exists=savedKeys.has(key)
    try{
      if(exists){await unsaveItem({profileId:profile.id,itemType:type,itemId:id},session);setSavedItems(rows=>rows.filter(item=>`${item.item_type}:${item.item_id}`!==key));setToast('Removed from Vault.')}
      else{await saveItem({profileId:profile.id,itemType:type,itemId:id},session);setSavedItems(await loadSavedItems(profile.id,session));setToast('Saved to Vault.')}
    }catch(error){setToast(error.message||'Save failed.')}
  }
  const openEvent=item=>{setSelectedEvent(item);recordProductEvent({eventName:'event_opened',surface:screen,objectType:'event',objectId:item.event_key,city},session);recordTasteSignal({entityType:'event',entityId:item.event_key,signalType:'view',city},session)}
  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city},session)}

  const loadDirectory=async(categoryId,subcategoryId=null)=>{
    setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('');setCatalogError('')
    try{
      const params=new URLSearchParams({mode:'directory',city,category:categoryId,limit:'600'})
      if(subcategoryId)params.set('subcategory',subcategoryId)
      const payload=await getJson(`/api/catalog?${params}`)
      setDirectory(payload.venues||[]);setCatalogError('')
    }catch(error){
      setDirectory(venues.slice(0,120));setCatalogError(error.message||'Directory is reconnecting.')
    }finally{setDirectoryLoading(false)}
  }

  const deterministicPlan=useCallback(()=>{
    const range=buildDateRange(build.when)
    const areaNeedle=build.area.trim().toLowerCase()
    const categorySet=new Set(build.vibes.flatMap(vibe=>VIBE_CATEGORY[vibe]||[]))
    const eventPool=events.filter(item=>{
      const dateOk=item.event_date>=range.start&&item.event_date<=range.end
      const categoryOk=!categorySet.size||categorySet.has(item.category_key)
      const areaOk=!areaNeedle||String(item.venue_name||'').toLowerCase().includes(areaNeedle)
      return dateOk&&categoryOk&&areaOk
    })
    const venuePool=venues.filter(item=>{
      const text=`${item.category_key||''} ${item.subcategory||''} ${(item.vibe_tags||[]).join(' ')}`.toLowerCase()
      const location=`${item.neighborhood||''} ${item.side_of_town||''} ${item.address||''}`.toLowerCase()
      if(areaNeedle&&!location.includes(areaNeedle))return false
      if(build.vibes.includes('food'))return /restaurant|food|brunch|wine|cocktail/.test(text)
      if(build.vibes.includes('date'))return /restaurant|rooftop|speakeasy|lounge|jazz|wine|culture/.test(text)
      if(build.vibes.includes('turnt'))return /nightclub|lounge|hookah|rooftop|bar|entertainment/.test(text)
      return true
    })
    const dining=venuePool.find(item=>/restaurant|food_hall|brunch|wine_bar|fine_dining/.test(item.category_key||''))||venuePool[0]||venues[0]
    const vibe=venuePool.find(item=>item.id!==dining?.id)||venues.find(item=>item.id!==dining?.id)
    const event=eventPool[0]||events.find(item=>item.event_date>=range.start&&item.event_date<=range.end)||null
    const stops=[
      dining&&{id:`venue:${dining.id}`,type:'venue',role:'Start',name:dining.name,venue:dining.name,address:dining.address,time:'19:00',image:venueImage(dining)},
      event&&{id:event.event_key,type:'event',role:'Main Move',name:event.title,venue:event.venue_name,time:event.event_time||'21:30',ticket_url:event.ticket_url,image:eventImage(event)},
      vibe&&{id:`venue:${vibe.id}`,type:'venue',role:'Finish',name:vibe.name,venue:vibe.name,address:vibe.address,time:event?'23:30':'21:30',image:venueImage(vibe)},
    ].filter(Boolean)
    return {id:`local-${Date.now()}`,name:build.vibes.includes('date')?'Date Night, Done Right':build.vibes.includes('turnt')?'No Sleep Tonight':'Good Times, Curated',itinerary_date:range.start,city_id:city,group_size:Number(build.group)||2,status:'draft',created_by:'ai',stops}
  },[build,city,events,venues])

  const buildNight=async()=>{
    if(building)return
    setBuilding(true);setBuildResult(null)
    const vibeLabels=build.vibes.map(id=>VIBES.find(item=>item[0]===id)?.[1]).filter(Boolean)
    const prompt=`Build a complete ${build.occasion.toLowerCase()} in ${cityLabel(city)} ${build.when}. Group of ${build.group}. Budget ${build.budget}. Area ${build.area||'no preference'}. Vibes: ${vibeLabels.join(', ')||'surprise me'}.`
    try{
      const result=await askGoodTimesConcierge({query:prompt,action:'itinerary',city,when:build.when,occasion:build.occasion,party_size:Number(build.group)||2,budget:build.budget,area:build.area,vibes:build.vibes},session)
      if(result?.itinerary){
        const normalized={...result.itinerary,stops:(result.itinerary.stops||[]).map(stop=>({...stop,image:stop.image||stop.image_url||stop.hero_image}))}
        setBuildResult(normalized);setServerPlans(rows=>[normalized,...rows.filter(item=>item.id!==normalized.id)]);setToast('Your night is ready and saved.');return
      }
      throw new Error('No itinerary returned')
    }catch(error){
      console.warn('[GOOD TIMES Build My Night] primary planner fallback',error)
      const localPlan=deterministicPlan()
      let finalPlan=localPlan
      try{
        const synced=await persistFallbackPlan(localPlan,session)
        if(synced){finalPlan={...synced,stops:(synced.stops||[]).map(stop=>({...stop,image:stop.image||stop.image_url||stop.hero_image}))};setServerPlans(rows=>[finalPlan,...rows.filter(item=>item.id!==finalPlan.id)])}
      }catch(syncError){
        console.warn('[GOOD TIMES Build My Night] account sync fallback',syncError)
        setLocalPlans(rows=>{const next=[localPlan,...rows];localStorage.setItem('gt_live_plans',JSON.stringify(next));return next})
      }
      setBuildResult(finalPlan);setToast(finalPlan.id?.startsWith('local-')?'Built from live inventory and saved on this device.':'Built from live inventory and saved to Plans.')
    }finally{
      setBuilding(false)
    }
  }
  useEffect(()=>{if(buildResult||!building)return;const timer=setTimeout(()=>setBuilding(false),15000);return()=>clearTimeout(timer)},[buildResult,building])

  const heroImage=hero?eventImage(hero):venueImage(hotPlaces[0])
  if(loading&&!events.length&&!venues.length)return <div className="gtlive-loader"><div style={{backgroundImage:`url(${BG_FALLBACK})`}}/><img src="/good-times-logo.png" alt="GOOD TIMES"/><span>Loading Atlanta’s real moves</span></div>

  return <div className="gtlive-app">
    <header className="gtlive-topbar">
      <button className="gtlive-brand" onClick={()=>setScreen('home')}><img src="/good-times-logo.png" alt="GOOD TIMES"/><span>LIVE CITY CONCIERGE</span></button>
      <select value={city} onChange={event=>switchCity(event.target.value)} aria-label="City">{cityOptions.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select>
    </header>

    <main className="gtlive-scroll">
      {dataError&&<InlineNotice onRetry={()=>loadCity(city)}>Live inventory is reconnecting. Categories and saved features remain available.</InlineNotice>}

      {screen==='home'&&<>
        <section className="gtlive-hero" style={{backgroundImage:`url(${heroImage||BG_FALLBACK})`}}>
          <div className="gtlive-hero-veil"/><div className="gtlive-orb one"/><div className="gtlive-orb two"/>
          <div className="gtlive-hero-copy"><span>{hero?'THE MOVE RIGHT NOW':'ATLANTA IS OUTSIDE'}</span><h1>{hero?.title||'Find the night worth remembering.'}</h1><p>{hero?`${formatDate(hero.event_date)} · ${formatTime(hero.event_time)} · ${hero.venue_name||'Atlanta'}`:`${venues.length||'800+'} verified places · ${TAXONOMY_TOTALS.categories} categories · ${TAXONOMY_TOTALS.subcategories} ways to go out`}</p><div>{hero&&<button onClick={()=>openEvent(hero)}>See the move</button>}<button onClick={()=>setScreen('build')}>Build my night ✦</button></div></div>
          <div className="gtlive-live-badge"><i/>LIVE</div>
        </section>

        <div className="gtlive-quick-row">{[['Tonight','dates'],['Build My Night','build'],['Explore 25 Lanes','explore'],['Black-Owned','explore']].map(([label,target])=><button key={label} onClick={()=>{setScreen(target);if(label==='Black-Owned')setQuery('black-owned')}}>{label}<span>›</span></button>)}</div>

        <Rail kicker="RIGHT NOW" title={tonight.length?'Atlanta tonight':'Next up'} action={<button onClick={()=>setScreen('dates')}>See all</button>}>
          {(tonight.length?tonight:events).slice(0,12).map(item=><EventCard key={item.event_key} event={item} saved={savedKeys.has(`event:${item.event_key}`)} onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>) }
        </Rail>

        <Rail kicker="CITY ENERGY" title="Hot places" action={<button onClick={()=>setScreen('explore')}>Explore</button>}>
          {(hotPlaces.length?hotPlaces:venues).slice(0,12).map(item=><VenueCard key={item.id} venue={item} saved={savedKeys.has(`venue:${item.id}`)} onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>) }
        </Rail>

        <section className="gtlive-category-block"><div className="gtlive-section-head"><div><span>CHOOSE YOUR LANE</span><h2>What are we on?</h2></div><button onClick={()=>setScreen('explore')}>All 25</button></div><div className="gtlive-category-mosaic">{taxonomy.slice(0,8).map(item=><button key={item.id} style={{'--accent':item.accent,backgroundImage:`url(${categoryScene(item)})`}} onClick={()=>{setScreen('explore');loadDirectory(item.id)}}><div/><span>{item.icon}</span><strong>{item.name}</strong><small>{item.subcategories.length} ways in</small></button>)}</div></section>

        {blackOwned.length>0&&<Rail kicker="CULTURE LAYER" title="Black-owned Atlanta" action={<button onClick={()=>setScreen('explore')}>See more</button>}>
          {blackOwned.slice(0,10).map(item=><VenueCard key={item.id} venue={item} saved={savedKeys.has(`venue:${item.id}`)} onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>) }
        </Rail>}

        <Rail kicker="NEXT SEVEN DAYS" title="Worth leaving home for" action={<button onClick={()=>{setDateMode('week');setScreen('dates')}}>Calendar</button>}>
          {nextSeven.slice(0,12).map(item=><EventCard key={item.event_key} event={item} saved={savedKeys.has(`event:${item.event_key}`)} onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>) }
        </Rail>
      </>}

      {screen==='dates'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>DATES</span><h1>What’s the move?</h1><p>{filteredEvents.length} current experiences in {cityLabel(city)}</p></div><div className="gtlive-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Artist, venue, category, vibe…"/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div><div className="gtlive-segment">{[['upcoming','Upcoming'],['today','Today'],['week','This week']].map(([id,label])=><button className={dateMode===id?'active':''} key={id} onClick={()=>setDateMode(id)}>{label}</button>)}</div><div className="gtlive-chips"><button className={eventCategory==='all'?'active':''} onClick={()=>setEventCategory('all')}>All <small>{events.length}</small></button>{eventCategories.map(([id,count])=><button className={eventCategory===id?'active':''} key={id} onClick={()=>setEventCategory(id)}>{CATEGORY_LABEL[id]||id.replaceAll('_',' ')} <small>{count}</small></button>)}</div>{filteredEvents.length?<div className="gtlive-grid">{filteredEvents.map(item=><EventCard key={item.event_key} event={item} saved={savedKeys.has(`event:${item.event_key}`)} onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>)}</div>:<div className="gtlive-compact-empty"><span>✦</span><h2>No exact matches yet.</h2><p>Clear a filter or build a night from the full live inventory.</p><button onClick={()=>{setQuery('');setEventCategory('all');setDateMode('upcoming')}}>Reset</button></div>}</section>}

      {screen==='build'&&<section className="gtlive-build"><div className="gtlive-build-hero" style={{backgroundImage:`url(${GT_SCENE_BASE}/gt-bg-vip-arrival.webp)`}}><div/><span>YOUR LIVE EXPERIENCE AGENT</span><h1>Tell us the vibe.<br/>We’ll make the move.</h1><p>Real events. Verified places. One complete night.</p></div><div className="gtlive-build-card"><div className="gtlive-form-row"><label>Occasion<input value={build.occasion} onChange={event=>setBuild({...build,occasion:event.target.value})}/></label><label>When<select value={build.when} onChange={event=>setBuild({...build,when:event.target.value})}><option value="tonight">Tonight</option><option value="tomorrow">Tomorrow</option><option value="this weekend">This weekend</option></select></label></div><div className="gtlive-form-row"><label>Group<select value={build.group} onChange={event=>setBuild({...build,group:event.target.value})}>{['1','2','3','4','5','6','8','10'].map(value=><option value={value} key={value}>{value}</option>)}</select></label><label>Budget<select value={build.budget} onChange={event=>setBuild({...build,budget:event.target.value})}><option value="low">Keep it light</option><option value="mid">Comfortable</option><option value="high">Do it right</option><option value="luxury">No limits</option></select></label></div><label className="gtlive-wide-label">Area<input placeholder="Buckhead, Midtown, no preference…" value={build.area} onChange={event=>setBuild({...build,area:event.target.value})}/></label><div className="gtlive-vibes"><span>VIBE CHECK</span><div>{VIBES.map(([id,label])=><button className={build.vibes.includes(id)?'active':''} key={id} onClick={()=>setBuild({...build,vibes:build.vibes.includes(id)?build.vibes.filter(item=>item!==id):[...build.vibes,id]})}>{label}</button>)}</div></div><button className="gtlive-build-submit" disabled={building} onClick={buildNight}>{building?'Checking the city…':'Build My Night ✦'}</button><small>Good Times uses current inventory first and never invents a reservation.</small></div>{buildResult&&<div className="gtlive-built-plan"><div className="gtlive-section-head"><div><span>YOUR NIGHT</span><h2>{buildResult.name}</h2></div><button onClick={()=>setScreen('plans')}>View plans</button></div>{(buildResult.stops||[]).map((stop,index)=><div className="gtlive-stop" key={`${stop.id}-${index}`}><span>{index+1}</span>{stop.image&&<img src={stop.image} alt=""/>}<div><small>{stop.role||stop.type||'STOP'} · {formatTime(stop.time)}</small><strong>{stop.name}</strong><p>{stop.venue||stop.address||''}</p></div>{stop.ticket_url&&<a href={stop.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}</div>)}</div>}</section>}

      {screen==='plans'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>PLANS</span><h1>Your nights.</h1><p>Agent-built and personally saved itineraries.</p></div>{plans.length?<div className="gtlive-plans">{plans.map(plan=><article key={plan.id}><div><span>{plan.created_by==='good_times_live'?'LIVE-BUILT':'SAVED PLAN'}</span><h2>{plan.name||'Your Good Times plan'}</h2><p>{formatDate(plan.itinerary_date,true)} · {cityLabel(plan.city_id||city)} · {plan.group_size||1} guests</p></div>{(plan.stops||[]).map((stop,index)=><div className="gtlive-mini-stop" key={`${stop.id}-${index}`}><b>{index+1}</b><span><small>{stop.role||stop.type||'STOP'}</small><strong>{stop.name}</strong><em>{formatTime(stop.time)} · {stop.venue||stop.address||''}</em></span></div>)}</article>)}</div>:<div className="gtlive-compact-empty"><span>✦</span><h2>Your first plan starts now.</h2><p>Build a full night from live events and verified places.</p><button onClick={()=>setScreen('build')}>Build my night</button></div>}</section>}

      {screen==='explore'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>EXPLORE</span><h1>{selectedTaxonomy?.name||'The whole city.'}</h1><p>{TAXONOMY_TOTALS.categories} categories · {TAXONOMY_TOTALS.subcategories} subcategories · {venues.length||'800+'} verified places</p></div>{catalogError&&<InlineNotice>Some live counts are refreshing. Categories and saved features remain available.</InlineNotice>}<div className="gtlive-search"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Venue, neighborhood, category or vibe…"/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>{!selectedTaxonomy?<div className="gtlive-explore-grid">{taxonomy.map(item=><button key={item.id} style={{'--accent':item.accent,backgroundImage:`url(${categoryScene(item)})`}} onClick={()=>loadDirectory(item.id)}><div/><span>{item.icon}</span><strong>{item.name}</strong><small>{item.subcategories.length} subcategories · {item.count||'live'} places</small></button>)}</div>:<><div className="gtlive-explore-tools"><button onClick={()=>{setSelectedCategory(null);setSelectedSubcategory(null);setDirectory([])}}>‹ All categories</button><div><button className={!mapMode?'active':''} onClick={()=>setMapMode(false)}>Cards</button><button className={mapMode?'active':''} onClick={()=>setMapMode(true)}>Map</button></div></div><div className="gtlive-chips"><button className={!selectedSubcategory?'active':''} onClick={()=>loadDirectory(selectedCategory)}>All</button>{selectedTaxonomy.subcategories.map(item=><button className={selectedSubcategory===item.id?'active':''} key={item.id} onClick={()=>loadDirectory(selectedCategory,item.id)}>{item.name} <small>{item.count||''}</small></button>)}</div>{directoryLoading?<div className="gtlive-inline-loader">Finding the best-matched places…</div>:mapMode?<><div className="gtlive-map"><iframe title={`${cityLabel(city)} map`} src="https://www.openstreetmap.org/export/embed.html?bbox=-84.62%2C33.60%2C-84.15%2C34.02&layer=mapnik"/><div><b>{filteredDirectory.filter(item=>item.latitude!=null).length}</b> map-ready places</div></div><div className="gtlive-rail">{filteredDirectory.slice(0,20).map(item=><VenueCard key={item.id} venue={item} saved={savedKeys.has(`venue:${item.id}`)} onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div></>:filteredDirectory.length?<div className="gtlive-grid">{filteredDirectory.map(item=><VenueCard key={item.id} venue={item} saved={savedKeys.has(`venue:${item.id}`)} onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div>:<div className="gtlive-compact-empty"><span>{selectedTaxonomy.icon}</span><h2>This lane is being stocked.</h2><p>Browse another subcategory or check the live event calendar.</p><button onClick={()=>setScreen('dates')}>See events</button></div>}</>}</section>}

      {screen==='vault'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>VAULT</span><h1>Keep the good ones.</h1><p>{savedItems.length} saved moves and places.</p></div><div className="gtlive-segment"><button className={vaultType==='events'?'active':''} onClick={()=>setVaultType('events')}>Events ({savedEvents.length})</button><button className={vaultType==='places'?'active':''} onClick={()=>setVaultType('places')}>Places ({savedVenues.length})</button></div>{vaultType==='events'?(savedEvents.length?<div className="gtlive-grid">{savedEvents.map(item=><EventCard key={item.event_key} event={item} saved onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>)}</div>:<div className="gtlive-compact-empty"><span>☆</span><h2>Save your next move.</h2><p>Tap the star on any event to keep it here.</p><button onClick={()=>setScreen('dates')}>Find events</button></div>):(savedVenues.length?<div className="gtlive-grid">{savedVenues.map(item=><VenueCard key={item.id} venue={item} saved onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div>:<div className="gtlive-compact-empty"><span>◇</span><h2>Build your city list.</h2><p>Save the places you want to try next.</p><button onClick={()=>setScreen('explore')}>Explore Atlanta</button></div>)}</section>}

      {screen==='profile'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>PROFILE</span><h1>Your Good Times.</h1><p>{profile?.full_name||session?.user?.email||'Member'}</p></div><div className="gtlive-profile-card"><b>HOME CITY</b><strong>{cityLabel(city)}</strong><p>{savedItems.length} saved · {plans.length} plans</p><button onClick={()=>{clearSession();window.location.reload()}}>Sign out</button></div></section>}
    </main>

    <nav className="gtlive-nav">{NAV.map(([id,icon,label])=><button className={`${screen===id?'active':''} ${id==='build'?'build':''}`} key={id} onClick={()=>{setScreen(id);setQuery('')}}><span>{icon}</span><small>{label}</small></button>)}</nav>
    {toast&&<div className="gtlive-toast">{toast}</div>}

    {selectedEvent&&<Modal onClose={()=>setSelectedEvent(null)}><div className="gtlive-detail-hero"><img src={eventImage(selectedEvent)} alt=""/><div/></div><div className="gtlive-detail-copy"><span>{CATEGORY_LABEL[selectedEvent.category_key]||'GOOD TIMES PICK'}</span><h2>{selectedEvent.title}</h2><p>{formatDate(selectedEvent.event_date,true)} · {formatTime(selectedEvent.event_time)}</p><strong>{selectedEvent.venue_name||'Location TBA'}</strong><div>{selectedEvent.ticket_url&&<a href={selectedEvent.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}<button onClick={()=>toggleSave('event',selectedEvent.event_key)}>{savedKeys.has(`event:${selectedEvent.event_key}`)?'Saved ★':'Save ☆'}</button><button onClick={()=>{setSelectedEvent(null);setScreen('build');setBuild({...build,occasion:selectedEvent.title})}}>Build around this</button></div></div></Modal>}
    {selectedVenue&&<Modal onClose={()=>setSelectedVenue(null)}><div className="gtlive-detail-hero"><img src={venueImage(selectedVenue)} alt=""/><div/></div><div className="gtlive-detail-copy"><span>{String(selectedVenue.category_key||'PLACE').replaceAll('_',' ')}</span><h2>{selectedVenue.name}</h2><p>{selectedVenue.short_desc||`A verified Good Times place in ${selectedVenue.neighborhood||cityLabel(city)}.`}</p><strong>{selectedVenue.address||selectedVenue.neighborhood||cityLabel(city)}</strong><div>{selectedVenue.website&&<a href={selectedVenue.website} target="_blank" rel="noreferrer">Website</a>}{selectedVenue.booking_link&&<a href={selectedVenue.booking_link} target="_blank" rel="noreferrer">Book</a>}<button onClick={()=>toggleSave('venue',selectedVenue.id)}>{savedKeys.has(`venue:${selectedVenue.id}`)?'Saved ★':'Save ☆'}</button><button onClick={()=>{setSelectedVenue(null);setScreen('build');setBuild({...build,area:selectedVenue.neighborhood||selectedVenue.name})}}>Plan a night here</button></div></div></Modal>}
  </div>
}
