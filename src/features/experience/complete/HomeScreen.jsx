import React,{useMemo,useState} from 'react'
import {Themed,ScreenHero,SearchBar,IconRail,Rail,BuildTrio,ConciergeBand,PhotoTile,Skeletons,Empty,SCENES} from './Kit.jsx'
import {EventPoster,VenuePoster} from './posters.jsx'
import {EventCollection} from './Collections.jsx'
import {State} from './Cards.jsx'
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {occurrenceUsable,eveningUsable,unique,list,labelFor,safeImage} from './model.js'

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
function greeting(minute){if(minute<240||minute>=1080)return 'Good Evening,';if(minute<720)return 'Good Morning,';return 'Good Afternoon,'}

export default function HomeScreen({events=[],venues=[],profile,savedKeys,onEvent,onVenue,onSave,onSearch,onNavigate,onPlan,mode,onMode,now,loading,error,onRetry,sponsored=null}){
 const c=selectedCityClock('atlanta',now),[q,setQ]=useState('')
 const nav=target=>onNavigate?.(target)
 const live=useMemo(()=>unique(events).filter(e=>occurrenceUsable(e,now)).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99'))),[events,now])
 const tonight=useMemo(()=>live.filter(e=>eveningUsable(e,now)).slice(0,10),[live,now])
 const weekend=useMemo(()=>live.filter(e=>eventIsThisWeekend(e,'atlanta',now)&&!tonight.includes(e)).slice(0,10),[live,now,tonight])
 const week=useMemo(()=>{const end=new Date(`${c.date}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+7);const last=end.toISOString().slice(0,10);return live.filter(e=>e.event_date<=last)},[live,c.date])
 const comingUp=useMemo(()=>live.filter(e=>!tonight.includes(e)&&!weekend.includes(e)).slice(0,10),[live,tonight,weekend])
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
