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
  "  const openEvent=item=>{setSelectedEvent(item);recordProductEvent({eventName:'event_opened',surface:screen,objectType:'event',objectId:item.event_key,city},session);recordTasteSignal({entityType:'event',entityId:item.event_key,signalType:'view',city},session)}\n  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city},session)}",
  "  const refreshIntelligence=()=>loadIntelligenceProfile(session).then(setIntelligence).catch(()=>null)\n  const openEvent=item=>{setSelectedEvent(item);recordProductEvent({eventName:'event_opened',surface:screen,objectType:'event',objectId:item.event_key,city,properties:{category:item.category_key,subcategory:item.subcategory_key}},session);recordTasteSignal({entityType:'event',entityId:item.event_key,signalType:'view',city,metadata:{category:item.category_key,venue:item.venue_name}},session).then(refreshIntelligence)}\n  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city,properties:{category:item.category_key,neighborhood:item.neighborhood}},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city,metadata:{category:item.category_key,neighborhood:item.neighborhood,price_range:item.price_range}},session).then(refreshIntelligence)}",
  'taste learning events',
)

replaceOnce(
  '        <Rail kicker="RIGHT NOW"',
  `        {personalizedEvents.length>0&&<Rail kicker="FOR YOU" title={intelligence?.signal_count?"Picked from your taste":"Your starter picks"} action={<button onClick={()=>setScreen('explore')}>Tune my feed</button>}>\n          {personalizedEvents.slice(0,10).map(item=><EventCard key={\`personal-\${item.event_key}\`} event={item} saved={savedKeys.has(\`event:\${item.event_key}\`)} onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>) }\n        </Rail>}\n\n        <Rail kicker="RIGHT NOW"`,
  'personalized home rail',
)

fs.writeFileSync(target, source)
console.log('GOOD TIMES personalized feed activated')
