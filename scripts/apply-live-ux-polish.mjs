import fs from 'node:fs'

const liveUrl=new URL('../src/features/experience/GoodTimesLiveApp.jsx',import.meta.url)
const paymentsUrl=new URL('../src/features/experience/GoodTimesPaymentsLauncher.jsx',import.meta.url)
let live=fs.readFileSync(liveUrl,'utf8')
let payments=fs.readFileSync(paymentsUrl,'utf8')

const nativeImport="import { openLink, shareContent } from '../../native.js'"
if(!live.includes(nativeImport)){
  const marker="import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'"
  if(!live.includes(marker))throw new Error('GOOD TIMES live UX polish could not locate the Supabase import')
  live=live.replace(marker,`${marker}\n${nativeImport}`)
}

if(!live.includes('function planDirectionsUrl(plan)')){
  const marker="function uniqueBy(rows,keyFn) {\n  const seen=new Set();return rows.filter(row=>{const key=keyFn(row);if(!key||seen.has(key))return false;seen.add(key);return true})\n}"
  if(!live.includes(marker))throw new Error('GOOD TIMES live UX polish could not locate uniqueBy helper')
  const helpers=`${marker}\nfunction planStops(plan){return Array.isArray(plan?.stops)?plan.stops.filter(Boolean):[]}\nfunction planShareText(plan,fallbackCity){\n  const stops=planStops(plan)\n  const header=[plan?.name||'My GOOD TIMES plan',plan?.itinerary_date?formatDate(plan.itinerary_date,true):null,cityLabel(plan?.city_id||fallbackCity)].filter(Boolean).join(' · ')\n  const route=stops.map((stop,index)=>\`${'${index+1}'}. ${'${stop.name||stop.venue||stop.address||`Stop ${index+1}`}'}`+' — '+`\${formatTime(stop.time)}\`).join('\\n')\n  return [header,route,'Built with GOOD TIMES™'].filter(Boolean).join('\\n\\n')\n}\nfunction planDirectionsUrl(plan){\n  const stops=planStops(plan).map(stop=>String(stop.address||stop.venue||stop.name||'').trim()).filter(Boolean)\n  if(!stops.length)return null\n  if(stops.length===1)return \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(stops[0])}\`\n  const params=new URLSearchParams({api:'1',origin:stops[0],destination:stops[stops.length-1],travelmode:'driving'})\n  if(stops.length>2)params.set('waypoints',stops.slice(1,-1).join('|'))\n  return \`https://www.google.com/maps/dir/?\${params.toString()}\`\n}`
  live=live.replace(marker,helpers)
}

if(!live.includes("const sharePlan=async plan=>")){
  const marker="  const openVenue=item=>{setSelectedVenue(item);recordProductEvent({eventName:'venue_opened',surface:screen,objectType:'venue',objectId:item.id,city},session);recordTasteSignal({entityType:'venue',entityId:item.id,signalType:'view',city},session)}"
  if(!live.includes(marker))throw new Error('GOOD TIMES live UX polish could not locate venue action helpers')
  const actions=`${marker}\n  const sharePlan=async plan=>{\n    const shared=await shareContent({title:plan?.name||'My GOOD TIMES plan',text:planShareText(plan,city),url:'https://thegoodtimesworldwide.com',dialogTitle:'Share this GOOD TIMES plan'})\n    recordProductEvent({eventName:'plan_shared',surface:'plans',objectType:'itinerary',objectId:String(plan?.id||''),city},session)\n    setToast(shared?'Plan ready to share.':'Share canceled.')\n  }\n  const navigatePlan=async plan=>{\n    const url=planDirectionsUrl(plan)\n    if(!url){setToast('Add a stop before opening directions.');return}\n    recordProductEvent({eventName:'plan_directions_opened',surface:'plans',objectType:'itinerary',objectId:String(plan?.id||''),city},session)\n    await openLink(url)\n  }\n  const openTicketWallet=()=>{\n    setVaultType('tickets')\n    window.dispatchEvent(new CustomEvent('goodtimes:open-tickets',{detail:{view:'wallet'}}))\n  }`
  live=live.replace(marker,actions)
}

