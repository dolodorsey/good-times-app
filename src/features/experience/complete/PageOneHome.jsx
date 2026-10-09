import {useBrowse} from './useBrowse.js'
import {discoveryWindow} from './discovery-time.js'
import React from 'react'
import GoodTimesIcon from '../GoodTimesIcon.jsx'
import {ExperienceCard,Section,State,Skeleton} from './Cards.jsx'
import {homeCollections,occurrenceUsable,eveningUsable,list,shiftDate} from './model.js'
import {selectedCityClock} from '../good-times-event-clock.js'
import {homePlaceSelection,diverseHomeItems} from './home-feed.js'
import './page-one-home.css'

const INTENTS=[['Food','dining_culinary','dining'],['Drinks','nightlife','cocktail'],['Date Night','dining_culinary','heart'],['Turn Up','nightlife','music'],['Live Music','concerts_live_music','music'],['Sports','sports_watch','sports'],['Interactive','entertainment','sparkle'],['Chill','wellness_fitness','sparkle'],['Something Different','arts_museums_culture','sparkle']]
const MODES=[['for-you','For You'],['tonight','Tonight'],['sports','Sports'],['weekend','Weekend'],['upcoming','Upcoming']]

function Rail({items,...props}){return <div className="gt01-rail">{items.map(item=><div className="gt01-rail-item" key={`${item.event_key?'event':'venue'}:${item.event_key||item.id}`}><ExperienceCard item={item} kind={item.event_key?'event':'venue'} saved={props.savedKeys.has(`${item.event_key?'event':'venue'}:${item.event_key||item.id}`)} onOpen={()=>item.event_key?props.onEvent(item):props.onVenue(item)} onSave={()=>props.onSave(item.event_key?'event':'venue',item.event_key||item.id)}/><button className="gt01-add-plan" onClick={()=>props.onAddPlan(item)} aria-label={`Add ${item.title||item.name} to plan`}>＋ Plan</button></div>)}</div>}

