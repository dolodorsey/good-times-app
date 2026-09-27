import React,{useEffect,useState}from'react'
import CompactEventCollection from'./CompactEventCollection.jsx'
import{dateLabel,timeLabel,safeURL}from'./compact-display.js'
export default function CompactSports({onBack,onDiscover,...props}){
 const[state,setState]=useState({status:'loading',teams:[],games:[]}),[league,setLeague]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{const c=new AbortController();setState(s=>({...s,status:'loading'}));fetch('/api/compact-sports',{signal:c.signal}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(d=>{if(!c.signal.aborted)setState({...d,status:'success'})}).catch(()=>{if(!c.signal.aborted)setState(s=>({...s,status:'error'}))});return()=>c.abort()},[retry])
 const games=state.games.filter(g=>!league||g.league===league)
 return <section className="gt-complete-sports"><header className="gt-complete-heading"><button onClick={onBack} aria-label="Back to Home">‹</button><h1>Sports & Watch</h1><button onClick={()=>setRetry(n=>n+1)}>Refresh</button></header>
 <div className="gt-complete-teams">{state.teams.map(t=><button className={league===t.league?'active':''} key={t.id} onClick={()=>setLeague(league===t.league?'':t.league)}><small>{t.league}</small><strong>{t.name}</strong></button>)}</div>
 {state.status==='error'&&<p role="alert">Game updates couldn’t refresh. <button onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
 {state.notice&&<p className="gt-compact-note">{state.notice}</p>}
 {games.length>0&&<div className="gt-complete-grid">{games.map(g=><article key={g.id} className="gt-complete-matchup"><small>{g.league} · {g.is_home_game?'Home game':'Away game'}</small><h3>{g.home_team}<span>vs</span>{g.away_team}</h3>{g.score_verified&&<strong className="gt-complete-score">{g.home_score} – {g.away_score} · {g.status==='live'?'Live':'Final'}</strong>}<p>{dateLabel(g.game_date)} · {timeLabel(g.game_time)}</p><p>{g.venue}</p><small>Updated {new Date(g.updated_at).toLocaleString('en-US',{timeZone:'America/New_York'})} ET</small></article>)}</div>}
 <div className="gt-complete-official"><h2>Official team schedules</h2><div className="gt-complete-grid">{state.teams.filter(t=>!league||t.league===league).map(t=><a key={t.id} href={safeURL(t.url)} target="_blank" rel="noreferrer"><strong>{t.full}</strong><small>{t.league} · View schedule ↗</small></a>)}</div></div>
 <button className="gt-complete-inline-cta" onClick={()=>onDiscover('sports_watch')}>Places to watch <span>↗</span></button>
 <CompactEventCollection category="sports_watch" taxonomy={props.taxonomy} savedKeys={props.savedKeys} onOpen={props.onEvent} onSave={props.onSave} now={props.now}/>
 </section>
}
