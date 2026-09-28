import React,{useEffect,useMemo,useState} from 'react'
import {eventIsThisWeekend,eventIsTonight,eventDaysAway} from '../good-times-event-clock.js'
import {CollectionGrid,Sports} from './Collections.jsx'
import {Section,State} from './Cards.jsx'
import {gtAssetUrl} from '../good-times-assets.js'

const LANES=[
 ['nightlife','Nightlife','Parties, club nights, rooftops, after-hours','events','gt-cat-nightlife.webp'],
 ['nightlife','Bars & Lounges','Bars, lounges, hookah and social nightlife venues','venues','gt-cat-nightlife.webp'],
 ['concerts_live_music','Concerts','Artists, tours, live music','events','gt-cat-music.webp'],
 ['festivals_major_activations','Festivals + Events','Festivals, activations, major city moments','events','gt-cat-culture.webp'],
 ['sports_watch','Sports','Games, scores, watch parties','sports','gt-cat-sports.webp'],
 ['comedy_performing_arts','Comedy + Live','Comedy, theater, performing arts','events','gt-cat-culture.webp'],
 ['games_interactive','Interactive','Bowling, games, VR, escape rooms','events','gt-cat-adventure.webp'],
 ['family_kids','Family','Kids, family events, discovery','events','gt-cat-adventure.webp'],
 ['attractions_experiences','Attractions','Museums, exhibits, attractions','events','gt-cat-adventure.webp'],
]

export default function EntertainmentHub({
  events=[],now=Date.now(),savedKeys,onEvent,onSave,onSearch,onOpenCategory,onOpenVenues,onOpenSports,onPlan,initialMode='tonight'
}){
  const [mode,setMode]=useState(initialMode)
  useEffect(()=>{if(['tonight','weekend','upcoming'].includes(initialMode))setMode(initialMode)},[initialMode])
  const scoped=useMemo(()=>{
    const rows=events.filter(event=>{
      if(mode==='tonight')return eventIsTonight(event,'atlanta',now)
      if(mode==='weekend')return eventIsThisWeekend(event,'atlanta',now)
      return eventDaysAway(event.event_date,'atlanta',now)>=0
    }).sort((a,b)=>String(a.event_date||'9999').localeCompare(String(b.event_date||'9999'))||String(a.event_time||'99:99').localeCompare(String(b.event_time||'99:99')))
    return rows.slice(0,8)
  },[events,mode,now])

  return <section className="gtc-entertainment">
    <header className="gtc-page-heading">
      <div>
        <h1>Entertainment</h1>
        <small>What’s happening, what’s live, and what’s worth doing in Atlanta.</small>
      </div>
    </header>

    <div className="gtc-search"><input aria-label="Search Entertainment" placeholder="Clubs, concerts, festivals, sports, activities…" onKeyDown={e=>{if(e.key==='Enter'&&e.currentTarget.value.trim())onSearch?.(e.currentTarget.value)}}/><button aria-label="Search Entertainment globally" onClick={e=>{const input=e.currentTarget.previousElementSibling;if(input?.value.trim())onSearch?.(input.value)}}>⌕</button></div>
    <nav className="gtc-tabs gtc-entertainment-time" aria-label="Entertainment timing">
      {[['tonight','Tonight'],['weekend','This Weekend'],['upcoming','Upcoming']].map(([id,label])=>
        <button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>
      )}
    </nav>

    <div className="gtc-entertainment-lanes">
      {LANES.map(([key,label,desc,kind,art])=>
        <button key={label} className="gtc-entertainment-lane" style={{backgroundImage:`linear-gradient(90deg,rgba(5,6,7,.92),rgba(5,6,7,.48)),url("${gtAssetUrl(art,'good-times-backgrounds')}")`}} onClick={()=>kind==='sports'?onOpenSports():kind==='venues'?onOpenVenues(key):onOpenCategory(key)}>
          <span><strong>{label}</strong><small>{desc}</small></span><b aria-hidden="true">↗</b>
        </button>
      )}
    </div>

    <Section
      title={mode==='tonight'?'Tonight in Atlanta':mode==='weekend'?'This Weekend':'Upcoming'}
      subtext={mode==='tonight'?'Current entertainment options using Atlanta local time.':mode==='weekend'?'Friday through Sunday, ranked for useful browsing.':'The next things worth planning around.'}
      action={<button onClick={()=>onOpenCategory(null)}>See all ↗</button>}
    >
      {scoped.length
        ? <CollectionGrid items={scoped} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>
        : <State title="Nothing confirmed in this exact window yet" body="Try Upcoming or open a category. GOOD TIMES will not fill this space with unrelated listings."/>
      }
    </Section>

    <button className="gtc-plan-band" onClick={onPlan}>
      <span><strong>Build around what’s happening.</strong><small>Combine a place, event and next move into one plan.</small></span><span aria-hidden="true">＋</span>
    </button>
  </section>
}
