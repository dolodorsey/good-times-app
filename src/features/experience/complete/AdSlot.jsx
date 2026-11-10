import React,{useEffect,useRef,useState} from 'react'
import {Icon} from './Kit.jsx'
import {safeImage,safeLink} from './model.js'

// GOOD TIMES ad spaces. Content comes from public.gt_ad_queue (status active, inside its window), managed in
// the admin console queue. Every unit shows its disclosure label (Community / Sponsored). If the live queue can't
// be reached, the owner's current house queue (Kollective nonprofit work) is shown, still respecting end dates.
const HOUSE_QUEUE=[
  {id:'house:give-a-gobble',kind:'nonprofit',disclosure_label:'Community',kicker:'COMMUNITY · SAT, NOV 21 · 11 AM',title:'Give a Gobble',subtitle:'Free community turkey giveaway in Atlanta — helping families gather around the table this Thanksgiving.',image_url:'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914878%2F2574990468831%2F1%2Foriginal.20261030-085051?auto=format%2Ccompress&q=75&sharp=10&s=934d9ffb280c780ea34bc07e275c3355',cta_label:'Free RSVP',cta_url:'https://www.eventbrite.com/e/give-a-gobble-turkey-drive-giveaway-tickets-2004110761236',priority:10,ends_at:'2026-11-22T04:59:00Z'},
  {id:'house:santa-in-atlanta',kind:'nonprofit',disclosure_label:'Community',kicker:'COMMUNITY · TUE, DEC 22 · DOORS 8 PM',title:'Santa in Atlanta',subtitle:'Christmas concert + toy drive. Free with RSVP — bring a new, unwrapped toy for Atlanta kids.',image_url:'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F1196914904%2F2574990468831%2F1%2Foriginal.20261030-085135?auto=format%2Ccompress&q=75&sharp=10&s=dc213d3caaf17eef600938afba923ce6',cta_label:'Free RSVP',cta_url:'https://www.eventbrite.com/e/santa-in-atlanta-tickets-2004110817404',priority:20,ends_at:'2026-12-23T04:59:00Z'},
  {id:'house:sole-exchange',kind:'nonprofit',disclosure_label:'Community',kicker:'COMMUNITY · SHOE DRIVE',title:'Sole Exchange',subtitle:'Ongoing community shoe drive from The Kollective.',image_url:'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/websites/graphics/SOLE_EXCHANGE_WEBSITE/ChatGPT_Image_Jul_30_2026_02_35_07_AM_1_.png',cta_label:'Learn More',cta_url:'https://soleexchangeworldwide.com',priority:30,ends_at:null},
]
const live=(a,now=Date.now())=>!a.ends_at||new Date(a.ends_at).getTime()>now
let cache=null,inflight=null
export function loadAds(){
  if(cache)return Promise.resolve(cache)
  if(!inflight)inflight=fetch('/api/offers?kind=ads',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null).catch(()=>null)
    .then(j=>{const rows=Array.isArray(j?.ads)&&j.ads.length?j.ads:HOUSE_QUEUE;cache=rows.filter(a=>live(a)&&safeLink(a.cta_url)).sort((a,b)=>(a.priority??100)-(b.priority??100));return cache})
  return inflight
}
const anon=()=>{try{return localStorage.getItem('gt-anon-id')}catch{return null}}
function track(ad,placement,event_type){
  if(String(ad.id).startsWith('house:'))return
  try{const b=JSON.stringify({action:'ad_track',ad_id:ad.id,placement,event_type,anon_id:anon()});if(navigator.sendBeacon)navigator.sendBeacon('/api/offers',new Blob([b],{type:'application/json'}));else fetch('/api/offers',{method:'POST',headers:{'content-type':'application/json'},body:b,keepalive:true}).catch(()=>{})}catch{/* best effort */}
}
const SEEN=new Set()

/** One ad unit for a placement. `slot` rotates through the queue so stacked placements show different ads. */
export default function AdSlot({placement='home',slot=0,variant='banner'}){
  const [ads,setAds]=useState(cache||[])
  const ref=useRef(null)
  useEffect(()=>{let on=true;loadAds().then(r=>on&&setAds(r));return()=>{on=false}},[])
  const eligible=ads.filter(a=>!Array.isArray(a.placements)||!a.placements.length||a.placements.includes(placement))
  const ad=eligible.length?eligible[slot%eligible.length]:null
  useEffect(()=>{if(!ad||!ref.current||typeof IntersectionObserver==='undefined')return;const k=`${ad.id}:${placement}`;if(SEEN.has(k))return
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){SEEN.add(k);track(ad,placement,'impression');io.disconnect()}},{threshold:.5});io.observe(ref.current);return()=>io.disconnect()},[ad,placement])
  if(!ad)return null
  const img=safeImage(ad.image_url),href=safeLink(ad.cta_url)
  return <aside ref={ref} className={`gtad gtad-${variant} is-${ad.kind||'house'}`} aria-label={`${ad.disclosure_label||'Sponsored'}: ${ad.title}`} data-gt-ad={placement}>
    <a href={href} target="_blank" rel="noopener noreferrer sponsored" onClick={()=>track(ad,placement,'click')}>
      <span className="gtad-media" style={img?{backgroundImage:`url("${img}")`}:undefined} aria-hidden="true"/>
      <span className="gtad-copy">
        <span className="gtad-label">{ad.disclosure_label||'Sponsored'}</span>
        {ad.kicker&&<small>{ad.kicker}</small>}
        <strong>{ad.title}</strong>
        {ad.subtitle&&<em>{ad.subtitle}</em>}
        <span className="gtad-cta">{ad.cta_label||'Learn More'}<Icon name="arrow" size={15}/></span>
      </span>
    </a>
  </aside>
}
