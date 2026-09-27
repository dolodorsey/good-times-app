import React,{useMemo,useState}from'react'
import CompactSponsored from './CompactSponsored.jsx'
import CompactEventCard from'./CompactEventCard.jsx'
import CompactVenueCard from'./CompactVenueCard.jsx'
import CompactEventCollection from'./CompactEventCollection.jsx'
import{activeItems,categoryLabel,uniqueItems}from'./compact-display.js'
import{eventIsTonight}from'./good-times-event-clock.js'
export default function CompactHome({events,venues,taxonomy,savedKeys,onEvent,onVenue,onSave,onDiscover,onPlan,onCollection,onSports,now,mode,onMode,notice,onRefresh}){
 const[search,setSearch]=useState(''),items=useMemo(()=>activeItems(events,now),[events,now])
 const tonight=items.filter(e=>eventIsTonight(e,'atlanta',now)),first=(tonight.length?tonight:items).slice(0,4)
 const used=new Set(first.map(e=>e.event_key)),next=items.filter(e=>!used.has(e.event_key)).slice(0,4)
 next.forEach(e=>used.add(e.event_key))
 const groups=['concerts_live_music','festivals_major_activations','family_kids'].map(key=>{const list=items.filter(e=>e.category_key===key&&!used.has(e.event_key)).slice(0,4);list.forEach(e=>used.add(e.event_key));return{key,list}})
 const places=uniqueItems(venues||[],'venue').slice(0,4)
 const eventGrid=list=><div className="gt-complete-grid">{list.map(e=><CompactEventCard key={e.event_key} event={e} taxonomy={taxonomy} now={now} saved={savedKeys.has(`event:${e.event_key}`)} onOpen={()=>onEvent(e)} onSave={()=>onSave('event',e.event_key)}/>)}</div>
 const section=(title,action,children)=><section className="gt-complete-home-section"><header className="gt-complete-heading"><h2>{title}</h2><button onClick={action}>See all ↗</button></header>{children}</section>
 return <div className="gt-complete-home">
  <form className="gt-complete-search" onSubmit={e=>{e.preventDefault();onDiscover(search)}}><span aria-hidden="true">⌕</span><input aria-label="Search Atlanta events and places" placeholder="Events, places, artists, neighborhoods…" value={search} onChange={e=>setSearch(e.target.value)}/><button type="submit" aria-label="Search">→</button></form>
  <nav className="gt5-home-modes" aria-label="GOOD TIMES Home views">{[['for-you','For You'],['upcoming','Upcoming'],['tonight','Tonight']].map(([id,label])=><button key={id} className={id===mode?'active':''} aria-pressed={id===mode} onClick={()=>onMode(id)}>{label}</button>)}</nav>
  {notice&&<div className="gt-complete-notice" role="status"><span>{notice}</span><button onClick={onRefresh}>Retry</button></div>}
  {mode!=='for-you'?<CompactEventCollection key={mode} mode={mode} taxonomy={taxonomy} savedKeys={savedKeys} onOpen={onEvent} onSave={onSave} now={now}/>:<>
  {first.length?section(tonight.length?'Tonight in Atlanta':'Next up in Atlanta',()=>onCollection({mode:tonight.length?'tonight':'upcoming'}),eventGrid(first)):section('Places worth exploring',()=>onDiscover(''),<div className="gt-complete-grid">{places.map(v=><CompactVenueCard key={v.id} venue={v} saved={savedKeys.has(`venue:${v.id}`)} onOpen={()=>onVenue(v)} onSave={()=>onSave('venue',v.id)}/>)}</div>)}
  {next.length>0&&section('More to look forward to',()=>onCollection({mode:'upcoming'}),eventGrid(next))}
  <CompactSponsored placement="home_between_sections"/>
  <button className="gt-complete-inline-cta" onClick={onPlan}><span><strong>Build your night</strong><small>Your choices. One useful plan.</small></span><b>＋</b></button>
  <button className="gt-complete-inline-cta" onClick={onSports}><span><strong>Atlanta sports</strong><small>Teams · games · places to watch</small></span><b>↗</b></button>
  {groups.map(({key,list})=>{return list.length?<React.Fragment key={key}>{section(categoryLabel(key,taxonomy),()=>onCollection({category:key}),eventGrid(list))}</React.Fragment>:null})}
  {first.length>0&&places.length>0&&section('Find your next favorite place',()=>onDiscover(''),<div className="gt-complete-grid">{places.map(v=><CompactVenueCard key={v.id} venue={v} saved={savedKeys.has(`venue:${v.id}`)} onOpen={()=>onVenue(v)} onSave={()=>onSave('venue',v.id)}/>)}</div>)}
  </>}
 </div>
}
