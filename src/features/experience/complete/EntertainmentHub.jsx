import React,{useMemo,useState} from 'react'
import {eventIsThisWeekend,eventIsTonight,eventDaysAway} from '../good-times-event-clock.js'
import {CollectionGrid,Sports} from './Collections.jsx'
import {Section,State} from './Cards.jsx'
import {labelFor} from './model.js'

const LANES=[
 ['nightlife','Nightlife','Clubs, lounges, rooftops, parties'],
 ['concerts_live_music','Concerts','Artists, tours, live music'],
 ['festivals_major_activations','Festivals + Events','Festivals, activations, major city moments'],
 ['sports_watch','Sports','Games, scores, watch parties'],
 ['comedy_performing_arts','Comedy + Live','Comedy, theater, performing arts'],
 ['games_interactive','Interactive','Bowling, games, VR, escape rooms'],
 ['family_kids','Family','Kids, family events, discovery'],
 ['attractions_experiences','Attractions','Museums, exhibits, attractions'],
]

export default function EntertainmentHub({
  events=[],now=Date.now(),savedKeys,onEvent,onSave,onOpenCategory,onOpenSports,onPlan
}){
  const [mode,setMode]=useState('tonight')
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

    <nav className="gtc-tabs gtc-entertainment-time" aria-label="Entertainment timing">
      {[['tonight','Tonight'],['weekend','This Weekend'],['upcoming','Upcoming']].map(([id,label])=>
        <button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>
      )}
    </nav>

    <div className="gtc-entertainment-lanes">
      {LANES.map(([key,label,desc])=>
        <button key={key} className="gtc-entertainment-lane" onClick={()=>key==='sports_watch'?onOpenSports():onOpenCategory(key)}>
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
