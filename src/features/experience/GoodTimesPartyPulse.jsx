import React, { useEffect, useMemo, useState } from 'react'
import { readSession } from '../auth/client.js'
import { cityLabel, cityOptions, loadGoodTimesProfile, todayISO } from '../intelligence/client.js'

const PARTY_CATEGORIES = new Set(['nightlife','day_parties_brunch'])
const PARTY_WORDS = /\b(day party|night party|party|club|rooftop|after party|after-party|brunch|dj|dance|r&b|rnb|hip hop|hip-hop|karaoke|lounge|pool party|afrobeats|amapiano)\b/i
const NIGHT_WORDS = /\b(club|night|nightlife|after party|after-party|lounge|late night|sundays|fridays|saturdays)\b/i
const LABEL_TO_ID = new Map(cityOptions.map(([id,label]) => [String(label).toLowerCase(), id]))

function daysAway(value){
  if(!value)return 999
  const today=new Date(`${todayISO()}T12:00:00`)
  const next=new Date(`${value}T12:00:00`)
  return Math.round((next-today)/86400000)
}
function hourOf(value){
  const match=String(value||'').match(/^(\d{1,2}):/)
  return match?Number(match[1]):-1
}
function formatTime(value){
  if(!value)return 'Time TBA'
  const match=String(value).match(/^(\d{1,2}):(\d{2})/)
  if(!match)return value
  const hour=Number(match[1])
  return `${hour%12||12}:${match[2]} ${hour>=12?'PM':'AM'}`
}
function formatDate(value){
  if(!value)return 'Date TBA'
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})
}
function partyText(event){
  return [event?.title,event?.venue_name,event?.raw_type,event?.raw_category,event?.category_key,event?.subcategory_key].filter(Boolean).join(' ')
}
function isParty(event){
  const text=partyText(event)
  return PARTY_CATEGORIES.has(event?.category_key)||String(event?.raw_type||'').toLowerCase()==='nightlife'||PARTY_WORDS.test(text)
}
function partyPriority(event){
  const text=partyText(event)
  const hour=hourOf(event?.event_time)
  let score=0
  if(event?.category_key==='nightlife')score+=80
  else if(String(event?.raw_type||'').toLowerCase()==='nightlife')score+=72
  else if(event?.category_key==='day_parties_brunch')score+=24
  if(hour>=21)score+=38
  else if(hour>=17)score+=28
  else if(hour>=15)score+=12
  if(NIGHT_WORDS.test(text))score+=26
  if(/\bparty\b/i.test(text))score+=14
  if(/\b(rooftop|dj|dance|r&b|rnb|hip hop|hip-hop|afrobeats|amapiano)\b/i.test(text))score+=9
  if(/\bbrunch\b/i.test(text)&&!/\b(day party|night party|after party|club)\b/i.test(text))score-=24
  return score
}
function mediaUrl(value){
  const text=String(value||'').trim()
  if(!text)return ''
  if(text.startsWith('/')||text.includes('dzlmtvodpyhetvektfuo.supabase.co'))return text
  return `/api/media?url=${encodeURIComponent(text)}`
}
function clickNav(label){
  const button=[...document.querySelectorAll('.gt2-nav button')].find(item=>String(item.textContent||'').toLowerCase().includes(label.toLowerCase()))
  if(button instanceof HTMLElement){button.click();return true}
  return false
}

