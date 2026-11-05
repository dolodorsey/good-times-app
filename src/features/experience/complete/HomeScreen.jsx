import React,{useEffect,useMemo,useState} from 'react'
import {Themed,ScreenHero,SearchBar,IconRail,Rail,BuildTrio,ConciergeBand,PhotoTile,Skeletons,Empty,Icon,SCENES} from './Kit.jsx'
import {EventPoster,VenuePoster} from './posters.jsx'
import {EventCollection} from './Collections.jsx'
import {State} from './Cards.jsx'
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {occurrenceUsable,eveningUsable,unique,list,labelFor,safeImage,safeLink,displayDate,displayTime,cleanTitle,rankMarquee,matchupTeams} from './model.js'
import {PosterCard} from './Kit.jsx'
import {houseEvents,otherCityHouseEvents,ACCESS_LABELS,ACCESS_CTA,KOLLECTIVE_PROGRAMS} from './kollective-programming.js'
import {openLink,shareContent} from '../../../native.js'

// Atlanta Kollective events are live gt_shows inventory from the feed (same detail sheet and Plan as any event).
// Kollective events in other cities (DC) come from /api/house and show with their city; they never enter
// Atlanta's discovery lanes. Programs are ongoing brands without a dated listing, so they link out.
function KollectiveRail({events,now,savedKeys,onEvent,onSave}){
 const items=useMemo(()=>houseEvents(events),[events])
 const [away,setAway]=useState([])
 useEffect(()=>{const c=new AbortController();fetch('/api/house',{signal:c.signal}).then(r=>r.ok?r.json():null).then(b=>{if(b?.ok)setAway(otherCityHouseEvents(b.events))}).catch(()=>{});return()=>c.abort()},[])
 return <Rail title="From The" accent="Kollective" kicker={away.length?'OUR EVENTS · ATLANTA & DC':'OUR EVENTS · ATLANTA'} className="gtk-kollective">
  {items.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}
  {away.map(e=>{const link=safeLink(e.ticket_url),go=link?()=>openLink(link):undefined,end=e.end_time?` – ${displayTime(e.end_time)}`:''
   return <PosterCard key={e.event_key} cardClass="gtk-house-card" id={`kollective:${e.event_key}`} image={e.image_url} badge={ACCESS_LABELS[e.access]} kicker={e.city_label?.toUpperCase()} title={e.title} lines={[`${displayDate(e.event_date)} · ${displayTime(e.event_time)}${end}`,[e.venue_name,e.city_label].filter(Boolean).join(' · ')]} onOpen={go} action={link&&ACCESS_CTA[e.access]?{label:ACCESS_CTA[e.access],icon:'ticket',onClick:go}:undefined}/>})}
  {KOLLECTIVE_PROGRAMS.map(p=>{const go=()=>openLink(p.url);return <PosterCard key={p.key} cardClass="gtk-house-card" id={`kollective:${p.key}`} image={p.image} kicker={p.kicker} title={p.title} lines={[p.line]} onOpen={go} action={{label:p.cta,icon:'arrow',onClick:go}}/>})}
 </Rail>
}

