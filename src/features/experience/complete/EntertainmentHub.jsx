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
 ['games_interactive','Interactive','Puttshack, darts, VR, racing, game shows, creative play','interactive','gt-cat-adventure.webp'],
 ['family_kids','Family','Kids, family events, discovery','events','gt-cat-adventure.webp'],
 ['attractions_experiences','Attractions','Museums, exhibits, attractions','events','gt-cat-adventure.webp'],
]

const INTERACTIVE_MATCH=/puttshack|flight club|cosm|f1 arcade|andretti|topgolf|top golf|sandbox vr|great big game show|spin art|game show|mini golf|darts|vr|immersive|sim[_ -]?racing|karting|arcade|bowling|escape|splatter|rage room/i
const interactiveVenue=v=>INTERACTIVE_MATCH.test([v?.name,v?.category_key,v?.subcategory,v?.venue_subcategory,...(v?.vibe_tags||[]),...(v?.search_tags||[])].filter(Boolean).join(' '))

export function InteractiveCollection({venues=[],events=[],savedKeys,onEvent,onVenue,onSave,onBack}){
  const places=useMemo(()=>venues.filter(interactiveVenue).sort((a,b)=>Number(b.quality_score||0)-Number(a.quality_score||0)||String(a.name).localeCompare(String(b.name))).slice(0,30),[venues])
  const happenings=useMemo(()=>events.filter(e=>e.category_key==='games_interactive'||INTERACTIVE_MATCH.test([e.title,e.venue_name,e.subcategory_key].filter(Boolean).join(' '))).slice(0,16),[events])
  return <section className="gtc-entertainment gtc-interactive">
    <header className="gtc-page-heading"><button onClick={onBack} aria-label="Back to Entertainment">←</button><div><h1>Interactive</h1><small>Places to actually do something—games, immersive experiences, VR, racing, mini golf, creative play and live competition.</small></div></header>
    <Section title="Interactive places" subtext="Persistent Atlanta-area destinations. Open a place for details, hours and booking links.">
      {places.length?<CollectionGrid items={places} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>:<State title="Interactive places are still being completed" body="GOOD TIMES is filling this lane with real destinations rather than unrelated events."/>}
    </Section>
    <Section title="Interactive events" subtext="Dated programming stays separate from the permanent places above.">
      {happenings.length?<CollectionGrid items={happenings} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>:<State title="No dated interactive events confirmed yet" body="The places above remain available even when no special event is scheduled."/>}
    </Section>
  </section>
}

export default function EntertainmentHub({
  events=[],now=Date.now(),savedKeys,onEvent,onSave,onSearch,onOpenCategory,onOpenVenues,onOpenSports,onOpenInteractive,onPlan,initialMode='tonight'
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

    <div className="gtc-search"><input aria-label="Search Entertainment" placeholder="Clubs, concerts, sports, activities…" onKeyDown={e=>{if(e.key==='Enter'&&e.currentTarget.value.trim())onSearch?.(e.currentTarget.value)}}/><button aria-label="Search Entertainment globally" onClick={e=>{const input=e.currentTarget.previousElementSibling;if(input?.value.trim())onSearch?.(input.value)}}>⌕</button></div>
    <nav className="gtc-tabs gtc-entertainment-time" aria-label="Entertainment timing">
      {[['tonight','Tonight'],['weekend','This Weekend'],['upcoming','Upcoming']].map(([id,label])=>
        <button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>
      )}
    </nav>

    <div className="gtc-entertainment-lanes">
      {LANES.map(([key,label,desc,kind,art])=>
        <button key={label} className="gtc-entertainment-lane" style={{backgroundImage:`linear-gradient(90deg,rgba(5,6,7,.92),rgba(5,6,7,.48)),url("${gtAssetUrl(art,'good-times-backgrounds')}")`}} onClick={()=>kind==='sports'?onOpenSports():kind==='venues'?onOpenVenues(key):kind==='interactive'?onOpenInteractive?.():onOpenCategory(key)}>
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
