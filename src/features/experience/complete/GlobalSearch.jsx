import React,{useEffect,useMemo,useState} from 'react'
import {loadExplorePage} from '../../intelligence/client.js'
import {selectedCityClock,eventIsTonight,eventIsThisWeekend} from '../good-times-event-clock.js'
import {shiftDate} from './model.js'
import {useBrowse} from './useBrowse.js'
import {CollectionGrid} from './Collections.jsx'
import {Section,State,Skeleton} from './Cards.jsx'
import {routeSearchIntent} from './search-intent.js'

export default function GlobalSearch({initialQuery='',savedKeys,onEvent,onVenue,onSave,onClose,onPlan}){
 const [query,setQuery]=useState(initialQuery),[mode,setMode]=useState('best'),[places,setPlaces]=useState([]),[placeState,setPlaceState]=useState('idle'),[placeError,setPlaceError]=useState(''),[debounced,setDebounced]=useState(initialQuery)
 const intent=useMemo(()=>routeSearchIntent(debounced),[debounced]),clock=selectedCityClock('atlanta')
 useEffect(()=>{const t=setTimeout(()=>setDebounced(query.trim()),240);return()=>clearTimeout(t)},[query])
 useEffect(()=>{if(!debounced){setPlaces([]);setPlaceState('idle');return}const c=new AbortController();setPlaceState('loading');setPlaceError('');loadExplorePage('Atlanta',{query:debounced,limit:12,sort:'quality'},{signal:c.signal}).then(r=>{setPlaces(r.items||[]);setPlaceState('success')}).catch(e=>{if(!c.signal.aborted){setPlaces([]);setPlaceState('error');setPlaceError(e.message)}});return()=>c.abort()},[debounced])
 const rangeTo=intent.time==='tonight'?clock.date:intent.time==='weekend'?shiftDate(clock.date,7):shiftDate(clock.date,180)
 const events=useBrowse({kind:'events',query:debounced,category:intent.category||'',from:clock.serviceDate,to:rangeTo,limit:18},Boolean(debounced))
 const showPlaces=mode==='places'||mode==='best'&&intent.mode!=='entertainment',showEntertainment=mode==='entertainment'||mode==='best'&&intent.mode!=='places'
 const placeItems=showPlaces?places:[]
 const eventItems=showEntertainment?events.items.filter(e=>intent.time==='tonight'?eventIsTonight(e,'atlanta'):intent.time==='weekend'?eventIsThisWeekend(e,'atlanta'):true):[]
 return <section className="gtc-global-search">
  <header className="gtc-page-heading"><button onClick={onClose} aria-label="Back from search">←</button><div><h1>Search GOOD TIMES</h1><small>Places, entertainment, or both—without making you learn our taxonomy.</small></div></header>
  <div className="gtc-search"><input autoFocus aria-label="Search GOOD TIMES" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Seafood date night, clubs tonight, Hawks watch party…"/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}>×</button>}</div>
  <nav className="gtc-tabs" aria-label="Search result type">{[['best','Best Match'],['places','Places'],['entertainment','Entertainment']].map(([id,label])=><button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</nav>
  {debounced&&<p className="gtc-search-intent">Searching <strong>{intent.mode==='both'?'Places + Entertainment':intent.mode==='places'?'Places':'Entertainment'}</strong>{intent.category?<> · {intent.category.replaceAll('_',' ')}</>:null}</p>}
  {!debounced&&<State title="Ask GOOD TIMES what you want" body="Try “Black-owned seafood date night,” “clubs tonight,” “family things Saturday,” or “dinner before the Hawks game.”"/>}
  {debounced&&showPlaces&&<Section title="Places" subtext="Persistent destinations matching your intent.">{placeState==='loading'?<Skeleton count={4}/>:placeState==='error'?<State error title="Places could not refresh" body={placeError}/>:placeItems.length?<CollectionGrid items={placeItems} {...{savedKeys,onVenue,onSave}}/>:<State title="No verified places match yet" body="Try a broader neighborhood, cuisine or place type."/>}</Section>}
  {debounced&&showEntertainment&&<Section title="Entertainment" subtext="Time-based events and activities matching your intent.">{events.status==='loading'?<Skeleton count={4}/>:events.status==='error'?<State error title="Entertainment could not refresh" body={events.error} action={<button onClick={events.reload}>Retry</button>}/>:eventItems.length?<CollectionGrid items={eventItems} {...{savedKeys,onEvent,onSave}}/>:<State title="Nothing confirmed for that entertainment search yet" body="Try another date or a broader activity."/>}</Section>}
  {debounced&&intent.mode==='both'&&(placeItems.length||eventItems.length)>0&&<button className="gtc-plan-band" onClick={onPlan}><span><strong>Turn these results into a plan.</strong><small>Combine a place and something to do.</small></span><span aria-hidden="true">＋</span></button>}
 </section>
}
