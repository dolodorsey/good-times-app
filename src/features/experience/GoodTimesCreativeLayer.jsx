import React, { useEffect } from 'react'

const STORAGE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics'
const POSTER=`${STORAGE}/motion/goodtimes.jpg`
const VIDEO=`${STORAGE}/kollective/animations/GOODTIMES.mp4`
const CURRENT_ART=[
  `${STORAGE}/good_times/graphics/LOCATION_IMAGES/VISIONS.jpg`,
  `${STORAGE}/good_times/graphics/LOCATION_IMAGES/REVEL.webp`,
  `${STORAGE}/good_times/graphics/LOCATION_IMAGES/UTOPIA_DOWNTOWN.webp`,
]

const suspiciousMedia=/Artboard|maps\.gstatic|maps\.googleapis|staticmap|map-marker|GOODTIMES_SCREENS|ChatGPT_Image_Feb_10_2026/i

export default function GoodTimesCreativeLayer(){
  useEffect(()=>{
    const protect=img=>{
      if(!(img instanceof HTMLImageElement))return
      if(!img.closest('.gt2-venue-image,.gt2-detail-image,.gt2-event-image'))return
      const src=String(img.currentSrc||img.src||'')
      if(!src||suspiciousMedia.test(src)){
        img.src=POSTER
        img.dataset.gtFallback='current'
      }
    }
    const scan=()=>document.querySelectorAll('.gt2-venue-image img,.gt2-detail-image img,.gt2-event-image img').forEach(protect)
    const onError=event=>{
      const img=event.target
      if(!(img instanceof HTMLImageElement)||!img.closest('.gt2-venue-image,.gt2-detail-image,.gt2-event-image'))return
      if(img.dataset.gtFallback==='current')return
      img.dataset.gtFallback='current'
      img.src=POSTER
    }
    scan()
    document.addEventListener('error',onError,true)
    const observer=new MutationObserver(scan)
    observer.observe(document.body,{subtree:true,childList:true})
    return()=>{document.removeEventListener('error',onError,true);observer.disconnect()}
  },[])

  return <div className="gt-rich-visuals gt-current-creative" aria-hidden="true">
    <video className="gt-rich-video" autoPlay muted loop playsInline preload="metadata" poster={POSTER} src={VIDEO}/>
    <div className="gt-rich-video-veil"/>
    <div className="gt-rich-art-stack gt-current-art-stack">{CURRENT_ART.map((src,index)=><img key={src} className={`gt-rich-art art-${index+1}`} src={src} alt="" loading="eager"/>)}</div>
    <div className="gt-rich-grain"/>
  </div>
}
