import React,{useEffect,useMemo,useState} from 'react'
import {collapseShows} from './dedupe.js'
import AdSlot from './AdSlot.jsx'
import {eventIsThisWeekend,eventIsTonight,eventDaysAway} from '../good-times-event-clock.js'
import {CollectionGrid,Sports} from './Collections.jsx'
import {Section,State} from './Cards.jsx'
import {Themed,ScreenHero,SearchBar,IconRail,Rail,PhotoTile,BuildTrio,Empty,Icon,SCENES} from './Kit.jsx'
import {EventPoster,VenuePoster} from './posters.jsx'
import {tonightOrNext} from './tonight.js'
import {FreeInTheABanner} from './FreeInTheA.jsx'
import {freeEvents} from './free-in-the-a.js'
import {nightlifeKind,topPlaces,ownerTypeLabel} from './top-places.js'
import {unique} from './model.js'
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

const ENT_RAIL=[
 {id:'concerts_live_music',label:'Concerts',icon:'music'},{id:'nightlife',label:'Parties',icon:'cocktail'},{id:'sports',label:'Sports',icon:'ball'},
 {id:'comedy_performing_arts',label:'Comedy',icon:'masks'},{id:'festivals_major_activations',label:'Festivals',icon:'tent'},{id:'arts_museums_culture',label:'Culture',icon:'landmark'},
 {id:'interactive',label:'Interactive',icon:'game'},{id:'family_kids',label:'Family',icon:'family'},{id:'venues',label:'Lounges',icon:'moon'},
]
const VIBES=[['nightlife-events','High Energy',SCENES.nightlife],['nightlife-venues','Chill',SCENES.lounge],['date-night','Date Night',SCENES.date],['interactive','Group Fun',SCENES.interactive],['culture','Cultural',SCENES.culture],['concerts','Live Music',SCENES.concert]]
export default function EntertainmentHub({
  events=[],venues=[],onVenue,onOpenFree,now=Date.now(),savedKeys,onEvent,onSave,onSearch,onOpenCategory,onOpenVenues,onOpenSports,onOpenInteractive,onPlan,onNavigate,initialMode='tonight'
}){
  const [mode,setMode]=useState(initialMode),[q,setQ]=useState('')
  useEffect(()=>{if(['tonight','weekend','upcoming'].includes(initialMode))setMode(initialMode)},[initialMode])
  const night=useMemo(()=>tonightOrNext(events,now),[events,now])
  const freeCount=useMemo(()=>freeEvents(events,now).length,[events,now])
  const scoped=useMemo(()=>{
    if(mode==='tonight')return collapseShows(night.rows).slice(0,12)
    const rows=events.filter(event=>{
      if(mode==='weekend')return eventIsThisWeekend(event,'atlanta',now)
      return eventDaysAway(event.event_date,'atlanta',now)>=0
    }).sort((a,b)=>String(a.event_date||'9999').localeCompare(String(b.event_date||'9999'))||String(a.event_time||'99:99').localeCompare(String(b.event_time||'99:99')))
    return collapseShows(rows).slice(0,12)
  },[events,mode,now,night])
  const afterDark=useMemo(()=>{const groups=new Map();for(const v of topPlaces(unique(venues),400)){const kind=nightlifeKind(v);if(!kind||/wine bar|sports bar/i.test(kind))continue;if(!groups.has(kind))groups.set(kind,[]);groups.get(kind).push(v)}return groups},[venues])
  // Owner 2026-11-10: owner-ranked nightlife (Opium, Magic City, Revel…) leads; the rest follow by kind.
  const afterDarkRows=useMemo(()=>{const order=['Nightclub','Lounge','Strip Club','Hookah Lounge','Rooftop Lounge','Speakeasy','Jazz Club'];const all=order.flatMap(k=>afterDark.get(k)||[]);const ranked=all.filter(v=>Number(v.editorial_rank)>0||ownerTypeLabel(v)).sort((a,b)=>(Number(a.editorial_rank)||99)-(Number(b.editorial_rank)||99));return [...ranked,...all.filter(v=>!ranked.includes(v))].slice(0,16)},[afterDark])
  const open=id=>id==='sports'?onOpenSports():id==='interactive'?onOpenInteractive?.():id==='venues'?onOpenVenues('nightlife'):onOpenCategory(id)
  const title=mode==='tonight'?(night.next?['Up','Next']:['Featured','Tonight']):mode==='weekend'?['This','Weekend']:['Coming','Up']
  return <Themed theme="violet" className="gtc-entertainment gtk-entertainment">
    <ScreenHero size="md" eyebrow="LIVE MORE · FEEL MORE" title="Entertainment" tagline="Events that make life extraordinary." image={SCENES.concert}>
      <SearchBar inputLabel="Search Entertainment" placeholder="Clubs, concerts, sports, activities…" value={q} onChange={setQ} onSubmit={v=>v.trim()&&onSearch?.(v)} onFilters={()=>q.trim()&&onSearch?.(q)}/>
    </ScreenHero>
    {onOpenFree&&<FreeInTheABanner count={freeCount} onOpen={onOpenFree}/>}
    <IconRail variant="circle" label="Entertainment categories" items={ENT_RAIL} onSelect={open}/>
    <nav className="gtc-tabs gtc-entertainment-time gtk-time-tabs" aria-label="Entertainment timing">
      {[['tonight','Tonight'],['weekend','This Weekend'],['upcoming','Upcoming']].map(([id,label])=>
        <button key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>
      )}
    </nav>
    <section className="gtk-section gtk-ent-results"><header className="gtk-section-head"><div><h2>{title[0]} <em>{title[1]}</em></h2><p>{mode==='tonight'?(night.next?`${night.title} · ${night.kicker.replace('UP NEXT · ','')}`:'Handpicked. Atlanta local time.'):mode==='weekend'?'Friday through Sunday.':'The next things worth planning around.'}</p></div><button type="button" className="gtk-see-all" onClick={()=>onOpenCategory(null)}>See All<Icon name="arrow" size={16}/></button></header>
      {scoped.length?<div className="gtk-scroller">{scoped.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</div>:<Empty title="Nothing confirmed in this exact window yet" body="Try Upcoming or open a category. GOOD TIMES will not fill this space with unrelated listings." action={<button onClick={()=>setMode('upcoming')}>See Upcoming</button>}/>}
    </section>
    {afterDarkRows.length>0&&<Rail title="Clubs, Lounges" accent="& After Dark" kicker="WHERE ATLANTA GOES OUT" onSeeAll={()=>onOpenVenues('nightlife')} className="gtk-after-dark">{afterDarkRows.map(v=><VenuePoster key={v.id} venue={v} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>)}</Rail>}
    <AdSlot placement="entertainment" slot={0}/>
    <section className="gtk-section"><header className="gtk-section-head"><div><h2>Explore <em>Entertainment</em></h2><p>Every lane, one tap away</p></div></header>
      <div className="gtc-entertainment-lanes gtk-lanes">
        {LANES.map(([key,label,desc,kind,art])=>
          <button key={label} className="gtc-entertainment-lane" style={{backgroundImage:`linear-gradient(180deg,rgba(5,6,7,.05),rgba(5,6,7,.9)),url("${gtAssetUrl(art,'good-times-backgrounds')}")`}} onClick={()=>kind==='sports'?onOpenSports():kind==='venues'?onOpenVenues(key):kind==='interactive'?onOpenInteractive?.():onOpenCategory(key)}>
            <span><strong>{label}</strong><small>{desc}</small></span><b aria-hidden="true">↗</b>
          </button>
        )}
      </div>
    </section>
    <Rail title="Browse by" accent="Vibe" subtitle="Find your kind of good time">{VIBES.map(([id,label,img])=><PhotoTile key={id} image={img} label={label} onClick={()=>onNavigate?.(id)}/>)}</Rail>
    <AdSlot placement="entertainment" slot={1}/>
    <BuildTrio title="Plan Your Night" kicker="BUILD IT · SHAKE IT · ASK IT" onBuild={()=>onPlan?.('guided')} onShake={()=>onPlan?.('shake')} onAsk={()=>onPlan?.('ask')}/>
  </Themed>
}
