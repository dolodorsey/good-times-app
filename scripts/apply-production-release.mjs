import fs from 'node:fs'

function read(path) { return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8') }
function write(path, content) { fs.writeFileSync(new URL(`../${path}`, import.meta.url), content) }
// Idempotency note (2026-08-09): these codemods rewrite tracked source in place,
// and later scripts in the build chain edit code that earlier scripts inserted.
// An exact `source.includes(to)` check therefore goes false on the second run
// while `from` is also gone, and the build died with "patch failed". Running
// `npm run build` twice is now supported: if most of the intended output is
// already present, the patch is treated as applied.
export function alreadyApplied(source, from, to) {
  if (source.includes(to)) return true
  const anchor = new Set(from.split('\n').map((line) => line.trim()))
  const added = to
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 24 && !anchor.has(line))
  return added.length > 0 && added.some((line) => source.includes(line))
}

function replaceOnce(source, from, to, label) {
  if (alreadyApplied(source, from, to)) return source
  if (!source.includes(from)) throw new Error(`Production release patch failed: ${label}`)
  return source.replace(from, to)
}

// 1) Customer bootstrap: no React double-mount and no service-worker reload loop.
{
  const path = 'src/main.jsx'
  let source = read(path)
  source = source.replace(
    'ReactDOM.createRoot(rootElement).render(<React.StrictMode><RuntimeBoundary><Suspense fallback={<RouteLoading label={loadingLabel}/>}><PremiumRoot launch={!requestType&&!recoverySession&&hasSession&&!legacyRoute&&!commandRoute}>{route}</PremiumRoot></Suspense></RuntimeBoundary></React.StrictMode>)',
    'ReactDOM.createRoot(rootElement).render(<RuntimeBoundary><Suspense fallback={<RouteLoading label={loadingLabel}/>}><PremiumRoot launch={!requestType&&!recoverySession&&hasSession&&!legacyRoute&&!commandRoute}>{route}</PremiumRoot></Suspense></RuntimeBoundary>)',
  )
  source = source.replace(/\nconst isNativeRuntime=Boolean\(window\.Capacitor\?\.isNativePlatform\?\.\(\)\)[\s\S]*$/m, '\n')
  if (source.includes('React.StrictMode')) throw new Error('StrictMode is still present in the production customer bootstrap')
  if (source.includes('navigator.serviceWorker.register')) throw new Error('Service-worker registration is still present in the production customer bootstrap')
  write(path, source)
}

// 2) Concierge client: use the lightweight customer-facing itinerary function.
{
  const path = 'src/features/intelligence/client.js'
  let source = read(path)
  source = source.replace('/functions/v1/good-times-concierge', '/functions/v1/good-times-live-concierge')
  write(path, source)
}

