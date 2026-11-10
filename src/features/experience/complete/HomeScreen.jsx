import React,{useMemo,useState} from 'react'
import AdSlot from './AdSlot.jsx'
import {Themed,ScreenHero,SearchBar,CategoryCards,Rail,BuildTrio,ConciergeBand,PhotoTile,Skeletons,Empty,SCENES} from './Kit.jsx'
import {EventPoster,VenuePoster} from './posters.jsx'
import {EventCollection} from './Collections.jsx'
import {State} from './Cards.jsx'
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {occurrenceUsable,eveningUsable,unique,list,labelFor,safeImage,safeLink,displayDate,displayTime} from './model.js'
import {PosterCard} from './Kit.jsx'
import {tonightOrNext} from './tonight.js'
import {houseEvents,KOLLECTIVE_PROGRAMS} from './kollective-programming.js'
import {topPlaces} from './top-places.js'
import {claim,collapseByTitle} from './dedupe.js'
import {openLink} from '../../../native.js'

// "The Best Happening" — owner-featured programming plus the biggest confirmed Atlanta events, in date order.
// House events come from the live feed (same detail sheet and Plan as any event); no city or brand label.
// Services sold on ticketing sites (party buses, concert shuttles, parking) are not events.
const NOT_AN_EVENT=/\b(concert transportation|premium transportation|party bus|shuttle|parking pass|parking only)\b/i
const MAJOR=/(state farm arena|mercedes-benz stadium|tabernacle|fox theatre|coca-cola roxy|truist park|lakewood|cellairis|ameris|gas south|buckhead theatre|masquerade|terminal west|eastern|city winery|district atlanta|believe music hall|opium|revel)/i
function bestRows(events,now){
 const house=houseEvents(events)
 const c=selectedCityClock('atlanta',now),end=new Date(`${c.date}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+21);const last=end.toISOString().slice(0,10)
 const score=e=>(e.is_featured?40:0)+(MAJOR.test(`${e.venue_name||''}`)?25:0)+(safeImage(e.image_url)?15:0)+Number(e.good_times_score??e.quality_score??0)/10
 const major=unique(events).filter(e=>occurrenceUsable(e,now)&&e.event_date<=last&&!house.includes(e)&&safeImage(e.image_url)&&score(e)>=40).sort((a,b)=>score(b)-score(a)).slice(0,10)
 return [...house,...major].sort((a,b)=>`${a.event_date}T${a.event_time||'99'}`.localeCompare(`${b.event_date}T${b.event_time||'99'}`)).slice(0,14)
}
function BestRail({items,now,savedKeys,onEvent,onSave,onSeeAll}){
 if(!items.length&&!KOLLECTIVE_PROGRAMS.length)return null
 return <Rail title="The Best" accent="Happening" kicker="HAND-PICKED · ATLANTA" className="gtk-best" onSeeAll={onSeeAll}>
  {items.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}
  {KOLLECTIVE_PROGRAMS.map(p=>{const go=()=>openLink(p.url);return <PosterCard key={p.key} cardClass="gtk-house-card" id={`program:${p.key}`} image={p.image} kicker={p.kicker} title={p.title} lines={[p.line]} onOpen={go} action={{label:p.cta,icon:'arrow',onClick:go}}/>})}
 </Rail>
}

const MOODS=[
 {id:'restaurants',label:'Food',sub:'Dining',icon:'food',tone:'food'},
 {id:'nightlife-venues',label:'Drinks',sub:'Bars & Lounges',icon:'cocktail',tone:'drinks'},
 {id:'nightlife-events',label:'Nightlife',sub:'Clubs & Parties',icon:'music',tone:'nightlife'},
 {id:'brunch',label:'Brunch',sub:'Day Parties & Eats',icon:'sun',tone:'brunch'},
 {id:'events',label:'Events',sub:'Concerts & More',icon:'ticket',tone:'events'},
 {id:'interactive',label:'Interactive',sub:'Games & Activities',icon:'game',tone:'interactive'},
 {id:'sports',label:'Sports',sub:'Teams & Games',icon:'ball',tone:'sports'},
 {id:'date-night',label:'Date Night',sub:'Two of you',icon:'heart',tone:'date'},
 {id:'wellness',label:'Wellness',sub:'Self Care',icon:'lotus',tone:'wellness'},
 {id:'hotels',label:'Hotels',sub:'Stay & Reset',icon:'bed',tone:'hotels'},
 {id:'places',label:'More',sub:'Everything Else',icon:'grid',tone:'more'},
]
const WEEK_GROUPS=[
 ['concerts','Concerts',['concerts_live_music'],SCENES.concert],
 ['nightlife-events','Nightlife',['nightlife','day_parties_brunch'],SCENES.nightlife],
 ['comedy','Comedy & Shows',['comedy_performing_arts'],SCENES.culture],
 ['sports','Sports',['sports_watch'],SCENES.sports],
 ['culture','Culture',['arts_museums_culture','black_culture_diaspora','community_civic'],SCENES.culture],
 ['festivals','Festivals',['festivals_major_activations','seasonal_holiday'],SCENES.district],
]
const INTERACTIVE=/puttshack|flight club|cosm|f1 arcade|andretti|topgolf|top golf|sandbox vr|great big game show|spin art|game show|mini golf|darts|vr\b|immersive|sim[_ -]?racing|karting|arcade|bowling|escape|splatter|rage room|axe/i
function greeting(minute){if(minute<240||minute>=1080)return 'Good Evening,';if(minute<720)return 'Good Morning,';return 'Good Afternoon,'}

export default function HomeScreen({events=[],venues=[],profile,savedKeys,onEvent,onVenue,onSave,onSearch,onNavigate,onPlan,mode,onMode,now,loading,error,onRetry,sponsored=null}){
 const c=selectedCityClock('atlanta',now),[q,setQ]=useState('')
 const nav=target=>onNavigate?.(target)
 const live=useMemo(()=>unique(events).filter(e=>occurrenceUsable(e,now)&&!NOT_AN_EVENT.test(e.title||'')).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99'))),[events,now])
 const night=useMemo(()=>tonightOrNext(events,now),[events,now])
 // Every event / venue appears once on Home, in rail order; multi-date shows collapse to their next date.
 const rails=useMemo(()=>{
  const used=new Set()
  const best=claim(bestRows(live,now),used,14)
  const nightRows=claim(collapseByTitle(night.rows),used,10)
  const tonight=night.next?[]:nightRows
  const places=claim(topPlaces(unique(venues).filter(v=>!INTERACTIVE.test(`${v.name} ${v.venue_subcategory||''}`)||/^cosm\b/i.test(v.name)),40),used,14)
  const weekend=claim(collapseByTitle(live.filter(e=>eventIsThisWeekend(e,'atlanta',now))),used,10)
  const comingUp=claim(collapseByTitle(live.filter(e=>String(e.event_date)>c.date)),used,10)
  const different=claim(unique(venues).filter(v=>INTERACTIVE.test([v.name,v.category_key,v.venue_subcategory,v.subcategory].filter(Boolean).join(' '))),used,10)
  return {best,nightRows,tonight,places,weekend,comingUp,different}
 },[live,night,venues,now,c.date])
 const {tonight,places,weekend,comingUp,different}=rails
 const firstName=String(profile?.full_name||'').trim().split(/\s+/)[0]
 return <Themed theme="gold" className="gtc-home gtk-home">
  <ScreenHero size="lg" eyebrow={firstName?`${greeting(c.minute).replace(',','')}, ${firstName}`.toUpperCase():greeting(c.minute).replace(',','').toUpperCase()} title="Atlanta." tagline="Great people. Better nights." image={SCENES.home} script={'Explore\nPlan\nExperience\nMore'}>
   <SearchBar inputLabel="Search Atlanta" placeholder="What are you trying to get into?" value={q} onChange={setQ} onSubmit={v=>v.trim()&&onSearch?.(v)} onFilters={()=>q.trim()?onSearch?.(q):nav('places')}/>
  </ScreenHero>
  <div className="gtk-time-tabs"><nav className="gtc-tabs gt5-home-modes gtk-time-nav" aria-label="GOOD TIMES Home views">{[['for-you','For You'],['upcoming','Upcoming'],['tonight','Tonight']].map(([id,label])=><button key={id} className={id===mode?'active':''} aria-pressed={id===mode} onClick={()=>onMode(id)}>{label}</button>)}</nav><button type="button" onClick={()=>nav('weekend')}>This Weekend</button></div>
  {mode!=='for-you'?<EventCollection key={mode} mode={mode} now={now} initialEvents={events} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>:<>
   <section className="gtk-section gtk-moods"><header className="gtk-section-head"><div><h2>What kind of <em>time?</em></h2></div><button type="button" className="gtk-see-all" onClick={()=>nav('places')}>See All</button></header><CategoryCards label="What kind of time" items={MOODS} onSelect={nav}/></section>
   <BuildTrio onBuild={()=>onPlan?.('guided')} onShake={()=>onPlan?.('shake')} onAsk={()=>onPlan?.('ask')}/>
   <AdSlot placement="home" slot={0}/>
   <BestRail items={rails.best} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave} onSeeAll={()=>onMode('upcoming')}/>
   {error&&<State error title="Couldn’t refresh all recommendations" body={error} action={<button onClick={onRetry}>Retry</button>}/>}
   {loading&&!events.length&&!venues.length?<Skeletons/>:<>
    {rails.nightRows.length>0&&<Rail title={night.title} accent="in Atlanta" kicker={night.kicker} onSeeAll={()=>onMode(night.next?'upcoming':'tonight')}>{rails.nightRows.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    <Rail title="Top Places" accent="in Atlanta" kicker="VERIFIED PICKS" onSeeAll={()=>nav('places')}>{places.length?places.map(v=><VenuePoster key={v.id} venue={v} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>):<Empty title="Places are loading" body="Verified Atlanta places will appear here."/>}</Rail>
    {weekend.length>0&&<Rail title="This" accent="Weekend" kicker="FRI – SUN" onSeeAll={()=>nav('weekend')}>{weekend.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    {comingUp.length>0&&<Rail title="Coming" accent="Up" kicker="PLAN AHEAD" onSeeAll={()=>onMode('upcoming')}>{comingUp.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    {different.length>0&&<Rail title="Something" accent="Different" kicker="PLAY · COMPETE · CONNECT" onSeeAll={()=>nav('interactive')}>{different.map(v=><VenuePoster key={v.id} venue={v} size="sm" showAction={false} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>)}</Rail>}
    {!rails.nightRows.length&&!weekend.length&&!comingUp.length&&!places.length&&<Empty title="Find your next good time" body="Browse the full Atlanta collection, or refresh current recommendations." action={<button onClick={onRetry}>Refresh</button>}/>}
    <AdSlot placement="home" slot={1}/>
    <ConciergeBand onClick={()=>onPlan?.('ask')}/>
    {sponsored}
   </>}
  </>}
 </Themed>
}