export default function GoodTimesPartyPulse(){
  const [city,setCity]=useState('atlanta')
  const [events,setEvents]=useState([])
  const [serviceDate,setServiceDate]=useState(todayISO())
  const [mode,setMode]=useState('tonight')
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let active=true
    ;(async()=>{
      const profile=await loadGoodTimesProfile(readSession()).catch(()=>null)
      if(active)setCity(profile?.last_city||profile?.home_city||'atlanta')
    })()
    return()=>{active=false}
  },[])

  useEffect(()=>{
    const sync=()=>{
      const button=document.querySelector('.gt2-city')
      if(!(button instanceof HTMLElement))return
      const text=String(button.textContent||'').replace('⌖','').trim().toLowerCase()
      const exact=LABEL_TO_ID.get(text)
      if(exact&&exact!==city)setCity(exact)
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{subtree:true,childList:true,characterData:true})
    return()=>observer.disconnect()
  },[city])

  useEffect(()=>{
    let cancelled=false
    setLoading(true)
    ;(async()=>{
      try{
        const response=await fetch(`/api/data-fast?city=${encodeURIComponent(city)}&event_limit=120&venue_limit=20`,{cache:'no-store',headers:{Accept:'application/json'}})
        const payload=await response.json().catch(()=>null)
        if(!response.ok||!payload?.ok)throw new Error(payload?.error||'Party feed unavailable')
        if(!cancelled){
          setServiceDate(payload?.local_clock?.service_date||todayISO())
          setEvents((payload.events||[]).filter(isParty))
        }
      }catch{
        if(!cancelled)setEvents([])
      }finally{
        if(!cancelled)setLoading(false)
      }
    })()
    return()=>{cancelled=true}
  },[city])

  const tonight=useMemo(()=>events
    .filter(item=>item.event_date===serviceDate&&partyPriority(item)>=70)
    .sort((a,b)=>partyPriority(b)-partyPriority(a)||String(b.event_time||'').localeCompare(String(a.event_time||''))),[events,serviceDate])
  const week=useMemo(()=>events
    .filter(item=>{
      const diff=Math.round((new Date(`${item.event_date}T12:00:00`)-new Date(`${serviceDate}T12:00:00`))/86400000)
      return diff>=0&&diff<=7
    })
    .sort((a,b)=>String(a.event_date||'').localeCompare(String(b.event_date||''))||partyPriority(b)-partyPriority(a)||String(b.event_time||'').localeCompare(String(a.event_time||''))),[events,serviceDate])
  useEffect(()=>{if(!tonight.length&&week.length)setMode('week')},[tonight.length,week.length])
  const rows=mode==='tonight'?tonight:week
  const top=rows[0]||week[0]||null

  const buildAround=item=>{
    setOpen(false)
    window.dispatchEvent(new CustomEvent('goodtimes:build-seed',{detail:{title:item.title,venue_name:item.venue_name,event_date:item.event_date,event_time:item.event_time}}))
  }

  return <aside className={`gt-party-pulse ${open?'open':''}`} aria-label="GOOD TIMES Party Board">
    <button className="gt-party-peek" type="button" onClick={()=>setOpen(value=>!value)}>
      <span className="gt-party-live"><i/> PARTY BOARD</span>
      <span className="gt-party-peek-copy">
        <small>{mode==='tonight'?'TONIGHT':'THIS WEEK'} · {cityLabel(city)}</small>
        <strong>{loading?'Checking tonight’s moves…':top?.title||'No strong party listing yet'}</strong>
        {top&&<em>{formatTime(top.event_time)} · {top.venue_name||'Location TBA'}</em>}
      </span>
      <span className="gt-party-count">{rows.length||week.length}</span>
      <span className="gt-party-chevron">{open?'×':'⌃'}</span>
    </button>

    {open&&<div className="gt-party-drawer">
      <div className="gt-party-drawer-head">
        <div><span>WHAT’S ACTUALLY POPPING</span><h2>Party & club moves</h2><p>Current source-backed nightlife for {cityLabel(city)}.</p></div>
        <button type="button" onClick={()=>setOpen(false)}>×</button>
      </div>
      <div className="gt-party-tabs"><button className={mode==='tonight'?'active':''} onClick={()=>setMode('tonight')}>Tonight <small>{tonight.length}</small></button><button className={mode==='week'?'active':''} onClick={()=>setMode('week')}>This Week <small>{week.length}</small></button></div>
      <div className="gt-party-list">
        {loading&&<div className="gt-party-empty">Checking live party inventory…</div>}
        {!loading&&!rows.length&&<div className="gt-party-empty">No strong source-backed evening move in this window yet. Open This Week or Dates for the full city feed.</div>}
        {!loading&&rows.slice(0,8).map(item=><article className="gt-party-card" key={item.event_key}>
          {item.image_url&&<img src={mediaUrl(item.image_url)} alt=""/>}
          <div><small>{formatDate(item.event_date)} · {formatTime(item.event_time)}</small><h3>{item.title}</h3><p>{item.venue_name||'Location TBA'}</p><div>{item.ticket_url&&<a href={item.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}<button type="button" onClick={()=>buildAround(item)}>Build around this ✦</button></div></div>
        </article>)}
      </div>
      <button className="gt-party-calendar" type="button" onClick={()=>{setOpen(false);clickNav('Dates')}}>Open the full Dates feed →</button>
    </div>}
  </aside>
}