const oldPlans=`      {screen==='plans'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>PLANS</span><h1>Your nights.</h1><p>Agent-built and personally saved itineraries.</p></div>{plans.length?<div className="gtlive-plans">{plans.map(plan=><article key={plan.id}><div><span>{plan.created_by==='good_times_live'?'LIVE-BUILT':'SAVED PLAN'}</span><h2>{plan.name||'Your Good Times plan'}</h2><p>{formatDate(plan.itinerary_date,true)} · {cityLabel(plan.city_id||city)} · {plan.group_size||1} guests</p></div>{(plan.stops||[]).map((stop,index)=><div className="gtlive-mini-stop" key={\`${'${stop.id}'}-${'${index}'}\`}><b>{index+1}</b><span><small>{stop.role||stop.type||'STOP'}</small><strong>{stop.name}</strong><em>{formatTime(stop.time)} · {stop.venue||stop.address||''}</em></span></div>)}</article>)}</div>:<div className="gtlive-compact-empty"><span>✦</span><h2>Your first plan starts now.</h2><p>Build a full night from live events and verified places.</p><button onClick={()=>setScreen('build')}>Build my night</button></div>}</section>}`
const newPlans=`      {screen==='plans'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>PLANS</span><h1>Your nights.</h1><p>Agent-built itineraries you can actually use, route and share.</p></div>{plans.length?<div className="gtlive-plans">{plans.map(plan=><article key={plan.id}><div><span>{plan.created_by==='good_times_live'?'LIVE-BUILT':'SAVED PLAN'}</span><h2>{plan.name||'Your Good Times plan'}</h2><p>{formatDate(plan.itinerary_date,true)} · {cityLabel(plan.city_id||city)} · {plan.group_size||1} guests</p></div>{(plan.stops||[]).map((stop,index)=><div className="gtlive-mini-stop" key={\`${'${stop.id}'}-${'${index}'}\`}><b>{index+1}</b><span><small>{stop.role||stop.type||'STOP'}</small><strong>{stop.name}</strong><em>{formatTime(stop.time)} · {stop.venue||stop.address||''}</em></span></div>)}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.10)'}}><button type="button" onClick={()=>navigatePlan(plan)} style={{minHeight:43,borderRadius:13,border:'1px solid rgba(245,204,117,.26)',background:'rgba(245,204,117,.08)',color:'#f5cc75',fontSize:9,fontWeight:900}}>Directions ↗</button><button type="button" onClick={()=>sharePlan(plan)} style={{minHeight:43,borderRadius:13,border:0,background:'linear-gradient(135deg,#f5cc75,#f4a95b)',color:'#211409',fontSize:9,fontWeight:900}}>Share plan</button></div></article>)}</div>:<div className="gtlive-compact-empty"><span>✦</span><h2>Your first plan starts now.</h2><p>Build a full night from live events and verified places.</p><button onClick={()=>setScreen('build')}>Build my night</button></div>}</section>}`
if(!live.includes(newPlans)){
  if(!live.includes(oldPlans))throw new Error('GOOD TIMES live UX polish could not locate Plans screen contract')
  live=live.replace(oldPlans,newPlans)
}