export default function PageOneHome({events,venues,profile,savedKeys,onEvent,onVenue,onSave,onExplore,onIntent,onSearch,onPlaces,onEntertainment,onPlan,onAddPlan,onPreferences,mode,onMode,now,loading,error,onRetry,sponsored}){
 const clock=selectedCityClock('atlanta',now)
 const current=list(events).filter(e=>occurrenceUsable(e,now))
 const places=homePlaceSelection(venues),groups=homeCollections(current,places,now,profile?.vibe_preferences)
 const nightWindow=discoveryWindow('tonight',now),nightFeed=useBrowse({kind:'events',mode:'tonight',from:nightWindow.from,to:nightWindow.to,limit:24})
 const tonight=diverseHomeItems((nightFeed.status==='success'?nightFeed.items:current).filter(e=>eveningUsable(e,now)),6)
 const week=diverseHomeItems(current.filter(e=>e.event_date>=clock.date&&e.event_date<=shiftDate(clock.date,6)),6)
 const sports=diverseHomeItems(current.filter(e=>e.category_key==='sports_watch'),4)
 const different=diverseHomeItems(places.filter(v=>/entertainment|interactive|arts|museum|attraction|experience/.test(`${v.category_key} ${v.subcategory}`)),6)
 const cardProps={savedKeys,onEvent,onVenue,onSave,onAddPlan}
 const chooseMode=id=>onMode(id)
 return <section className="gtc-home gt01-home" aria-label="Home For You">
  <nav className="gt01-feed-tabs gt5-home-modes" aria-label="GOOD TIMES Home views">{MODES.map(([id,label])=><button key={id} aria-pressed={id===mode} className={id===mode?'active':''} onClick={()=>chooseMode(id)}>{label}</button>)}</nav>
  <div className="gt01-context"><span>ATLANTA · {new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'America/New_York'}).format(now)}</span><button onClick={()=>onSearch('')} aria-label="Search Atlanta"><GoodTimesIcon name="search" size={18}/></button></div>
  <div className="gt01-intent-heading"><h1>What’s your mood?</h1><button onClick={onPlaces}>Explore all ↗</button></div>
  <div className="gt01-intents" aria-label="Choose your intent">{INTENTS.map(([label,category,icon],i)=><button key={label} style={{'--intent-accent':['#e8af62','#b999ec','#e990ab','#e37da4','#88b5f7','#ed9a6b','#73d2cf','#93c8ad','#b9afe7'][i]}} onClick={()=>onIntent(category,label)}><GoodTimesIcon name={icon} size={23}/><span>{label}</span></button>)}</div>
  {error&&<State error title="Some recommendations couldn’t refresh" body="Your feed is temporarily unavailable. Try again in a moment." action={<button onClick={onRetry}>Retry feed</button>}/>}
  {loading&&!places.length&&!current.length?<><Section title="Right Now in ATL"><Skeleton count={3}/></Section><Section title="Tonight in Atlanta"><Skeleton count={3}/></Section></>:<>
   <Section title="Right Now in ATL" subtext="Places worth knowing. Check current hours before you go." action={<button onClick={onPlaces}>See all ↗</button>}>
    {places.length?<Rail items={diverseHomeItems(places,6)} {...cardProps}/>:<State title="Places are taking a moment" body="Explore Atlanta or retry the feed." action={<button onClick={onPlaces}>Discover places</button>}/>}
   </Section>
   <Section title="Tonight in Atlanta" action={<button onClick={()=>onEntertainment('tonight')}>See all ↗</button>}>
    {tonight.length?<Rail items={tonight} {...cardProps}/>:<State title={error||nightFeed.status==='error'?"Tonight couldn’t refresh":nightFeed.status==='loading'?"Checking tonight’s events…":nightFeed.nextCursor?"More tonight records need checking":"No eligible events for tonight yet"} body="Explore upcoming dates or build a night around a place." action={<button onClick={()=>onEntertainment('upcoming')}>Upcoming events</button>}/>}
   </Section>
   <Section title="Build Tonight" subtext="Three ways to make it yours."><div className="gt01-planning">{[['guided','Build It','Pick the pieces','list'],['shake','Shake It','Find a surprise','sparkle'],['ask','Ask GOOD TIMES','Tell us your idea','chat']].map(([id,title,sub,icon])=><button key={id} className={`gt01-plan-${id}`} onClick={()=>onPlan(id)}><GoodTimesIcon name={icon} size={22}/><strong>{title}</strong><small>{sub}</small><span aria-hidden="true">↗</span></button>)}</div></Section>
   <Section title={list(profile?.vibe_preferences).length?'Picked for you':'GOOD TIMES Picks'} subtext={list(profile?.vibe_preferences).length?'Inspired by your saved preferences.':'A starting point for your next good time.'} action={<button onClick={onPreferences}>Personalize ↗</button>}>
    {groups.picks.length?<Rail items={diverseHomeItems(groups.picks,4)} {...cardProps}/>:<State title="Your next good time starts here" action={<button onClick={onPlaces}>Explore Atlanta</button>}/>}
   </Section>
   <div id="gt01-this-week"><Section title="This Week in Atlanta" action={<button onClick={()=>onEntertainment('upcoming')}>See all ↗</button>}>{week.length?<Rail items={week} {...cardProps}/>:<State title="No current events for this week" body="Check upcoming dates as the calendar is updated."/>}</Section></div>
   {sports.length>0&&<Section title="Sports in Atlanta" action={<button onClick={()=>onExplore('sports_watch')}>See all ↗</button>}><Rail items={sports} {...cardProps}/></Section>}
   {different.length>0&&<Section title="Do Something Different" action={<button onClick={()=>onExplore('entertainment')}>Explore ↗</button>}><Rail items={different} {...cardProps}/></Section>}
   {sponsored}
   <Section title="Around Atlanta" subtext="Explore by neighborhood. Your location isn’t required."><div className="gt01-areas">{[...new Set(places.map(v=>v.neighborhood).filter(Boolean))].slice(0,6).map(area=><button key={area} onClick={()=>onSearch(area)}>{area} ↗</button>)}<button onClick={onPlaces}>All Atlanta ↗</button></div></Section>
  </>}
 </section>
}
