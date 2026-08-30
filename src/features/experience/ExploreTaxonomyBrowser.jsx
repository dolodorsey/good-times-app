import React, { useEffect, useMemo, useState } from 'react'
import { loadExploreCounts, loadExploreDirectory } from '../intelligence/client.js'
import { loadGoodTimesAssetManifest, manifestAssetForCategory } from './good-times-assets.js'

function uniqueVenues(rows) {
  const seen = new Set()
  return rows.filter(row => {
    if (!row?.id || seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

function categoryHue(key,index) {
  const text=String(key||index)
  let hash=0
  for(let position=0;position<text.length;position+=1)hash=(hash*31+text.charCodeAt(position))%360
  return (hash + index * 17) % 360
}

function exactCount(rows,categoryKey,subcategoryKey=null) {
  const match=(rows||[]).find(row=>row.category_key===categoryKey&&(subcategoryKey===null?row.subcategory_key==null:row.subcategory_key===subcategoryKey))
  return Number(match?.place_count||0)
}

function normalizeSubcategories(category) {
  if (Array.isArray(category?.subcategoryRows)) return category.subcategoryRows
  if (Array.isArray(category?.subcategories)) {
    return category.subcategories.map((subcategory,index) => ({
      category_key: category.id,
      subcategory_key: subcategory.subcategory_key || subcategory.id,
      subcategory_name: subcategory.subcategory_name || subcategory.name,
      description: subcategory.description || null,
      sort_order: subcategory.sort_order ?? index,
    }))
  }
  return []
}

export default function ExploreTaxonomyBrowser({
  taxonomy = [],
  directory = [],
  cityName,
  query,
  onQuery,
  selectedCategory,
  selectedSubcategory,
  onCategory,
  onSubcategory,
  directoryOpen: controlledDirectoryOpen,
  onDirectoryOpen,
  mapMode,
  onMapMode,
  renderVenue,
}) {
  const [countRows,setCountRows]=useState([])
  const [creativeAssets,setCreativeAssets]=useState([])
  const [categoryDirectory,setCategoryDirectory]=useState([])
  const [categoryLoading,setCategoryLoading]=useState(false)
  const [categoryError,setCategoryError]=useState('')
  const [localDirectoryOpen,setLocalDirectoryOpen]=useState(false)
  const directoryOpen=controlledDirectoryOpen??localDirectoryOpen
  const setDirectoryOpen=value=>{setLocalDirectoryOpen(value);onDirectoryOpen?.(value)}

  useEffect(()=>{
    let alive=true
    setCountRows([])
    Promise.all([
      loadExploreCounts(cityName).catch(()=>[]),
      loadGoodTimesAssetManifest().catch(()=>[]),
    ]).then(([counts,assets])=>{
      if(!alive)return
      setCountRows(Array.isArray(counts)?counts:[])
      setCreativeAssets(Array.isArray(assets)?assets:[])
    })
    return()=>{alive=false}
  },[cityName])

  useEffect(()=>{
    let alive=true
    setCategoryError('')
    if(!selectedCategory){
      setCategoryDirectory([])
      setCategoryLoading(false)
      return()=>{alive=false}
    }
    setCategoryLoading(true)
    loadExploreDirectory(cityName,{category:selectedCategory,limit:2500})
      .then(rows=>{if(alive)setCategoryDirectory(Array.isArray(rows)?rows:[])})
      .catch(error=>{if(alive){setCategoryDirectory([]);setCategoryError(error?.message||'This category could not be loaded.')}})
      .finally(()=>{if(alive)setCategoryLoading(false)})
    return()=>{alive=false}
  },[cityName,selectedCategory])

  useEffect(()=>{
    setDirectoryOpen(false)
  // The parent callbacks are stable React setters in V3; category is the stage boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedCategory])

  const normalizedTaxonomy = useMemo(() => (taxonomy || []).map(category => ({
    ...category,
    subcategoryRows: normalizeSubcategories(category),
  })), [taxonomy])

  const categoryRows = useMemo(() => normalizedTaxonomy.map(category => {
    const exact=exactCount(countRows,category.id)
    const fallback=new Set(directory.filter(row => row.category_key === category.id).map(row => row.id)).size
    const art=manifestAssetForCategory(creativeAssets,'explore_category',category.id)
    return {...category,count:exact||fallback,art}
  }), [countRows,creativeAssets,directory,normalizedTaxonomy])

  const activeCategory = normalizedTaxonomy.find(category => category.id === selectedCategory) || null
  const subcategoryRows = activeCategory?.subcategoryRows || []
  const needle = String(query || '').trim().toLowerCase()
  const activeDirectory = selectedCategory && categoryDirectory.length ? categoryDirectory : directory

  const filteredRows = useMemo(() => {
    const rows = activeDirectory.filter(row => {
      if (selectedCategory && row.category_key !== selectedCategory) return false
      if (selectedSubcategory && row.subcategory_key !== selectedSubcategory) return false
      if (!needle) return true
      return [
        row.name,
        row.neighborhood,
        row.category_name,
        row.subcategory,
        row.short_desc,
        ...(row.vibe_tags || []),
        ...(row.culture_tags || []),
      ].filter(Boolean).join(' ').toLowerCase().includes(needle)
    })
    return uniqueVenues(rows)
  }, [activeDirectory, needle, selectedCategory, selectedSubcategory])

  const selectedSubcategoryLabel = subcategoryRows.find(row => row.subcategory_key === selectedSubcategory)?.subcategory_name
  const activeTotal=activeCategory ? (exactCount(countRows,activeCategory.id)||new Set(activeDirectory.filter(row=>row.category_key===activeCategory.id).map(row=>row.id)).size) : 0
  const totalSubcategories=normalizedTaxonomy.reduce((sum, category) => sum + (category.subcategoryRows?.length || 0), 0)

  return <section className="gt2-explore-browser">
    <div className="gt2-screen-heading">
      <span>EXPLORE</span>
      <h1>{activeCategory ? activeCategory.name : 'Know the city.'}</h1>
      <p>{activeCategory
        ? `${activeTotal} verified places in ${cityName}.`
        : categoryRows.length
          ? `${categoryRows.length} categories and ${totalSubcategories} subcategories.`
          : 'Catalog unavailable right now — check your connection and pull to refresh.'}</p>
    </div>

    <div className="gt2-search">
      <span>⌕</span>
      <input value={query} onChange={event => onQuery?.(event.target.value)} placeholder="Search venue, neighborhood, category or vibe…" />
      {query && <button onClick={() => onQuery?.('')}>×</button>}
    </div>

    {!activeCategory && <>
      <div className="gt2-taxonomy-heading"><span>DISCOVER BY CATEGORY</span><small>Choose a lane to open its complete subcategory list.</small></div>
      <div className="gt2-category-grid" data-creative-mode="supabase-category-art">
        {categoryRows.map((category,index) => <button
          key={category.id}
          type="button"
          data-gt-category={category.id}
          data-has-art={category.art?'true':'false'}
          style={{ '--gt-cat-hue': categoryHue(category.id,index), '--gt-cat-order': index, '--gt-cat-image': category.art ? `url("${category.art}")` : 'none' }}
          onClick={() => { onCategory?.(category.id);onSubcategory?.(null) }}
        >
          <span className="gt2-category-mark">{category.icon || '✦'}</span>
          <strong>{category.name}</strong>
          <small>{category.subcategoryRows?.length || 0} subcategories · {category.count} places</small>
          <em>›</em>
        </button>)}
      </div>
    </>}

    {activeCategory && <>
      <div className="gt2-explore-actions">
        <button type="button" onClick={() => { onCategory?.(null);onSubcategory?.(null) }}>‹ All categories</button>
        <div className="gt2-explore-toggle"><button className={!mapMode ? 'active' : ''} onClick={() => onMapMode?.(false)}>Directory</button><button className={mapMode ? 'active' : ''} onClick={() => onMapMode?.(true)}>Map</button></div>
      </div>

      <div className="gt2-taxonomy-heading compact"><span>SUBCATEGORIES</span><small>{subcategoryRows.length} ways to narrow {activeCategory.name}. Choose one or view everything.</small></div>
      <div className="gt2-subcategory-grid" data-gt-subcategories={activeCategory.id} data-gt-explore-stage={directoryOpen?'directory':'subcategories'}>
        <button className={directoryOpen && !selectedSubcategory ? 'active' : ''} onClick={() => { onSubcategory?.(null);setDirectoryOpen(true) }}><span>All</span><strong>All {activeCategory.name}</strong><small>{activeTotal} verified places</small><em>›</em></button>
        {subcategoryRows.map(subcategory => {
          const exact=exactCount(countRows,activeCategory.id,subcategory.subcategory_key)
          const fallback=new Set(activeDirectory.filter(row => row.category_key===activeCategory.id&&row.subcategory_key === subcategory.subcategory_key).map(row => row.id)).size
          const count=exact||fallback
          return <button key={subcategory.subcategory_key} className={selectedSubcategory === subcategory.subcategory_key ? 'active' : ''} onClick={() => { onSubcategory?.(subcategory.subcategory_key);setDirectoryOpen(true) }}><span>Explore</span><strong>{subcategory.subcategory_name}</strong><small>{count} verified places</small><em>›</em></button>
        })}
      </div>

      {directoryOpen && <><div className="gt2-taxonomy-heading compact"><span>{selectedSubcategoryLabel || activeCategory.name}</span><small>{categoryLoading ? 'Loading complete verified directory…' : `${filteredRows.length} loaded · ${selectedSubcategory ? exactCount(countRows,activeCategory.id,selectedSubcategory)||filteredRows.length : activeTotal} verified places`}</small></div>

      {categoryLoading && !categoryDirectory.length ? <div className="gt2-empty"><span>✦</span><h2>Loading verified places</h2><p>Pulling the complete {activeCategory.name} directory for {cityName}.</p></div>
      : categoryError && !filteredRows.length ? <div className="gt2-empty"><span>!</span><h2>Directory temporarily unavailable</h2><p>{categoryError}</p></div>
      : mapMode ? <div className="gt2-map-view">
        <div className="gt2-map-frame"><iframe title={`${cityName} map`} src="https://www.openstreetmap.org/export/embed.html?bbox=-84.62%2C33.60%2C-84.15%2C34.02&layer=mapnik"/><div className="gt2-map-veil"/><div className="gt2-map-count">⌖ {filteredRows.filter(venue => venue.latitude != null && venue.longitude != null).length} map-ready places</div></div>
        <div className="gt2-horizontal">{filteredRows.slice(0, 20).map(venue => renderVenue?.(venue, true))}</div>
      </div> : filteredRows.length ? <div className="gt2-venue-grid">{filteredRows.map(venue => renderVenue?.(venue, false))}</div> : <div className="gt2-empty"><span>⌕</span><h2>No verified matches yet</h2><p>Try another subcategory or clear the search. This lane remains visible while its sourcing agent fills it.</p></div>}</>}
    </>}
  </section>
}