const MOODS=[
 {id:'restaurants',label:'Food',sub:'Dining',icon:'food',tone:'food'},
 {id:'nightlife-venues',label:'Drinks',sub:'Bars & Lounges',icon:'cocktail',tone:'drinks'},
 {id:'nightlife-events',label:'Nightlife',sub:'Clubs & Parties',icon:'music',tone:'nightlife'},
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
const DAY_HEADLINES=[['Sunday Ain’t Just For','Recovery.'],['Monday Still','Moves.'],['Tuesday Got','Plans.'],['Wednesday Is','Halfway Loaded.'],['Thursday Is Not','A Warm-Up.'],['Friday Got Too Many','Options.'],['Saturday Is For The','Whole City.']]
const DAY_FOOTERS=['SAVE THIS. SEND IT TO THE GROUP.','PICK A LANE. TAG YOUR CREW.','THERE’S ALWAYS SOMETHING TO DO.']
/** Flyer-grade daily board. One headline moment per day, biggest first, every row a verified event you can open. */
function CityBoard({events,clock,now,onEvent,onSeeAll}){
 const days=useMemo(()=>{const byDay=new Map();for(const e of events){if(!byDay.has(e.event_date))byDay.set(e.event_date,[]);byDay.get(e.event_date).push(e)}const used=new Set();return [...byDay.keys()].sort().slice(0,5).map(date=>{const rows=rankMarquee(byDay.get(date));const lead=rows.find(e=>!used.has(cleanTitle(e.title)))||rows[0];used.add(cleanTitle(lead.title));return {date,lead,more:rows.filter(e=>e!==lead).slice(0,2),total:rows.length}})},[events])
 if(!days.length)return null
 const dow=new Date(`${clock.date}T12:00:00Z`).getUTCDay(),[line,gold]=DAY_HEADLINES[dow]
 const foot=DAY_FOOTERS[dow%DAY_FOOTERS.length]
 const share=()=>shareContent({title:`${line} ${gold}`,text:days.map(d=>`${displayDate(d.date,{weekday:'short',month:'short',day:'numeric'})}: ${cleanTitle(d.lead.title)} · ${d.lead.venue_name||''}`).join('\n'),url:window.location.origin,dialogTitle:'Send it to the group'})
 return <section className="gtk-section gtk-board" aria-label="This week’s top moves in Atlanta">
  <header className="gtk-board-head"><small>ATLANTA · CURATED BY DOLO DORSEY</small><h2>{line} <em>{gold}</em></h2></header>
  <ol className="gtk-board-days">{days.map(d=>{const day=new Date(`${d.date}T12:00:00Z`),lead=d.lead,teams=matchupTeams(lead),image=teams?null:safeImage(lead.image_url)
   return <li key={d.date}><button type="button" onClick={()=>onEvent(lead)} aria-label={`${cleanTitle(lead.title)}, ${displayDate(d.date)}`}>
    <span className="gtk-board-date"><small>{day.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</small><strong>{day.getUTCDate()}</strong></span>
    <span className="gtk-board-copy"><strong>{cleanTitle(lead.title)}</strong><small>{[lead.venue_name,displayTime(lead.event_time)==='Time to confirm'?null:displayTime(lead.event_time)].filter(Boolean).join(' · ')}</small>{d.more.length>0&&<em>{`+ ${d.more.map(m=>cleanTitle(m.title)).join(' · ')}`}</em>}</span>
    {image?<span className="gtk-board-art" aria-hidden="true" style={{backgroundImage:`url("${image}")`}}/>:teams?<span className="gtk-board-art is-matchup" aria-hidden="true"/>:null}
   </button></li>})}</ol>
  <footer className="gtk-board-foot"><button type="button" onClick={share}>{foot}</button><button type="button" onClick={onSeeAll}>See the full lineup<Icon name="arrow" size={15}/></button></footer>
 </section>
}
function greeting(minute){if(minute<240||minute>=1080)return 'Good Evening,';if(minute<720)return 'Good Morning,';return 'Good Afternoon,'}

export default function HomeScreen({events=[],venues=[],profile,savedKeys,onEvent,onVenue,onSave,onSearch,onNavigate,onPlan,mode,onMode,now,loading,error,onRetry,sponsored=null}){
 const c=selectedCityClock('atlanta',now),[q,setQ]=useState('')
 const nav=target=>onNavigate?.(target)
 const live=useMemo(()=>unique(events).filter(e=>occurrenceUsable(e,now)).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99'))),[events,now])
 const tonight=useMemo(()=>rankMarquee(live.filter(e=>eveningUsable(e,now))).slice(0,12),[live,now])
 const weekend=useMemo(()=>{const shown=new Set(tonight.map(e=>e.event_key));return rankMarquee(live.filter(e=>eventIsThisWeekend(e,'atlanta',now)&&!shown.has(e.event_key))).slice(0,12)},[live,now,tonight])
 const week=useMemo(()=>{const end=new Date(`${c.date}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+7);const last=end.toISOString().slice(0,10);return live.filter(e=>e.event_date<=last)},[live,c.date])
 const comingUp=useMemo(()=>{const shown=new Set([...tonight,...weekend].map(e=>`${cleanTitle(e.title)}|${e.venue_name}`));return rankMarquee(live.filter(e=>!shown.has(`${cleanTitle(e.title)}|${e.venue_name}`))).filter(e=>e.event_date>c.date).slice(0,14)},[live,tonight,weekend,c.date])
 const places=useMemo(()=>unique(venues).filter(v=>!INTERACTIVE.test(`${v.name} ${v.venue_subcategory||''}`)).slice(0,10),[venues])
 const different=useMemo(()=>unique(venues).filter(v=>INTERACTIVE.test([v.name,v.category_key,v.venue_subcategory,v.subcategory].filter(Boolean).join(' '))).slice(0,10),[venues])
 const weekTiles=useMemo(()=>{const restaurants=venues.filter(v=>/restaurant|dining|food|brunch|coffee|cafe|bakery/.test(`${v.category_key} ${v.venue_category_key||''}`));const rows=[{id:'restaurants',label:'Restaurants',sub:restaurants.length?`${restaurants.length}+ places`:'Explore',image:safeImage(restaurants.find(v=>safeImage(v.hero_image))?.hero_image)||SCENES.dining}];for(const [id,label,keys,art] of WEEK_GROUPS){const rowsFor=week.filter(e=>keys.includes(e.category_key));if(!rowsFor.length)continue;rows.push({id,label,sub:`${rowsFor.length} this week`,image:safeImage(rowsFor.find(e=>safeImage(e.image_url))?.image_url)||art})}return rows},[venues,week])
 const firstName=String(profile?.full_name||'').trim().split(/\s+/)[0]
 return <Themed theme="gold" className="gtc-home gtk-home">
  <ScreenHero size="lg" eyebrow={firstName?`${greeting(c.minute).replace(',','')}, ${firstName}`.toUpperCase():greeting(c.minute).replace(',','').toUpperCase()} title="Atlanta." tagline="Great people. Better nights." image={SCENES.home} script={'Explore\nPlan\nExperience\nMore'}>
   <SearchBar inputLabel="Search Atlanta" placeholder="What are you trying to get into?" value={q} onChange={setQ} onSubmit={v=>v.trim()&&onSearch?.(v)} onFilters={()=>q.trim()?onSearch?.(q):nav('places')}/>
  </ScreenHero>
  <div className="gtk-time-tabs"><nav className="gtc-tabs gt5-home-modes gtk-time-nav" aria-label="GOOD TIMES Home views">{[['for-you','For You'],['upcoming','Upcoming'],['tonight','Tonight']].map(([id,label])=><button key={id} className={id===mode?'active':''} aria-pressed={id===mode} onClick={()=>onMode(id)}>{label}</button>)}</nav><button type="button" onClick={()=>nav('weekend')}>This Weekend</button></div>
  {mode!=='for-you'?<EventCollection key={mode} mode={mode} now={now} initialEvents={events} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>:<>
   <section className="gtk-section gtk-moods"><header className="gtk-section-head"><div><h2>What kind of <em>time?</em></h2></div><button type="button" className="gtk-see-all" onClick={()=>nav('places')}>See All</button></header><IconRail variant="mood" label="What kind of time" items={MOODS} onSelect={nav}/></section>
   <CityBoard events={live} clock={c} now={now} onEvent={onEvent} onSeeAll={()=>onMode('upcoming')}/>
   <KollectiveRail events={live} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>
   {error&&<State error title="Couldn’t refresh all recommendations" body={error} action={<button onClick={onRetry}>Retry</button>}/>}
   {loading&&!events.length&&!venues.length?<Skeletons/>:<>
    {tonight.length>0&&<Rail title={c.minute<240?'Still going':'Tonight'} accent="in Atlanta" kicker="LIVE & UPCOMING" onSeeAll={()=>onMode('tonight')}>{tonight.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    <Rail title="Top Places" accent="in Atlanta" kicker="VERIFIED PICKS" onSeeAll={()=>nav('places')}>{places.length?places.map(v=><VenuePoster key={v.id} venue={v} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>):<Empty title="Places are loading" body="Verified Atlanta places will appear here."/>}</Rail>
    <BuildTrio onBuild={()=>onPlan?.('guided')} onShake={()=>onPlan?.('shake')} onAsk={()=>onPlan?.('ask')}/>
    {weekend.length>0&&<Rail title="This" accent="Weekend" kicker="FRI – SUN" onSeeAll={()=>nav('weekend')}>{weekend.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    {weekTiles.length>1&&<Rail title="This Week" accent="in ATL" onSeeAll={()=>nav('events')}>{weekTiles.map(t=><PhotoTile key={t.id} image={t.image} label={t.label} sub={t.sub} onClick={()=>nav(t.id)}/>)}</Rail>}
    {comingUp.length>0&&<Rail title="Coming" accent="Up" kicker="PLAN AHEAD" onSeeAll={()=>onMode('upcoming')}>{comingUp.map(e=><EventPoster key={e.event_key} event={e} now={now} savedKeys={savedKeys} onEvent={onEvent} onSave={onSave}/>)}</Rail>}
    {different.length>0&&<Rail title="Something" accent="Different" kicker="PLAY · COMPETE · CONNECT" onSeeAll={()=>nav('interactive')}>{different.map(v=><VenuePoster key={v.id} venue={v} size="sm" showAction={false} savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>)}</Rail>}
    {!tonight.length&&!weekend.length&&!comingUp.length&&!places.length&&<Empty title="Find your next good time" body="Browse the full Atlanta collection, or refresh current recommendations." action={<button onClick={onRetry}>Refresh</button>}/>}
    <ConciergeBand onClick={()=>onPlan?.('ask')}/>
    {sponsored}
   </>}
  </>}
 </Themed>
}
