import fs from 'node:fs'

const target = 'src/features/experience/GoodTimesLiveApp.jsx'
let source = fs.readFileSync(target, 'utf8')

if (source.includes('GOOD_TIMES_PERSONALIZATION_ACTIVE')) {
  console.log('GOOD TIMES personalization already applied')
  process.exit(0)
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`GOOD TIMES personalization patch failed: ${label}`)
  source = source.replace(search, replacement)
}

replaceOnce(
  "import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'",
  "import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'\nimport { loadIntelligenceProfile, rankEventsForUser, rankVenuesForUser } from '../intelligence/personalization.js'\n\nconst GOOD_TIMES_PERSONALIZATION_ACTIVE = true",
  'personalization import',
)

replaceOnce(
  "  const [profile,setProfile]=useState(null)\n  const [events,setEvents]=useState([])",
  "  const [profile,setProfile]=useState(null)\n  const [intelligence,setIntelligence]=useState(null)\n  const [events,setEvents]=useState([])",
  'intelligence state',
)

replaceOnce(
  "    setProfile(nextProfile)\n    const nextCity=nextProfile?.last_city||nextProfile?.home_city||'atlanta'",
  "    setProfile(nextProfile)\n    const nextIntelligence=await loadIntelligenceProfile(session).catch(()=>null)\n    if(!active)return\n    setIntelligence(nextIntelligence)\n    const nextCity=nextProfile?.last_city||nextProfile?.home_city||'atlanta'",
  'initial intelligence load',
)

replaceOnce(
  "  const savedKeys=useMemo(()=>new Set(savedItems.map(item=>`${item.item_type}:${item.item_id}`)),[savedItems])\n  const hero=useMemo(()=>events.find(item=>item.is_featured&&item.image_url)||events.find(item=>item.image_url)||null,[events])",
  "  const savedKeys=useMemo(()=>new Set(savedItems.map(item=>`${item.item_type}:${item.item_id}`)),[savedItems])\n  const personalizedEvents=useMemo(()=>rankEventsForUser(events,profile,intelligence),[events,profile,intelligence])\n  const personalizedVenues=useMemo(()=>rankVenuesForUser(venues,profile,intelligence),[venues,profile,intelligence])\n  const hero=useMemo(()=>personalizedEvents.find(item=>item.is_featured&&item.image_url)||personalizedEvents.find(item=>item.image_url)||null,[personalizedEvents])",
  'personalized ranking memos',
)

replaceOnce(
  "  const blackOwned=useMemo(()=>venues.filter(item=>item.is_black_owned),[venues])",
  "  const blackOwned=useMemo(()=>personalizedVenues.filter(item=>item.is_black_owned),[personalizedVenues])",
  'personalized Black-Owned rail',
)
replaceOnce(
  "  const hotPlaces=useMemo(()=>venues.filter(item=>item.is_featured||item.is_culture_pick||Number(item.google_rating)>=4.5),[venues])",
  "  const hotPlaces=useMemo(()=>personalizedVenues.filter(item=>item.is_featured||item.is_culture_pick||Number(item.google_rating)>=4.5),[personalizedVenues])",
  'personalized hot places',
)

replaceOnce(
  "  const openEvent=item=>{setSelectedEvent(item);recordProductEvent({eventName:'event_opened',surface:screen,objectType:'event',objectId:item.event_key,city},session);recordTasteSignal({entityType:'event',entityId:item.event_key,signalType:'view',city},session)}\n  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city},session)}",
  "  const refreshIntelligence=()=>loadIntelligenceProfile(session).then(setIntelligence).catch(()=>null)\n  const trackConversion=(eventName,objectType,objectId,metadata={})=>{\n    const productEventName=eventName==='ticket_click'?'ticket_clicked':eventName==='reservation_click'?'reservation_clicked':eventName\n    recordProductEvent({eventName:productEventName,surface:screen,objectType,objectId,city,properties:metadata},session)\n    fetch('/api/growth-track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_name:eventName,city_key:city,source:'good-times-app',path:window.location.pathname,metadata:{object_type:objectType,object_id:String(objectId||''),...metadata}}),keepalive:true}).catch(()=>{})\n  }\n  const openEvent=item=>{setSelectedEvent(item);recordProductEvent({eventName:'event_opened',surface:screen,objectType:'event',objectId:item.event_key,city,properties:{category:item.category_key,subcategory:item.subcategory_key}},session);recordTasteSignal({entityType:'event',entityId:item.event_key,signalType:'view',city,metadata:{category:item.category_key,venue:item.venue_name}},session).then(refreshIntelligence)}\n  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city,properties:{category:item.category_key,neighborhood:item.neighborhood}},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city,metadata:{category:item.category_key,neighborhood:item.neighborhood,price_range:item.price_range}},session).then(refreshIntelligence)}",
  'taste learning and conversion events',
)

replaceOnce(
  '        <Rail kicker="RIGHT NOW"',
  `        {personalizedEvents.length>0&&<Rail kicker="FOR YOU" title={intelligence?.signal_count?"Picked from your taste":"Your starter picks"} action={<button onClick={()=>setScreen('explore')}>Tune my feed</button>}>\n          {personalizedEvents.slice(0,10).map(item=><EventCard key={\`personal-\${item.event_key}\`} event={item} saved={savedKeys.has(\`event:\${item.event_key}\`)} onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>) }\n        </Rail>}\n\n        <Rail kicker="RIGHT NOW"`,
  'personalized home rail',
)

replaceOnce(
  "{stop.ticket_url&&<a href={stop.ticket_url} target=\"_blank\" rel=\"noreferrer\">Tickets</a>}",
  "{stop.ticket_url&&<a href={stop.ticket_url} target=\"_blank\" rel=\"noreferrer\" onClick={()=>trackConversion('ticket_click',stop.type||'event',stop.id,{surface:'built_plan',name:stop.name})}>Tickets</a>}",
  'built-plan ticket tracking',
)

replaceOnce(
  "{selectedEvent.ticket_url&&<a href={selectedEvent.ticket_url} target=\"_blank\" rel=\"noreferrer\">Tickets</a>}",
  "{selectedEvent.ticket_url&&<a href={selectedEvent.ticket_url} target=\"_blank\" rel=\"noreferrer\" onClick={()=>trackConversion('ticket_click','event',selectedEvent.event_key,{surface:'event_detail',title:selectedEvent.title})}>Tickets</a>}",
  'event ticket tracking',
)

replaceOnce(
  "{selectedVenue.booking_link&&<a href={selectedVenue.booking_link} target=\"_blank\" rel=\"noreferrer\">Book</a>}",
  "{selectedVenue.booking_link&&<a href={selectedVenue.booking_link} target=\"_blank\" rel=\"noreferrer\" onClick={()=>trackConversion('reservation_click','venue',selectedVenue.id,{surface:'venue_detail',name:selectedVenue.name})}>Book</a>}",
  'venue reservation tracking',
)

fs.writeFileSync(target, source)
console.log('GOOD TIMES personalized feed, venue ranking, and conversions activated')
