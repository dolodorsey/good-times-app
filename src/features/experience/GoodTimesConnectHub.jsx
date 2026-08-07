import React, { useEffect, useMemo, useState } from 'react'
import { getProfile, readSession, updatePreferences } from '../auth/client.js'
import { VIBE_OPTIONS } from '../onboarding/options.js'

const TABS=[['current','Current'],['network','Network'],['links','Links']]
const CITY_OPTIONS=[['atlanta','Atlanta'],['houston','Houston'],['miami','Miami'],['dallas','Dallas'],['charlotte','Charlotte'],['los_angeles','Los Angeles'],['new_york','New York'],['las_vegas','Las Vegas']]

function eventDateLabel(value){
  if(!value)return 'Date TBA'
  const d=new Date(`${value}T12:00:00`)
  return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})
}
function eventTimeLabel(value){
  if(!value)return 'Time TBA'
  const match=String(value).match(/^(\d{1,2}):(\d{2})/)
  if(!match)return value
  const h=Number(match[1])
  return `${h%12||12}:${match[2]} ${h>=12?'PM':'AM'}`
}
function safeOpen(url){
  if(!url)return
  try{window.open(url,'_blank','noopener,noreferrer')}catch{window.location.href=url}
}
function label(value){return String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
async function shareGoodTimes(){
  const payload={title:'GOOD TIMES',text:'Find the move, build the night, and keep the plan in GOOD TIMES.',url:window.location.origin}
  if(navigator.share){try{await navigator.share(payload);return}catch{}}
  try{await navigator.clipboard.writeText(window.location.origin)}catch{}
}
async function inviteCrew(){
  const text=`We outside. Open GOOD TIMES and let’s build the plan: ${window.location.origin}`
  if(navigator.share){try{await navigator.share({title:'Join my GOOD TIMES plan',text});return}catch{}}
  try{await navigator.clipboard.writeText(text)}catch{}
}

export default function GoodTimesConnectHub(){
  const[open,setOpen]=useState(false)
  const[tab,setTab]=useState('current')
  const[city,setCity]=useState('atlanta')
  const[data,setData]=useState({events:[],venues:[]})
  const[profile,setProfile]=useState(null)
  const[profileDraft,setProfileDraft]=useState({full_name:'',home_city:'atlanta',vibes:[]})
  const[editingProfile,setEditingProfile]=useState(false)
  const[savingProfile,setSavingProfile]=useState(false)
  const[profileNotice,setProfileNotice]=useState('')
  const[loading,setLoading]=useState(false)
  const[profileLoading,setProfileLoading]=useState(false)
  const[error,setError]=useState('')
  const[retryNonce,setRetryNonce]=useState(0)

  useEffect(()=>{
    const onKey=e=>{if(e.key==='Escape')setOpen(false)}
    const onOpen=e=>{setTab(e?.detail?.tab||'current');setOpen(true)}
    window.addEventListener('keydown',onKey)
    window.addEventListener('gt:open-connect',onOpen)
    return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('gt:open-connect',onOpen)}
  },[])

  useEffect(()=>{
    if(!open||profile)return
    const session=readSession()
    if(!session?.user?.id||!session?.access_token)return
    let alive=true
    setProfileLoading(true)
    getProfile(session.user.id,session.access_token)
      .then(next=>{
        if(!alive||!next)return
        const nextCity=String(next.home_city||'atlanta').trim().toLowerCase().replace(/[\s-]+/g,'_')
        const nextVibes=Array.isArray(next.vibe_preferences)?next.vibe_preferences:Array.isArray(next.tab_interests)?next.tab_interests:[]
        setProfile(next)
        setProfileDraft({full_name:next.full_name||'',home_city:nextCity,vibes:nextVibes})
        setCity(nextCity)
      })
      .finally(()=>{if(alive)setProfileLoading(false)})
    return()=>{alive=false}
  },[open,profile])

  useEffect(()=>{
    if(!open||tab==='links')return
    let alive=true
    setLoading(true);setError('')
    fetch(`/api/data?city=${encodeURIComponent(city)}&event_limit=36&venue_limit=60`,{headers:{Accept:'application/json'}})
      .then(async r=>{const p=await r.json().catch(()=>null);if(!r.ok||!p?.ok)throw new Error(p?.error||'Live city network unavailable');return p})
      .then(p=>{if(alive)setData({events:p.events||[],venues:p.venues||[]})})
      .catch(err=>{if(alive)setError(err.message||'Live city network unavailable')})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[city,open,tab,retryNonce])

  const current=useMemo(()=>data.events.slice(0,10),[data.events])
  const network=useMemo(()=>{
    const preferred=data.venues.filter(v=>v.is_khg||v.is_black_owned||v.is_culture_pick||v.is_featured)
    return (preferred.length?preferred:data.venues).slice(0,14)
  },[data.venues])
  const vibes=Array.isArray(profile?.vibe_preferences)?profile.vibe_preferences:Array.isArray(profile?.tab_interests)?profile.tab_interests:[]

  const toggleDraftVibe=id=>setProfileDraft(current=>({
    ...current,
    vibes:current.vibes.includes(id)?current.vibes.filter(value=>value!==id):[...current.vibes,id],
  }))
  const saveProfile=async()=>{
    const session=readSession()
    if(!session?.user?.id||!session?.access_token||savingProfile)return
    const fullName=profileDraft.full_name.trim()
    if(fullName.length<2){setProfileNotice('Add a name with at least 2 characters.');return}
    setSavingProfile(true);setProfileNotice('')
    const payload={
      full_name:fullName,
      home_city:profileDraft.home_city,
      vibe_preferences:profileDraft.vibes,
      tab_interests:profileDraft.vibes,
    }
    try{
      const saved=await updatePreferences(session.user.id,payload,session.access_token)
      if(!saved)throw new Error('Profile update was not accepted')
      setProfile(current=>({...current,...payload}))
      setCity(profileDraft.home_city)
      setEditingProfile(false)
      setProfileNotice('Profile updated. Your city and discovery preferences are live.')
    }catch(error){setProfileNotice(error?.message||'Could not update your profile.')}
    finally{setSavingProfile(false)}
  }

  return <>
    <button className="gt-connect-fab" type="button" onClick={()=>setOpen(true)} aria-label="Open Current, Network and Links">
      <span>+</span><b>CONNECT</b>
    </button>
    {open&&<div className="gt-connect-backdrop" role="presentation" onMouseDown={()=>setOpen(false)}>
      <section className="gt-connect-sheet" role="dialog" aria-modal="true" aria-label="GOOD TIMES Connect" onMouseDown={e=>e.stopPropagation()}>
        <header className="gt-connect-head">
          <div><small>GOOD TIMES</small><h2>Connect</h2><p>Your city, your profile, your shortcuts.</p></div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Close">×</button>
        </header>
        <nav className="gt-connect-tabs" aria-label="Connect sections">
          {TABS.map(([id,name])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{name}</button>)}
        </nav>

        {tab!=='links'&&<div className="gt-connect-city">
          <span>Viewing</span>
          <select value={city} onChange={e=>setCity(e.target.value)}>
            {CITY_OPTIONS.map(([id,name])=><option key={id} value={id}>{name}</option>)}
          </select>
        </div>}

        <div className="gt-connect-body">
          {loading&&tab!=='links'&&<div className="gt-connect-state"><i/>Updating the city…</div>}
          {error&&tab!=='links'&&<div className="gt-connect-state error"><b>Live network reconnecting.</b><span>{error}</span><button type="button" onClick={()=>setRetryNonce(value=>value+1)}>Retry</button></div>}

          {!loading&&!error&&tab==='current'&&<>
            <div className="gt-connect-section-title"><span>HAPPENING NEXT</span><h3>Current</h3><p>The quickest read on what is actually worth opening right now.</p></div>
            <div className="gt-current-stack">
              {current.map(item=><button type="button" key={item.event_key} onClick={()=>safeOpen(item.ticket_url)}>
                <div className="gt-current-date"><b>{new Date(`${item.event_date}T12:00:00`).getDate()}</b><span>{new Date(`${item.event_date}T12:00:00`).toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</span></div>
                <div><small>{item.category_key?.replaceAll('_',' ')||'GOOD TIMES PICK'}</small><strong>{item.title}</strong><span>{eventDateLabel(item.event_date)} · {eventTimeLabel(item.event_time)} · {item.venue_name||'Location TBA'}</span></div>
                <em>›</em>
              </button>)}
              {!current.length&&<div className="gt-connect-empty">No current experiences cleared for this city yet.</div>}
            </div>
          </>}

          {!loading&&!error&&tab==='network'&&<>
            <div className="gt-connect-section-title"><span>YOUR NETWORK</span><h3>Your identity + city signal</h3><p>GOOD TIMES starts with your member profile, then layers the places and operators carrying culture around you.</p></div>
            <div className="gt-member-card">
              <div className="gt-member-avatar">{profile?.full_name?.trim()?.charAt(0)?.toUpperCase()||'GT'}</div>
              <div className="gt-member-copy">
                <small>{profileLoading?'LOADING MEMBER':'GOOD TIMES MEMBER'}</small>
                <strong>{profile?.full_name||'Your GOOD TIMES profile'}</strong>
                <span>{label(profile?.home_city||city)}{profile?.age_range?` · ${profile.age_range}`:''}</span>
                {vibes.length>0&&<div>{vibes.slice(0,4).map(vibe=><i key={vibe}>{label(vibe)}</i>)}</div>}
              </div>
              <button type="button" onClick={()=>{setProfileNotice('');setEditingProfile(value=>!value)}}>{editingProfile?'Close':'Edit'}</button>
            </div>
            {editingProfile&&<div className="gt-profile-editor">
              <label><span>Name</span><input value={profileDraft.full_name} onChange={e=>setProfileDraft(current=>({...current,full_name:e.target.value}))} maxLength={80}/></label>
              <label><span>Home city</span><select value={profileDraft.home_city} onChange={e=>setProfileDraft(current=>({...current,home_city:e.target.value}))}>{CITY_OPTIONS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
              <div className="gt-profile-vibes"><span>Your vibes</span><div>{VIBE_OPTIONS.map(option=><button type="button" key={option.id} className={profileDraft.vibes.includes(option.id)?'active':''} onClick={()=>toggleDraftVibe(option.id)}>{option.icon} {option.label}</button>)}</div></div>
              <button className="gt-profile-save" type="button" disabled={savingProfile} onClick={saveProfile}>{savingProfile?'Saving…':'Save profile'}</button>
            </div>}
            {profileNotice&&<div className="gt-profile-notice">{profileNotice}</div>}
            <div className="gt-network-actions"><button type="button" onClick={inviteCrew}>Invite your crew</button><button type="button" onClick={shareGoodTimes}>Share GOOD TIMES</button></div>
            <div className="gt-network-grid">
              {network.map(item=><article key={item.id}>
                <div className="gt-network-img" style={{backgroundImage:`url(${item.hero_image||'/good-times-logo.png'})`}}><span>{item.is_khg?'KOLLECTIVE':item.is_black_owned?'BLACK-OWNED':item.is_culture_pick?'CULTURE PICK':'CITY PICK'}</span></div>
                <div><small>{item.neighborhood||item.city_key?.replaceAll('_',' ')}</small><h4>{item.name}</h4><p>{item.short_desc||item.category_key?.replaceAll('_',' ')||'GOOD TIMES network'}</p><div>{item.website&&<button type="button" onClick={()=>safeOpen(item.website)}>Website</button>}{item.booking_link&&<button type="button" onClick={()=>safeOpen(item.booking_link)}>Book</button>}{item.instagram_handle&&<button type="button" onClick={()=>safeOpen(`https://instagram.com/${String(item.instagram_handle).replace('@','')}`)}>IG</button>}</div></div>
              </article>)}
              {!network.length&&<div className="gt-connect-empty">Network data is still being qualified for this city.</div>}
            </div>
          </>}

          {tab==='links'&&<>
            <div className="gt-connect-section-title"><span>QUICK LINKS</span><h3>Do something</h3><p>No dead-end link page. Every shortcut starts a real GOOD TIMES flow.</p></div>
            <div className="gt-links-grid">
              <a href="/concierge-request"><b>✦</b><span><strong>Concierge Request</strong><small>Tell us what you need</small></span><em>›</em></a>
              <a href="/group"><b>◎</b><span><strong>Group Plans</strong><small>Coordinate the whole crew</small></span><em>›</em></a>
              <a href="/trip"><b>↗</b><span><strong>Plan a Trip</strong><small>Build beyond one night</small></span><em>›</em></a>
              <a href="/join"><b>+</b><span><strong>Join GOOD TIMES</strong><small>Bring somebody into the network</small></span><em>›</em></a>
              <a href="/connect.html"><b>◇</b><span><strong>Partner With GOOD TIMES</strong><small>Venues, events, artists, vendors, creators, sponsors and hiring</small></span><em>›</em></a>
              <button type="button" onClick={()=>window.dispatchEvent(new CustomEvent('gt:open-payments'))}><b>▣</b><span><strong>Tickets + VIP</strong><small>Paid experiences and access</small></span><em>›</em></button>
              <button type="button" onClick={shareGoodTimes}><b>⌁</b><span><strong>Share GOOD TIMES</strong><small>Send the app instantly</small></span><em>›</em></button>
            </div>
          </>}
        </div>
      </section>
    </div>}
  </>
}