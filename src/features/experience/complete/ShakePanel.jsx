import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Icon,SCENES} from './Kit.jsx'
import {venueKind,eventWhen} from './posters.jsx'
import {unique,safeImage,occurrenceUsable,cleanTitle,labelFor} from './model.js'
import {tonightOrNext} from './tonight.js'
import {eventIsThisWeekend} from '../good-times-event-clock.js'

// Shake It: one tap (or a phone shake) picks real, verified Atlanta options from the loaded feed.
// Every pick is a real listing; nothing is generated. Filters narrow the pool, never fill it.
const NIGHT=/night|club|lounge|hookah|bar|rooftop|speakeasy|jazz|strip|gentlem/
const EAT=/restaurant|dining|food|brunch|cafe|bakery|steak|sushi|pizza|bbq|seafood|grill|kitchen/
const DO=/entertainment|interactive|arcade|bowling|escape|immersive|museum|attraction|vr|golf|game|experience|culture|park/
export const SHAKE_FILTERS=[
 {id:'any',label:'Anything',icon:'sparkle'},
 {id:'tonight',label:'Tonight’s Events',icon:'ticket'},
 {id:'turn-up',label:'Turn Up',icon:'music'},
 {id:'drink',label:'Drinks',icon:'cocktail'},
 {id:'eat',label:'Eat',icon:'food'},
 {id:'brunch',label:'Brunch',icon:'sun'},
 {id:'date',label:'Date Night',icon:'heart'},
 {id:'rooftop',label:'Rooftops',icon:'building'},
 {id:'hookah',label:'Hookah',icon:'smoke'},
 {id:'live',label:'Live Music',icon:'mic'},
 {id:'comedy',label:'Comedy',icon:'masks'},
 {id:'sports',label:'Sports',icon:'ball'},
 {id:'do',label:'Do Something',icon:'game'},
 {id:'weekend',label:'This Weekend',icon:'calendar'},
 {id:'after-dark',label:'After Dark 21+',icon:'moon'},
]
export const SHAKE_AREAS=[['','Anywhere'],['midtown','Midtown'],['buckhead','Buckhead'],['downtown','Downtown'],['west midtown','West Midtown'],['old fourth ward|o4w|inman|beltline|edgewood|poncey','O4W & BeltLine'],['east atlanta|little five|l5p|kirkwood|decatur|east lake','Eastside'],['west end|westside|college park|camp creek|cascade|greenbriar|southwest','Westside & SW']]
export const SHAKE_PRICES=[['','Any $'],['$','$'],['$$','$$'],['$$$','$$$'],['$$$$','$$$$']]
const text=v=>[v?.category_key,v?.venue_category_key,v?.subcategory,v?.venue_subcategory,...(v?.vibe_tags||[]),...(v?.search_tags||[])].filter(Boolean).join(' ').toLowerCase()
const isEvent=x=>Boolean(x?.event_key)
export function shakePool(filter,venues=[],events=[],now=Date.now()){
 const vs=unique(venues),es=unique(events).filter(e=>occurrenceUsable(e,now))
 const night=tonightOrNext(es,now).rows
 const evCat=(...cats)=>es.filter(e=>cats.includes(e.category_key))
 switch(filter){
  case 'eat':return vs.filter(v=>EAT.test(text(v))&&!NIGHT.test(String(v.venue_category_key||v.category_key||'')))
  case 'brunch':return [...vs.filter(v=>/brunch|breakfast/.test(text(v))),...evCat('day_parties_brunch')]
  case 'drink':return vs.filter(v=>/bar|lounge|rooftop|wine|cocktail|speakeasy|hookah|brewery/.test(text(v)))
  case 'rooftop':return vs.filter(v=>/rooftop|terrace|skyline/.test(`${text(v)} ${v.name}`.toLowerCase()))
  case 'hookah':return vs.filter(v=>/hookah/.test(`${text(v)} ${v.name}`.toLowerCase()))
  case 'turn-up':return [...evCat('nightlife'),...vs.filter(v=>/nightclub|club/.test(text(v))&&!/strip|gentlem/.test(text(v)))]
  case 'after-dark':return vs.filter(v=>/strip|gentlem|nightclub|hookah|lounge/.test(text(v)))
  case 'date':return vs.filter(v=>/date|romantic|intimate|upscale|rooftop|wine|steak|sushi|italian|french|cocktail/.test(text(v))||v.price_range==='$$$'||v.price_range==='$$$$')
  case 'live':return evCat('concerts_live_music')
  case 'comedy':return evCat('comedy_performing_arts')
  case 'sports':return evCat('sports_watch')
  case 'do':return [...vs.filter(v=>DO.test(text(v))),...evCat('games_interactive','arts_museums_culture')]
  case 'weekend':return es.filter(e=>eventIsThisWeekend(e,'atlanta',now))
  case 'tonight':return night
  default:return [...vs,...night]
 }
}
/** Area and price refine the lane; they never add anything that isn't already in it. */
export function refinePool(pool,{area='',price=''}={}){
 return pool.filter(x=>{
  if(area){const where=`${x.neighborhood||''} ${x.venue_neighborhood||''} ${x.address||''} ${x.venue_address||''}`.toLowerCase();if(!new RegExp(`\\b(${area})\\b`).test(where))return false}
  if(price&&!isEvent(x)&&x.price_range!==price)return false
  return true
 })
}
const keyOf=x=>x?.event_key||`venue:${x?.id}`
function pickSome(pool,skip,count=3){
 const fresh=pool.filter(x=>!skip.includes(keyOf(x))),base=fresh.length?fresh:pool
 const withArt=base.filter(x=>safeImage(x.hero_image||x.image_url)),from=[...(withArt.length>=count?withArt:base)]
 const out=[];while(from.length&&out.length<count){out.push(from.splice(Math.floor(Math.random()*from.length),1)[0])}
 return out
}
function PickCard({item,now,hero=false,onOpen,onAgain,onSkip,onBuild}){
 const ev=isEvent(item),img=safeImage(item.hero_image||item.image_url)
 const kind=ev?labelFor(item.category_key):venueKind(item)
 const where=ev?item.venue_name:[item.neighborhood,item.price_range].filter(Boolean).join(' · ')||'Atlanta'
 return <article className={`gtk-shake-pick ${hero?'gt-shake__result gtk-shake-result is-hero':''}`} style={{'--gtk-shake-image':`url("${img||SCENES.district}")`}}>
  <button type="button" className="gtk-shake-open" onClick={()=>onOpen(item)} aria-label={`Open ${cleanTitle(ev?item.title:item.name)}`}>
   <span className="gtk-shake-art" aria-hidden="true"/>{!img&&<span className="gtk-shake-nophoto" aria-hidden="true">Verified photo coming soon</span>}
   <span className="gtk-shake-copy"><span className="gtk-badge">{ev?(eventWhen(item,now)||'UPCOMING'):hero?'GOOD TIMES PICK':'ALSO GOOD'}</span>{kind&&<small>{kind}</small>}<strong>{cleanTitle(ev?item.title:item.name)}</strong><em>{where}</em></span>
  </button>
  {hero&&<div className="gtk-shake-actions"><button type="button" className="primary" onClick={()=>onOpen(item)}>Let’s go<Icon name="arrow" size={16}/></button><button type="button" onClick={onAgain}>Shake again</button><button type="button" onClick={onSkip}>Not my vibe</button>{onBuild&&<button type="button" onClick={()=>onBuild(item)}>Build a night around this</button>}</div>}
 </article>
}
export default function ShakePanel({venues=[],events=[],now=Date.now(),onVenue,onEvent,onBuild}){
 const [filter,setFilter]=useState('any'),[area,setArea]=useState(''),[price,setPrice]=useState(''),[picks,setPicks]=useState([]),[skipped,setSkipped]=useState([]),[motion,setMotion]=useState('off'),[spin,setSpin]=useState(false)
 const lane=useMemo(()=>shakePool(filter,venues,events,now),[filter,venues,events,now])
 const pool=useMemo(()=>refinePool(lane,{area,price}),[lane,area,price])
 const shakeRef=useRef(null)
 const roll=(skip=skipped)=>{if(!pool.length){setPicks([]);return}setSpin(true);setTimeout(()=>setSpin(false),420);setPicks(pickSome(pool,skip))}
 shakeRef.current=roll
 useEffect(()=>{setPicks([]);setSkipped([])},[filter,area,price])
 useEffect(()=>{if(motion!=='on')return;let last=0;const h=e=>{const a=e.accelerationIncludingGravity||{};const f=Math.abs(a.x||0)+Math.abs(a.y||0)+Math.abs(a.z||0);const t=Date.now();if(f>34&&t-last>1200){last=t;shakeRef.current?.()}};window.addEventListener('devicemotion',h);return()=>window.removeEventListener('devicemotion',h)},[motion])
 const enableMotion=async()=>{try{const D=window.DeviceMotionEvent;if(D?.requestPermission){const r=await D.requestPermission();setMotion(r==='granted'?'on':'denied')}else setMotion(D?'on':'unsupported')}catch{setMotion('denied')}}
 const open=x=>isEvent(x)?onEvent?.(x):onVenue?.(x)
 const [hero,...rest]=picks
 return <section className="gtk-shake" aria-label="Shake It">
  <header className="gtk-shake-head"><small>GOOD TIMES SHAKE</small><h2>What are we <em>getting into?</em></h2></header>
  <div className="gtk-shake-lanes" role="group" aria-label="Shake filters">{SHAKE_FILTERS.map(f=><button type="button" key={f.id} className={filter===f.id?'active':''} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}><Icon name={f.icon} size={18}/><span>{f.label}</span></button>)}</div>
  <div className="gtk-shake-refine"><div className="gtk-pills is-scroll" role="group" aria-label="Shake area">{SHAKE_AREAS.map(([v,l])=><button type="button" key={l} className={area===v?'active':''} aria-pressed={area===v} onClick={()=>setArea(v)}><Icon name="pin" size={13}/>{l}</button>)}</div><div className="gtk-pills is-scroll" role="group" aria-label="Shake price">{SHAKE_PRICES.map(([v,l])=><button type="button" key={l} className={price===v?'active':''} aria-pressed={price===v} onClick={()=>setPrice(v)}>{l}</button>)}</div></div>
  <button type="button" className={`gtk-shake-button ${spin?'is-spinning':''}`} onClick={()=>roll()} disabled={!pool.length}><Icon name="shuffle" size={20}/>Pick for me</button>
  <div className="gtk-shake-meta"><span>{pool.length?`${pool.length} verified options match`:'Nothing verified matches — loosen the area or price.'}</span>{motion!=='on'&&<button type="button" className="gtk-link" onClick={enableMotion}>{motion==='denied'?'Motion blocked in settings':motion==='unsupported'?'Shake not supported here':'Enable phone shake'}</button>}</div>
  {hero&&<div className="gtk-shake-results" key={picks.map(keyOf).join('|')}>
   <PickCard hero item={hero} now={now} onOpen={open} onAgain={()=>roll()} onSkip={()=>{const next=[...skipped,keyOf(hero)];setSkipped(next);roll(next)}} onBuild={onBuild}/>
   {rest.length>0&&<div className="gtk-shake-alts"><small>OR TRY</small>{rest.map(x=><PickCard key={keyOf(x)} item={x} now={now} onOpen={open}/>)}</div>}
  </div>}
 </section>
}
