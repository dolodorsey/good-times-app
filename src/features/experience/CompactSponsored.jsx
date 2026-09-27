import React,{useEffect,useRef,useState}from'react'
import{loadGoodTimesAd,trackGoodTimesAd}from'./good-times-ads.js'
import{safeURL,specificMedia}from'./compact-display.js'
export default function CompactSponsored({placement}){const[ad,setAd]=useState(null),root=useRef(null)
 useEffect(()=>{let alive=true;loadGoodTimesAd(placement,'atlanta').then(v=>{if(alive)setAd(v)});return()=>{alive=false}},[placement])
 useEffect(()=>{if(!ad||!root.current)return;let sent=false;const observer=new IntersectionObserver(entries=>{if(!sent&&entries.some(e=>e.isIntersecting)){sent=true;void trackGoodTimesAd({ad,placementKey:placement,citySlug:'atlanta',eventType:'impression'});observer.disconnect()}},{threshold:.5});observer.observe(root.current);return()=>observer.disconnect()},[ad,placement])
 if(!ad?.headline||!safeURL(ad.cta_url))return null
 return <aside className="gt-complete-ad" ref={root} aria-label="Sponsored">{specificMedia(ad.image_url)&&<img src={specificMedia(ad.image_url)} alt="" loading="lazy" onError={e=>e.currentTarget.style.display='none'}/>}<div><small>SPONSORED · {ad.advertiser_name}</small><strong>{ad.headline}</strong><a href={safeURL(ad.cta_url)} target="_blank" rel="noreferrer" onClick={()=>void trackGoodTimesAd({ad,placementKey:placement,citySlug:'atlanta',eventType:'click'})}>{ad.cta_text||'View offer'} ↗</a></div></aside>}
