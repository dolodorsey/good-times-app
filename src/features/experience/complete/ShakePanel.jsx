import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Icon,SCENES} from './Kit.jsx'
import {venueKind,eventWhen} from './posters.jsx'
import {unique,safeImage,occurrenceUsable,cleanTitle,labelFor} from './model.js'
import {tonightOrNext} from './tonight.js'

// Shake It: one tap (or a phone shake) picks one real, verified Atlanta option from the loaded feed.
// Every pick is a real listing; nothing is generated. Filters narrow the pool, never fill it.
const NIGHT=/night|club|lounge|hookah|bar|rooftop|speakeasy|jazz|strip|gentlem/
const EAT=/restaurant|dining|food|brunch|cafe|bakery|steak|sushi|pizza|bbq|seafood|grill|kitchen/
const DO=/entertainment|interactive|arcade|bowling|escape|immersive|museum|attraction|vr|golf|game|experience|culture|park/
export const SHAKE_FILTERS=[
 {id:'any',label:'Anything',icon:'sparkle'},
 {id:'eat',label:'Eat',icon:'food'},
 {id:'drink',label:'Drink',icon:'cocktail'},
 {id:'turn-up',label:'Turn Up',icon:'music'},
 {id:'date',label:'Date Night',icon:'heart'},
 {id:'do',label:'Do Something',icon:'game'},
 {id:'tonight',label:'Tonight’s Events',icon:'ticket'},
]
const text=v=>[v?.category_key,v?.venue_category_key,v?.subcategory,v?.venue_subcategory,...(v?.vibe_tags||[]),...(v?.search_tags||[])].filter(Boolean).join(' ').toLowerCase()
export function shakePool(filter,venues=[],events=[],now=Date.now()){
 const vs=unique(venues),es=unique(events).filter(e=>occurrenceUsable(e,now))
 const night=tonightOrNext(es,now).rows
 switch(filter){
  case 'eat':return vs.filter(v=>EAT.test(text(v))&&!NIGHT.test(String(v.venue_category_key||v.category_key||'')))
  case 'drink':return vs.filter(v=>/bar|lounge|rooftop|wine|cocktail|speakeasy|hookah|brewery/.test(text(v)))
  case 'turn-up':return [...es.filter(e=>e.category_key==='nightlife'),...vs.filter(v=>/nightclub|club|strip|gentlem/.test(text(v)))]
  case 'date':return vs.filter(v=>/date|romantic|intimate|upscale|rooftop|wine|steak|sushi|italian|french|cocktail/.test(text(v))||v.price_range==='$$$'||v.price_range==='$$$$')
  case 'do':return [...vs.filter(v=>DO.test(text(v))),...es.filter(e=>['games_interactive','arts_museums_culture','comedy_performing_arts'].includes(e.category_key))]
  case 'tonight':return night
  default:return [...vs,...night]
 }
}
const keyOf=x=>x?.event_key||`venue:${x?.id}`
export default function ShakePanel({venues=[],events=[],now=Date.now(),onVenue,onEvent,onBuild}){
 const [filter,setFilter]=useState('any'),[pick,setPick]=useState(null),[skipped,setSkipped]=useState([]),[motion,setMotion]=useState('off'),[spin,setSpin]=useState(false)
 const pool=useMemo(()=>shakePool(filter,venues,events,now),[filter,venues,events,now])
 const shakeRef=useRef(null)
 const roll=(skip=skipped)=>{
  const fresh=pool.filter(x=>!skip.includes(keyOf(x))),base=fresh.length?fresh:pool
  if(!base.length){setPick(null);return}
  const withArt=base.filter(x=>safeImage(x.hero_image||x.image_url)),from=withArt.length>=3?withArt:base
  setSpin(true);setTimeout(()=>setSpin(false),420)
  setPick(from[Math.floor(Math.random()*from.length)])
 }
 shakeRef.current=roll
 useEffect(()=>{setPick(null);setSkipped([])},[filter])
 useEffect(()=>{if(motion!=='on')return;let last=0;const h=e=>{const a=e.accelerationIncludingGravity||{};const f=Math.abs(a.x||0)+Math.abs(a.y||0)+Math.abs(a.z||0);const t=Date.now();if(f>34&&t-last>1200){last=t;shakeRef.current?.()}};window.addEventListener('devicemotion',h);return()=>window.removeEventListener('devicemotion',h)},[motion])
 const enableMotion=async()=>{try{const D=window.DeviceMotionEvent;if(D?.requestPermission){const r=await D.requestPermission();setMotion(r==='granted'?'on':'denied')}else setMotion(D?'on':'unsupported')}catch{setMotion('denied')}}
 const isEvent=Boolean(pick?.event_key),img=safeImage(pick?.hero_image||pick?.image_url)
 const kind=pick?(isEvent?labelFor(pick.category_key):venueKind(pick)):''
 return <section className="gtk-shake" aria-label="Shake It">
  <header className="gtk-shake-head"><small>GOOD TIMES SHAKE</small><h2>What are we <em>getting into?</em></h2><p>Pick a lane, then shake your phone or tap Pick for me.</p></header>
  <div className="gtk-pills is-scroll gtk-shake-filters" role="group" aria-label="Shake filters">{SHAKE_FILTERS.map(f=><button type="button" key={f.id} className={filter===f.id?'active':''} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}><Icon name={f.icon} size={15}/>{f.label}</button>)}</div>
  <button type="button" className={`gtk-shake-button ${spin?'is-spinning':''}`} onClick={()=>roll()} disabled={!pool.length}>Pick for me</button>
  <div className="gtk-shake-meta"><span>{pool.length?`${pool.length} verified options in this lane`:'Nothing verified in this lane right now — try another.'}</span>{motion!=='on'&&<button type="button" className="gtk-link" onClick={enableMotion}>{motion==='denied'?'Motion blocked in settings':motion==='unsupported'?'Shake not supported here':'Enable phone shake'}</button>}</div>
  {pick&&<article key={keyOf(pick)} className="gt-shake__result gtk-shake-result" style={{'--gtk-shake-image':`url("${img||SCENES.district}")`}}>
   <div className="gtk-shake-art" aria-hidden="true"/>
   <div className="gtk-shake-copy"><span className="gtk-badge">{isEvent?(eventWhen(pick,now)||'UPCOMING'):'GOOD TIMES PICK'}</span><small>{kind}</small><h3>{cleanTitle(isEvent?pick.title:pick.name)}</h3><p>{isEvent?pick.venue_name:[pick.neighborhood,pick.price_range].filter(Boolean).join(' · ')||'Atlanta'}</p>
    <div className="gtk-shake-actions"><button type="button" className="primary" onClick={()=>isEvent?onEvent?.(pick):onVenue?.(pick)}>Let’s go<Icon name="arrow" size={16}/></button><button type="button" onClick={()=>roll()}>Shake again</button><button type="button" onClick={()=>{const next=[...skipped,keyOf(pick)];setSkipped(next);roll(next)}}>Not my vibe</button>{onBuild&&<button type="button" onClick={()=>onBuild(pick)}>Build a night around this</button>}</div>
   </div>
  </article>}
 </section>
}