const oldVault=`      {screen==='vault'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>VAULT</span><h1>Keep the good ones.</h1><p>{savedItems.length} saved moves and places.</p></div><div className="gtlive-segment"><button className={vaultType==='events'?'active':''} onClick={()=>setVaultType('events')}>Events ({savedEvents.length})</button><button className={vaultType==='places'?'active':''} onClick={()=>setVaultType('places')}>Places ({savedVenues.length})</button></div>{vaultType==='events'?(savedEvents.length?<div className="gtlive-grid">{savedEvents.map(item=><EventCard key={item.event_key} event={item} saved onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>)}</div>:<div className="gtlive-compact-empty"><span>☆</span><h2>Save your next move.</h2><p>Tap the star on any event to keep it here.</p><button onClick={()=>setScreen('dates')}>Find events</button></div>):(savedVenues.length?<div className="gtlive-grid">{savedVenues.map(item=><VenueCard key={item.id} venue={item} saved onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div>:<div className="gtlive-compact-empty"><span>◇</span><h2>Build your city list.</h2><p>Save the places you want to try next.</p><button onClick={()=>setScreen('explore')}>Explore Atlanta</button></div>)}</section>}`
const newVault=`      {screen==='vault'&&<section className="gtlive-page"><div className="gtlive-page-head"><span>VAULT</span><h1>Keep the good ones.</h1><p>Tickets, saved moves and places in one Vault.</p></div><div className="gtlive-segment"><button className={vaultType==='events'?'active':''} onClick={()=>setVaultType('events')}>Events ({savedEvents.length})</button><button className={vaultType==='places'?'active':''} onClick={()=>setVaultType('places')}>Places ({savedVenues.length})</button><button className={vaultType==='tickets'?'active':''} onClick={openTicketWallet}>Tickets</button></div>{vaultType==='events'?(savedEvents.length?<div className="gtlive-grid">{savedEvents.map(item=><EventCard key={item.event_key} event={item} saved onOpen={()=>openEvent(item)} onSave={()=>toggleSave('event',item.event_key)}/>)}</div>:<div className="gtlive-compact-empty"><span>☆</span><h2>Save your next move.</h2><p>Tap the star on any event to keep it here.</p><button onClick={()=>setScreen('dates')}>Find events</button></div>):vaultType==='places'?(savedVenues.length?<div className="gtlive-grid">{savedVenues.map(item=><VenueCard key={item.id} venue={item} saved onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div>:<div className="gtlive-compact-empty"><span>◇</span><h2>Build your city list.</h2><p>Save the places you want to try next.</p><button onClick={()=>setScreen('explore')}>Explore {cityLabel(city)}</button></div>):<div className="gtlive-compact-empty"><span>▣</span><h2>Your real tickets live here.</h2><p>Open the secure wallet tied to your GOOD TIMES account to view ticket numbers, entry credentials and check-in status.</p><button onClick={openTicketWallet}>Open my tickets</button></div>}</section>}`
if(!live.includes(newVault)){
  if(!live.includes(oldVault))throw new Error('GOOD TIMES live UX polish could not locate Vault screen contract')
  live=live.replace(oldVault,newVault)
}

if(!payments.includes("goodtimes:open-tickets")){
  const marker="  useEffect(()=>{if(open&&view==='shop'&&events.length===0)void loadCatalog()},[open,view])\n  useEffect(()=>{if(open&&view==='wallet')void loadWallet()},[open,view])"
  if(!payments.includes(marker))throw new Error('GOOD TIMES live UX polish could not locate payments launcher effects')
  payments=payments.replace(marker,`${marker}\n  useEffect(()=>{\n    const handleOpenTickets=event=>{setOpen(true);setView(event?.detail?.view==='shop'?'shop':'wallet')}\n    window.addEventListener('goodtimes:open-tickets',handleOpenTickets)\n    return()=>window.removeEventListener('goodtimes:open-tickets',handleOpenTickets)\n  },[])`)
}

const required=[nativeImport,'function planDirectionsUrl(plan)',"const sharePlan=async plan=>","vaultType==='tickets'","goodtimes:open-tickets"]
for(const marker of required){
  if(!(live.includes(marker)||payments.includes(marker)))throw new Error(`GOOD TIMES live UX polish missing ${marker}`)
}
fs.writeFileSync(liveUrl,live)
fs.writeFileSync(paymentsUrl,payments)
console.log('GOOD TIMES Plans + Vault UX polish applied.')