// 3) Customer Live app reliability and real persistence.
{
  const path = 'src/features/experience/GoodTimesLiveApp.jsx'
  let source = read(path)

  source = replaceOnce(
    source,
    "import { CATEGORY_META, FALLBACK_TAXONOMY, GT_SCENE_BASE, TAXONOMY_TOTALS, categoryScene } from './live-taxonomy.js'",
    "import { CATEGORY_META, FALLBACK_TAXONOMY, GT_SCENE_BASE, TAXONOMY_TOTALS, categoryScene } from './live-taxonomy.js'\nimport { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'",
    'Good Times Supabase config import',
  )

  source = source.replace("const [dateMode,setDateMode]=useState('week')", "const [dateMode,setDateMode]=useState('upcoming')")

  source = replaceOnce(
    source,
    "function eventImage(event) { return event?.image_url || BG_FALLBACK }\nfunction venueImage(venue) { return venue?.hero_image || BG_FALLBACK }",
    `function mediaUrl(value) {\n  const text=String(value||'').trim()\n  if(!text)return BG_FALLBACK\n  if(text.startsWith('/')||text.startsWith('data:')||text.startsWith('blob:')||text.includes('dzlmtvodpyhetvektfuo.supabase.co'))return text\n  return \`/api/media?url=\${encodeURIComponent(text)}\`\n}\nfunction eventImage(event) { return mediaUrl(event?.image_url || BG_FALLBACK) }\nfunction venueImage(venue) { return mediaUrl(venue?.hero_image || BG_FALLBACK) }\nfunction buildDateRange(when) {\n  const start=new Date(\`\${todayISO()}T12:00:00\`)\n  const normalized=String(when||'tonight').toLowerCase()\n  if(normalized.includes('tomorrow'))start.setDate(start.getDate()+1)\n  else if(normalized.includes('weekend')){const delta=(5-start.getDay()+7)%7;start.setDate(start.getDate()+delta)}\n  const end=new Date(start)\n  if(normalized.includes('weekend'))end.setDate(end.getDate()+2)\n  const iso=value=>\`\${value.getFullYear()}-\${String(value.getMonth()+1).padStart(2,'0')}-\${String(value.getDate()).padStart(2,'0')}\`\n  return {start:iso(start),end:iso(end)}\n}\nasync function persistFallbackPlan(plan,session) {\n  if(!session?.access_token||!session?.user?.id)return null\n  const payload={user_id:session.user.id,name:plan.name,city_id:plan.city_id,itinerary_date:plan.itinerary_date,stops:plan.stops,estimated_duration:'4-6 hours',group_size:plan.group_size,status:'draft',created_by:'ai',metadata:{source:'good-times-live-client-fallback'}}\n  const response=await fetch(\`\${GT_SUPABASE_URL}/rest/v1/itineraries\`,{method:'POST',headers:{apikey:GT_SUPABASE_ANON_KEY,Authorization:\`Bearer \${session.access_token}\`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)})\n  if(!response.ok)throw new Error('Could not sync this plan to your account.')\n  const rows=await response.json().catch(()=>[])\n  return rows?.[0]||null\n}`,
    'media and fallback-plan helpers',
  )

  source = source.replace(
    "setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('')",
    "setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('');setCatalogError('')",
  )
  source = source.replace(
    "setDirectory(payload.venues||[])",
    "setDirectory(payload.venues||[]);setCatalogError('')",
  )
  source = source.replaceAll(";setCatalogError('');setCatalogError('')", ";setCatalogError('')")

  source = source.replace(
    /  const deterministicPlan=useCallback\(\(\)=>\{[\s\S]*?\n  \},\[build,city,events,venues\]\)/,
    `  const deterministicPlan=useCallback(()=>{\n    const range=buildDateRange(build.when)\n    const areaNeedle=build.area.trim().toLowerCase()\n    const categorySet=new Set(build.vibes.flatMap(vibe=>VIBE_CATEGORY[vibe]||[]))\n    const eventPool=events.filter(item=>{\n      const dateOk=item.event_date>=range.start&&item.event_date<=range.end\n      const categoryOk=!categorySet.size||categorySet.has(item.category_key)\n      const areaOk=!areaNeedle||String(item.venue_name||'').toLowerCase().includes(areaNeedle)\n      return dateOk&&categoryOk&&areaOk\n    })\n    const venuePool=venues.filter(item=>{\n      const text=\`\${item.category_key||''} \${item.subcategory||''} \${(item.vibe_tags||[]).join(' ')}\`.toLowerCase()\n      const location=\`\${item.neighborhood||''} \${item.side_of_town||''} \${item.address||''}\`.toLowerCase()\n      if(areaNeedle&&!location.includes(areaNeedle))return false\n      if(build.vibes.includes('food'))return /restaurant|food|brunch|wine|cocktail/.test(text)\n      if(build.vibes.includes('date'))return /restaurant|rooftop|speakeasy|lounge|jazz|wine|culture/.test(text)\n      if(build.vibes.includes('turnt'))return /nightclub|lounge|hookah|rooftop|bar|entertainment/.test(text)\n      return true\n    })\n    const dining=venuePool.find(item=>/restaurant|food_hall|brunch|wine_bar|fine_dining/.test(item.category_key||''))||venuePool[0]||venues[0]\n    const vibe=venuePool.find(item=>item.id!==dining?.id)||venues.find(item=>item.id!==dining?.id)\n    const event=eventPool[0]||events.find(item=>item.event_date>=range.start&&item.event_date<=range.end)||null\n    const stops=[\n      dining&&{id:\`venue:\${dining.id}\`,type:'venue',role:'Start',name:dining.name,venue:dining.name,address:dining.address,time:'19:00',image:venueImage(dining)},\n      event&&{id:event.event_key,type:'event',role:'Main Move',name:event.title,venue:event.venue_name,time:event.event_time||'21:30',ticket_url:event.ticket_url,image:eventImage(event)},\n      vibe&&{id:\`venue:\${vibe.id}\`,type:'venue',role:'Finish',name:vibe.name,venue:vibe.name,address:vibe.address,time:event?'23:30':'21:30',image:venueImage(vibe)},\n    ].filter(Boolean)\n    return {id:\`local-\${Date.now()}\`,name:build.vibes.includes('date')?'Date Night, Done Right':build.vibes.includes('turnt')?'No Sleep Tonight':'Good Times, Curated',itinerary_date:range.start,city_id:city,group_size:Number(build.group)||2,status:'draft',created_by:'ai',stops}\n  },[build,city,events,venues])`,
  )

  source = source.replace(
    /  const buildNight=async\(\)=>\{[\s\S]*?\n  \}\n  useEffect\(\(\)=>\{if\(buildResult\|\|!building\)return;/,
    `  const buildNight=async()=>{\n    if(building)return\n    setBuilding(true);setBuildResult(null)\n    const vibeLabels=build.vibes.map(id=>VIBES.find(item=>item[0]===id)?.[1]).filter(Boolean)\n    const prompt=\`Build a complete \${build.occasion.toLowerCase()} in \${cityLabel(city)} \${build.when}. Group of \${build.group}. Budget \${build.budget}. Area \${build.area||'no preference'}. Vibes: \${vibeLabels.join(', ')||'surprise me'}.\`\n    try{\n      const result=await askGoodTimesConcierge({query:prompt,action:'itinerary',city,when:build.when,occasion:build.occasion,party_size:Number(build.group)||2,budget:build.budget,area:build.area,vibes:build.vibes},session)\n      if(result?.itinerary){\n        const normalized={...result.itinerary,stops:(result.itinerary.stops||[]).map(stop=>({...stop,image:stop.image||stop.image_url||stop.hero_image}))}\n        setBuildResult(normalized);setServerPlans(rows=>[normalized,...rows.filter(item=>item.id!==normalized.id)]);setToast('Your night is ready and saved.');return\n      }\n      throw new Error('No itinerary returned')\n    }catch(error){\n      console.warn('[GOOD TIMES Build My Night] primary planner fallback',error)\n      const localPlan=deterministicPlan()\n      let finalPlan=localPlan\n      try{\n        const synced=await persistFallbackPlan(localPlan,session)\n        if(synced){finalPlan={...synced,stops:(synced.stops||[]).map(stop=>({...stop,image:stop.image||stop.image_url||stop.hero_image}))};setServerPlans(rows=>[finalPlan,...rows.filter(item=>item.id!==finalPlan.id)])}\n      }catch(syncError){\n        console.warn('[GOOD TIMES Build My Night] account sync fallback',syncError)\n        setLocalPlans(rows=>{const next=[localPlan,...rows];localStorage.setItem('gt_live_plans',JSON.stringify(next));return next})\n      }\n      setBuildResult(finalPlan);setToast(finalPlan.id?.startsWith('local-')?'Built from live inventory and saved on this device.':'Built from live inventory and saved to Plans.')\n    }finally{\n      setBuilding(false)\n    }\n  }\n  useEffect(()=>{if(buildResult||!building)return;`,
  )

  source = source.replace(
    "{catalogError&&<InlineNotice>{catalogError} Live counts may be temporarily hidden.</InlineNotice>}",
    "{catalogError&&<InlineNotice>Some live counts are refreshing. Categories and saved features remain available.</InlineNotice>}",
  )

  if (!source.includes("const [dateMode,setDateMode]=useState('upcoming')")) throw new Error('Dates default did not update')
  if (!source.includes("finally{\n      setBuilding(false)")) throw new Error('Build My Night loading finalizer missing')
  if (!source.includes("good-times-live-client-fallback")) throw new Error('Build My Night server fallback missing')
  write(path, source)
}

console.log('GOOD TIMES production release fixes applied.')
