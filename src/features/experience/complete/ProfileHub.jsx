import React,{useState} from 'react'
import GoodTimesIcon from '../GoodTimesIcon.jsx'
import {Saved as MyGoodTimesLibrary} from './Details.jsx'
import {list} from './model.js'
import {Icon,PhotoTile,ConciergeBand,SCENES} from './Kit.jsx'

export default function ProfileHub({
  session,profile,intelligence,city,cityLabel,cityOptions,saved=[],plans=[],events=[],venues=[],
  onCity,onEvent,onVenue,onSave,onPlan,onPlaces,onEntertainment,onBuild,
  follows=[],onRadar,onPreferences,onAuth,onLogout
}){
 const [view,setView]=useState('library')
 const signalCount=Number(intelligence?.signal_count||0)
 const name=profile?.full_name||session?.user?.user_metadata?.full_name||'Your Good Times'
 const realName=profile?.full_name||session?.user?.user_metadata?.full_name
 const initials=realName?String(realName).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase():'GT'
 const savedPlaces=list(saved).filter(i=>i.item_type==='venue').length,savedEvents=list(saved).filter(i=>i.item_type==='event').length
 return <section className="gt5-screen gt5-profile gtc-profile-hub gtk-themed gtk-theme-rose">
  <header className="gtc-profile-intro gtk-account" style={{'--gtk-band-image':`url("${SCENES.penthouse}")`}}>
   <div className="gtk-account-art" aria-hidden="true"/>
   <div className="gtk-avatar" aria-hidden="true">{initials}</div>
   <div className="gtk-account-copy"><small>{session?'YOUR ACCOUNT':'MY GOOD TIMES'}</small><h1>{name}</h1><p>{session?'Good People. Better Nights.':'Browse freely. Sign in when you want GOOD TIMES to remember the places and experiences you care about.'}</p>
    <div className="gtk-account-badges">{session&&<span><Icon name="crown" size={14}/>GT MEMBER</span>}<span className="is-concierge"><Icon name="star" size={14}/>CONCIERGE</span></div></div>
   <div className="gtk-account-city"><Icon name="pin" size={20}/><span><strong>{cityLabel}</strong><small>Your preferred city</small></span><button type="button" onClick={()=>setView('preferences')}>Change City<Icon name="chevron" size={14}/></button></div>
   <div className="gtk-script" aria-hidden="true"><span>Elevated</span><span>Experiences</span><span>Everywhere</span><span>You Go.</span></div>
  </header>
  <aside className="gtk-saved-banner"><Icon name="saved" size={30}/><div><h2>Saved <em>Now Lives Here</em></h2><p>All your saved places, events and plans are in your Profile.</p></div></aside>
  <div className="gtk-profile-tiles">
   {[['library','Saved Places',`${savedPlaces} ${savedPlaces===1?'Place':'Places'}`,SCENES.terrace,'heart'],['library','Saved Entertainment',`${savedEvents} ${savedEvents===1?'Event':'Events'}`,SCENES.concert,'music'],['library','Plans',`${list(plans).length} Itineraries`,SCENES.skyline,'calendar'],['following','Following',`${list(follows).length} Watching`,SCENES.dining,'bell']].map(([v,label,sub,img,icon])=><PhotoTile key={label} image={img} icon={icon} label={label} sub={sub} onClick={()=>setView(v)}/>)}
  </div>
  <nav className="gtc-profile-tabs" aria-label="My GOOD TIMES sections">
   {[['library','Library'],['following','Following'],['preferences','Preferences'],['account','Account']].map(([id,label])=><button key={id} className={view===id?'active':''} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}
  </nav>

  {view==='library'&&<MyGoodTimesLibrary session={session} items={saved} plans={plans} events={events} venues={venues} onEvent={onEvent} onVenue={onVenue} onSave={onSave} onPlan={onPlan} onExplore={onPlaces} onEntertainment={onEntertainment} onBuild={onBuild}/>}
  {view==='following'&&<section className="gtc-profile-panel"><header><div><small>FOLLOWING</small><h2>What GOOD TIMES watches for you.</h2></div><button onClick={onRadar}>Radar & alerts ↗</button></header>{list(follows).length?<div className="gtc-follow-list">{follows.map(f=><article key={String(f.entity_type)+':'+String(f.entity_id)}><span><strong>{f.metadata?.name||f.entity_type}</strong><small>{f.city_slug||cityLabel}</small></span><em>{f.alert_level||'normal'}</em></article>)}</div>:<div className="gtc-profile-empty"><strong>Nothing followed yet.</strong><p>Follow a venue, artist, event or team from its detail page. GOOD TIMES will surface changes through Radar.</p><button onClick={onEntertainment}>Explore Entertainment</button></div>}</section>}
  {view==='preferences'&&<section className="gtc-profile-panel"><header><div><small>YOUR TASTE</small><h2>Make GOOD TIMES more useful.</h2></div><strong>{signalCount} preferences learned</strong></header><p>{signalCount?'GOOD TIMES gets better as you explore, save, follow and build plans. We’re getting to know your taste.':'Choose what you like and GOOD TIMES will learn from what you explore over time.'}</p><button className="gtc-profile-action" onClick={onPreferences}><GoodTimesIcon glyph="♡"/><span><strong>Edit My Preferences</strong><small>{(profile?.vibe_preferences||[]).length?String(profile.vibe_preferences.length)+' tastes selected':'Dining, nightlife, music, sports and more'}</small></span><b>›</b></button><label className="gtc-profile-city-select"><span><strong>Preferred city</strong><small>GOOD TIMES currently launches customer discovery in Atlanta.</small></span><select value={city} onChange={e=>onCity(e.target.value)}>{cityOptions.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></section>}
  {view==='account'&&<section className="gtc-profile-panel"><header><div><small>ACCOUNT</small><h2>Your GOOD TIMES account.</h2></div></header><div className="gtc-profile-actions"><a href="/privacy.html"><GoodTimesIcon glyph="⌾"/><span><strong>Privacy & Security</strong><small>Your data and account information.</small></span><b>›</b></a><a href="mailto:info@thegoodtimesworldwide.com?subject=GOOD%20TIMES%20Support"><b>?</b><span><strong>Help & Support</strong><small>Contact the GOOD TIMES team.</small></span><b>›</b></a></div>{!session&&onAuth&&<button className="gtc-primary" onClick={onAuth}>Sign in or create account</button>}{session&&<button className="gtc-profile-logout" onClick={onLogout}>Log Out</button>}</section>}
  <ConciergeBand onClick={onBuild} title="Your Concierge Is Here." kicker="PERSONAL SUPPORT. ANYTIME."/>
 </section>
}
