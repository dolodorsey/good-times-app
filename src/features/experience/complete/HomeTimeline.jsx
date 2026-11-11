import React,{useMemo,useState} from 'react'
import {Icon,Rail} from './Kit.jsx'
import {EventPoster,VenuePoster} from './posters.jsx'
import {CollectionGrid} from './Collections.jsx'
import {selectedCityClock,eventIsTonight} from '../good-times-event-clock.js'
import {unique,occurrenceUsable,displayDate} from './model.js'
import {collapseShows} from './dedupe.js'
import {tonightOrNext} from './tonight.js'
import {topPlaces,nightlifeKind} from './top-places.js'

// Home → Tonight / Upcoming. Built from the full loaded live feed (every category), not a narrower browse page,
// so clubs, parties, games, concerts and comedy all show. One card per show; nothing invented.
export const TIME_LANES=[
 ['all','All','sparkle',null],
 ['nightlife','Nightlife','music',['nightlife','day_parties_brunch']],
 ['concerts','Concerts','mic',['concerts_live_music']],
 ['sports','Sports','ball',['sports_watch']],
 ['comedy','Comedy & Shows','masks',['comedy_performing_arts']],
 ['culture','Culture','palette',['arts_museums_culture','black_culture_diaspora','community_civic','faith_inspirational']],
 ['festivals','Festivals & Holiday','tent',['festivals_major_activations','seasonal_holiday']],
 ['family','Family','family',['family_kids']],
]
const laneOf=e=>TIME_LANES.find(([id,,,cats])=>cats&&cats.includes(e.category_key))?.[0]||'all'
export function timelineRows(events=[],mode='upcoming',now=Date.now()){
 const live=unique(events).filter(e=>occurrenceUsable(e,now)).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))||String(a.event_time||'99').localeCompare(String(b.event_time||'99')))
 return mode==='tonight'?tonightOrNext(live,now):{rows:live,title:'Upcoming',kicker:'THE CITY AHEAD',next:false}
}
export default function HomeTimeline({mode='upcoming',events=[],venues=[],now=Date.now(),savedKeys,onEvent,onVenue,onSave}){
 const [lane,setLane]=useState('all'),[limit,setLimit]=useState(36),[date,setDate]=useState(''),[sort,setSort]=useState('date')
 const base=useMemo(()=>{const b=timelineRows(events,mode,now);if(mode==='tonight')return b;let rows=date?b.rows.filter(e=>e.event_date===date):b.rows;if(sort==='quality')rows=[...rows].sort((a,b2)=>Number(b2.good_times_score||b2.quality_score||0)-Number(a.good_times_score||a.quality_score||0));return {...b,rows}},[events,mode,now,date,sort])
 const counts=useMemo(()=>{const m={all:base.rows.length};for(const e of base.rows){const k=laneOf(e);m[k]=(m[k]||0)+1}return m},[base])
 const rows=useMemo(()=>collapseShows(base.rows.filter(e=>lane==='all'||laneOf(e)===lane)),[base,lane])
 const groups=useMemo(()=>[...rows.slice(0,limit).reduce((m,e)=>{const k=e.event_date;if(!m.has(k))m.set(k,[]);m.get(k).push(e);return m},new Map())],[rows,limit])
 const clubs=useMemo(()=>mode==='tonight'&&(lane==='all'||lane==='nightlife')?topPlaces(unique(venues).filter(v=>nightlifeKind(v)),40).slice(0,12):[],[mode,lane,venues])
 const c=selectedCityClock('atlanta',now)
 const title=mode==='tonight'?(base.next?base.title:'Tonight'):'Upcoming'
 return <section className="gtc-events gtk-timeline" aria-label={`${title} in Atlanta`}>
  <header className="gtk-timeline-head"><h2>{title} <em>in Atlanta</em></h2><small>{rows.length} {rows.length===1?'thing':'things'} · {mode==='tonight'?displayDate(base.rows[0]?.event_date||c.date):'every category'}</small></header>
  {mode!=='tonight'&&<div className="gtc-controls gtk-timeline-controls"><label>Date<input type="date" min={c.date} value={date} onChange={e=>{setDate(e.target.value);setLimit(36)}}/></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="date">Date &amp; time</option><option value="quality">Recommended</option></select></label>{date&&<button type="button" onClick={()=>setDate('')}>All upcoming</button>}</div>}
  <div className="gtk-pills is-scroll gtk-timeline-lanes" role="group" aria-label="Filter by category">{TIME_LANES.map(([id,label,icon])=><button type="button" key={id} className={lane===id?'active':''} aria-pressed={lane===id} disabled={id!=='all'&&!counts[id]} onClick={()=>{setLane(id);setLimit(36)}}><Icon name={icon} size={14}/>{label}{counts[id]>0&&<em>{counts[id]}</em>}</button>)}</div>
  {clubs.length>0&&<Rail title="Clubs" accent="& Lounges" kicker="WHERE ATLANTA GOES OUT · CONFIRM HOURS & ENTRY">{clubs.map(v=><VenuePoster key={v.id} venue={v} size="sm" savedKeys={savedKeys} onVenue={onVenue} onSave={onSave}/>)}</Rail>}
  {!rows.length&&<p className="gtc-note">Nothing verified in this category yet — try All.</p>}
  {groups.map(([day,items])=><div key={day} className="gtc-date-group"><h3>{displayDate(day)}{mode!=='tonight'&&eventIsTonight(items[0],'atlanta',now)&&<span> · Tonight</span>}</h3><CollectionGrid items={items} {...{savedKeys,onEvent,onVenue,onSave,now}}/></div>)}
  {rows.length>limit&&<button type="button" className="gtc-load-more" onClick={()=>setLimit(n=>n+36)}>Show more ({rows.length-limit} left)</button>}
 </section>
}
