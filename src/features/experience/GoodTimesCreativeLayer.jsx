import React, { useEffect, useMemo, useState } from 'react'
import { GT_APPROVED_DEFAULTS, gtAssetUrl, loadGoodTimesAssetManifest, pickManifestAsset } from './good-times-assets.js'

export default function GoodTimesCreativeLayer(){
  const [assets,setAssets]=useState([])

  useEffect(()=>{
    let alive=true
    loadGoodTimesAssetManifest().then(rows=>{ if(alive)setAssets(rows) })
    return()=>{ alive=false }
  },[])

  const creative=useMemo(()=>{
    const home=pickManifestAsset(assets,'home_hero',()=>true,GT_APPROVED_DEFAULTS.home)
    const video=pickManifestAsset(assets,'global_motion',()=>true,GT_APPROVED_DEFAULTS.motion)
    const venueArt=(assets||[])
      .filter(asset=>asset.surface==='places_that_matter'&&asset.asset_type==='venue_image')
      .slice(0,3)
      .map(asset=>asset.url)
    const fallbackVenueArt=[
      gtAssetUrl('good_times/graphics/LOCATION_IMAGES/UTOPIA_DOWNTOWN.webp'),
      gtAssetUrl('good_times/graphics/LOCATION_IMAGES/VISIONS.jpg'),
      gtAssetUrl('good_times/graphics/LOCATION_IMAGES/REVEL.webp'),
    ]
    return { home,video,art:venueArt.length===3?venueArt:fallbackVenueArt }
  },[assets])

  return <div className="gt-rich-visuals" aria-hidden="true" data-creative-source="gt_asset_manifest">
    <video className="gt-rich-video" autoPlay muted loop playsInline preload="metadata" poster={creative.home} src={creative.video}/>
    <div className="gt-rich-video-veil"/>
    <div className="gt-rich-art-stack">{creative.art.map((src,index)=><img key={src} className={`gt-rich-art art-${index+1}`} src={src} alt="" loading="eager"/>)}</div>
    <div className="gt-rich-grain"/>
  </div>
}
