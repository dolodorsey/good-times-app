import React from 'react'

const BASE='https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/good_times/graphics'
const HOME=`${BASE}/GOODTIMES_HOMESCREEN.png`
const VIDEO=`${BASE}/GOOD_TIMES_ANIMATION.mp4`
const ART=[
  `${BASE}/ChatGPT_Image_Feb_10_2026_03_52_56_AM.png`,
  `${BASE}/ChatGPT_Image_Feb_10_2026_04_06_58_AM.png`,
  `${BASE}/ChatGPT_Image_Feb_10_2026_04_10_54_AM.png`,
]

export default function GoodTimesCreativeLayer(){
  return <div className="gt-rich-visuals" aria-hidden="true">
    <video className="gt-rich-video" autoPlay muted loop playsInline preload="metadata" poster={HOME} src={VIDEO}/>
    <div className="gt-rich-video-veil"/>
    <div className="gt-rich-art-stack">{ART.map((src,index)=><img key={src} className={`gt-rich-art art-${index+1}`} src={src} alt="" loading="eager"/>)}</div>
    <div className="gt-rich-grain"/>
  </div>
}
