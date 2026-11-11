import React,{useEffect,useState} from 'react'
import {Icon} from './Kit.jsx'
import {safeLink,displayDate} from './model.js'

// Atlanta teams at a glance: the game in progress (with score) or the next one on the schedule.
// Everything shown comes from the provider's team feed via /api/sports-live?view=teams — nothing is estimated.
const clock=t=>{if(!t)return 'Time TBD';const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`}
export function teamLine(team){
 const g=team?.game
 if(!g)return {tag:'OFF SEASON',main:'No game scheduled',sub:team?.standing||team?.record||''}
 const vs=`${g.is_home?'vs':'@'} ${g.opponent}`
 if(g.state==='live')return {tag:'LIVE',live:true,main:`${g.team_abbr||team.short} ${g.team_score??'–'} · ${g.opponent_abbr||g.opponent} ${g.opponent_score??'–'}`,sub:[g.detail,vs].filter(Boolean).join(' · ')}
 if(g.state==='final')return {tag:'FINAL',main:`${g.team_abbr||team.short} ${g.team_score??'–'} · ${g.opponent_abbr||g.opponent} ${g.opponent_score??'–'}`,sub:vs}
 return {tag:'NEXT GAME',main:vs,sub:[g.date?displayDate(g.date):null,clock(g.time)].filter(Boolean).join(' · ')}
}
export default function TeamBoard({title='Atlanta',accent='Teams',compact=false}){
 const [state,setState]=useState({teams:[],asOf:null})
 useEffect(()=>{let live=true,timer
  const load=async()=>{try{const r=await fetch('/api/sports-live?view=teams',{headers:{Accept:'application/json'}});const b=await r.json();if(live&&b?.ok&&Array.isArray(b.teams))setState({teams:b.teams,asOf:b.asOf})}catch{}
   if(live)timer=setTimeout(load,document.visibilityState==='visible'?60000:180000)}
  load();return()=>{live=false;clearTimeout(timer)}},[])
 if(!state.teams.length)return null
 return <section className={`gtk-section gtk-teams ${compact?'is-compact':''}`} aria-label="Atlanta teams">
  <header className="gtk-section-head"><div><h2>{title} <em>{accent}</em></h2><p>Live scores &amp; next games</p></div></header>
  <div className="gtk-scroller gtk-team-row">{state.teams.map(t=>{const l=teamLine(t),url=safeLink(t.game?.url);const body=<><span className="gtk-team-top"><small>{t.league}</small><b className={l.live?'is-live':''}>{l.live&&<i aria-hidden="true"/>}{l.tag}</b></span><strong>{t.short}</strong>{t.record&&<em>{t.record}{t.standing?` · ${t.standing}`:''}</em>}<span className="gtk-team-main">{l.main}</span><span className="gtk-team-sub">{l.sub}</span>{t.game?.venue&&<span className="gtk-team-venue"><Icon name="pin" size={11}/>{t.game.venue}</span>}{t.game?.broadcast&&<span className="gtk-team-venue">TV · {t.game.broadcast}</span>}</>
   return url?<a key={t.key} className="gtk-team-card" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t.name}: ${l.tag}. ${l.main}. ${l.sub}`}>{body}</a>:<article key={t.key} className="gtk-team-card">{body}</article>})}</div>
 </section>
}
