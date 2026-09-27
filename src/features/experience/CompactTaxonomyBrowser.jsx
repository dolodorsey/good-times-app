import React, {useEffect, useMemo, useRef, useState} from 'react'
import {loadExploreCounts} from '../intelligence/client.js'
import {loadCompactDirectoryPage} from './compact-directory.js'
import {coordinatesFor, directoryScope, mergeDirectoryPages} from './compact-directory-query.js'

const subcategoriesOf = category => Array.isArray(category?.subcategoryRows) ? category.subcategoryRows : (category?.subcategories || []).map((row,index)=>({category_key:category.id,subcategory_key:row.subcategory_key||row.id,subcategory_name:row.subcategory_name||row.name,sort_order:row.sort_order??index}))
const knownCount = (rows,category,sub=null) => {
  const match=rows.find(row=>row.category_key===category&&(row.subcategory_key??null)===sub)
  const value=match?.place_count
  return value != null && Number.isFinite(Number(value)) && Number(value)>=0 ? Number(value) : null
}
const countLabel = count => count == null ? 'Count unavailable' : `${count} ${count===1?'place':'places'}`

/** Opt-in presentation of the existing taxonomy; legacy behavior stays available unchanged. */
export default function CompactTaxonomyBrowser({taxonomy=[],cityName='Atlanta',query='',onQuery,selectedCategory,onCategory,selectedSubcategory,onSubcategory,directoryOpen=false,onDirectoryOpen,mapMode=false,onMapMode,renderVenue}) {
  const [counts,setCounts]=useState([]),[countsFailed,setCountsFailed]=useState(false),[countRevision,setCountRevision]=useState(0)
  const [debouncedQuery,setDebouncedQuery]=useState(query)
  const [result,setResult]=useState({scope:'',rows:[],nextCursor:null,asOf:null})
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  const [selectedMapId,setSelectedMapId]=useState('')
  const pending=useRef(null),generation=useRef(0),morePending=useRef(false)
  const categories=useMemo(()=>taxonomy.map(row=>({...row,subcategoryRows:subcategoriesOf(row)})),[taxonomy])
  const category=categories.find(row=>row.id===selectedCategory)||null
  const subcategory=category?.subcategoryRows.find(row=>row.subcategory_key===selectedSubcategory)||null
  const scope=directoryScope({category:selectedCategory||null,subcategory:selectedSubcategory||null,query:debouncedQuery})
  const searching=Boolean(query.trim())
  const showResults=directoryOpen||searching
  const settling=query.trim()!==debouncedQuery.trim()
  const current=result.scope===scope
  const rows=current&&!settling?result.rows:[]
  const located=rows.filter(row=>coordinatesFor(row))
  const mapRow=located.find(row=>row.id===selectedMapId)||located[0]||null

  useEffect(()=>{const timer=setTimeout(()=>setDebouncedQuery(query),250);return()=>clearTimeout(timer)},[query])
  useEffect(()=>{
    let active=true
    setCounts([]);setCountsFailed(false)
    loadExploreCounts(cityName).then(data=>{if(active)setCounts(Array.isArray(data)?data:[])}).catch(()=>{if(active)setCountsFailed(true)})
    return()=>{active=false}
  },[cityName,countRevision])
  useEffect(()=>{
    const sequence=++generation.current
    pending.current?.abort();morePending.current=false
    setError('');setSelectedMapId('')
    if(!showResults||settling){setLoading(false);return}
    const controller=new AbortController();pending.current=controller;setLoading(true)
    loadCompactDirectoryPage({category:selectedCategory||null,subcategory:selectedSubcategory||null,query:debouncedQuery,signal:controller.signal}).then(page=>{
      if(sequence===generation.current&&!controller.signal.aborted)setResult({...page,rows:mergeDirectoryPages([],page.rows)})
    }).catch(failure=>{if(sequence===generation.current&&!controller.signal.aborted)setError(failure.message||'Could not refresh these venues.')}).finally(()=>{if(sequence===generation.current)setLoading(false)})
    return()=>controller.abort()
  },[scope,showResults,settling,revision])

  async function loadMore(){
    if(morePending.current||loading||!current||!result.nextCursor)return
    morePending.current=true;setLoading(true);setError('')
    const sequence=generation.current,controller=new AbortController();pending.current=controller
    try{
      const page=await loadCompactDirectoryPage({category:selectedCategory||null,subcategory:selectedSubcategory||null,query:debouncedQuery,cursor:result.nextCursor,signal:controller.signal})
      if(sequence===generation.current&&!controller.signal.aborted)setResult(old=>({...page,rows:mergeDirectoryPages(old.rows,page.rows)}))
    }catch(failure){if(sequence===generation.current&&!controller.signal.aborted)setError(failure.message||'Could not load more venues.')}
    finally{if(sequence===generation.current){morePending.current=false;setLoading(false)}}
  }
  function reset(){onQuery?.('');onSubcategory?.(null);onCategory?.(null);onDirectoryOpen?.(false);onMapMode?.(false)}
  function chooseCategory(key){onQuery?.('');onSubcategory?.(null);onCategory?.(key);onDirectoryOpen?.(false);onMapMode?.(false)}
  function chooseType(key){onSubcategory?.(key);onDirectoryOpen?.(true)}
  const heading=subcategory?.subcategory_name||category?.name||'Search results'
  const total=searching?null:knownCount(counts,selectedCategory,selectedSubcategory||null)
  const refreshed=result.asOf?new Date(result.asOf).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'}):null
  const mapPoint=coordinatesFor(mapRow)
  const mapUrl=mapPoint?`https://www.openstreetmap.org/export/embed.html?bbox=${mapPoint.lon-.018},${mapPoint.lat-.012},${mapPoint.lon+.018},${mapPoint.lat+.012}&layer=mapnik&marker=${mapPoint.lat},${mapPoint.lon}`:null

  return <section className="gt2-explore-browser gtc-explore" aria-label="Atlanta venue discovery">
    {!category&&!searching?<>
      <div className="gtc-section-heading"><h2>Explore by category</h2><small>{categories.length} categories</small></div>
      {countsFailed&&<div className="gtc-notice">Category counts could not refresh. <button onClick={()=>setCountRevision(value=>value+1)}>Retry counts</button></div>}
      {categories.length?<div className="gt2-category-grid gtc-category-grid">{categories.map(item=><button type="button" key={item.id} data-gt-category={item.id} onClick={()=>chooseCategory(item.id)}>
        <strong>{item.name}</strong><small>{item.subcategoryRows.length} types · {countLabel(knownCount(counts,item.id))}</small><span aria-hidden="true">›</span>
      </button>)}</div>:<div className="gtc-state" role="status"><h2>Categories could not load</h2><p>Your saves and plans are unchanged.</p><button onClick={()=>window.location.reload()}>Retry</button></div>}
    </>:<>
      <div className="gt2-explore-actions gtc-actions"><button type="button" onClick={reset}>‹ All categories</button><div className="gt2-explore-toggle"><button aria-pressed={!mapMode} className={!mapMode?'active':''} onClick={()=>{onMapMode?.(false);onDirectoryOpen?.(true)}}>Directory</button><button aria-pressed={mapMode} className={mapMode?'active':''} onClick={()=>{onMapMode?.(true);onDirectoryOpen?.(true)}}>Map</button></div></div>
      <div className="gtc-section-heading"><h2>{heading}</h2>{category&&showResults&&<button onClick={()=>{onQuery?.('');onDirectoryOpen?.(false);onMapMode?.(false)}}>Change type</button>}</div>
      {!showResults&&category&&<div className="gt2-subcategory-grid gtc-subcategory-grid" data-gt-subcategories={category.id} data-gt-explore-stage="subcategories">
        <button onClick={()=>chooseType(null)}><strong>All {category.name}</strong><small>{countLabel(knownCount(counts,category.id))}</small><span aria-hidden="true">›</span></button>
        {category.subcategoryRows.map(item=><button key={item.subcategory_key} data-gt-subcategory={item.subcategory_key} aria-pressed={selectedSubcategory===item.subcategory_key} onClick={()=>chooseType(item.subcategory_key)}><strong>{item.subcategory_name}</strong><small>{countLabel(knownCount(counts,category.id,item.subcategory_key))}</small><span aria-hidden="true">›</span></button>)}
      </div>}
      {showResults&&<div data-gt-subcategories={category?.id||''} data-gt-explore-stage="directory">
        <p className="gtc-result-summary" role="status" aria-live="polite">{settling||loading&&!rows.length?'Refreshing venues…':error&&!rows.length?'Venues could not refresh':`${rows.length} ${rows.length===1?'venue':'venues'} shown${total!=null?` · ${countLabel(total)} in this type}`:''}`}{refreshed&&rows.length>0?<small>Directory refreshed {refreshed} ET</small>:null}</p>
        {error&&<div className="gtc-state gtc-error" role="alert"><p>{error}</p><button onClick={()=>rows.length&&result.nextCursor?loadMore():setRevision(value=>value+1)}>Retry</button></div>}
        {!error&&(loading&&!rows.length||settling)&&<div className="gtc-skeletons" aria-hidden="true">{[0,1,2,3].map(index=><div key={index}/>)}</div>}
        {!loading&&!settling&&!error&&current&&!rows.length&&<div className="gtc-state"><h3>No venues match this selection</h3><p>{searching?'Try another name or clear your search.':'This type stays available while its listings are reviewed.'}</p>{searching?<button onClick={()=>onQuery?.('')}>Clear search</button>:<button onClick={()=>onDirectoryOpen?.(false)}>Choose another type</button>}</div>}
        {mapMode&&rows.length>0&&<section className="gtc-map" aria-label="Selected venue map">
          {mapRow?<><label>Show venue on map<select aria-label="Show venue on map" value={mapRow.id} onChange={event=>setSelectedMapId(event.target.value)}>{located.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><iframe loading="lazy" title={`${mapRow.name} location`} src={mapUrl}/><p>{located.length} of {rows.length} loaded venues have map locations. Showing {mapRow.name}.</p></>:<p>Locations are unavailable for these loaded venues. They remain in the directory below.</p>}
        </section>}
        {rows.length>0&&<div className="gt2-venue-grid gtc-venue-grid">{rows.map(venue=><React.Fragment key={venue.id}>{renderVenue?.(venue,false)}</React.Fragment>)}</div>}
        {current&&result.nextCursor&&!settling&&<button className="gtc-load-more" disabled={loading} onClick={loadMore}>{loading?'Loading…':'Load more venues'}</button>}
      </div>}
    </>}
  </section>
}
