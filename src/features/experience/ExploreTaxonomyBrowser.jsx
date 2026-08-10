import React, { useMemo } from 'react'

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
  mapMode,
  onMapMode,
  renderVenue,
}) {
  const categoryRows = useMemo(() => taxonomy.map(category => ({
    ...category,
    count: new Set(directory.filter(row => row.category_key === category.id).map(row => row.id)).size,
  })), [directory, taxonomy])

  const activeCategory = taxonomy.find(category => category.id === selectedCategory) || null
  const subcategoryRows = activeCategory?.subcategoryRows || []
  const needle = String(query || '').trim().toLowerCase()

  const filteredRows = useMemo(() => {
    const rows = directory.filter(row => {
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
  }, [directory, needle, selectedCategory, selectedSubcategory])

  const selectedSubcategoryLabel = subcategoryRows.find(row => row.subcategory_key === selectedSubcategory)?.subcategory_name

  return <section className="gt2-explore-browser">
    <div className="gt2-screen-heading">
      <span>EXPLORE</span>
      <h1>{activeCategory ? activeCategory.name : 'Know the city.'}</h1>
      <p>{activeCategory ? `${filteredRows.length} verified places in ${cityName}.` : `${categoryRows.length} categories and ${taxonomy.reduce((sum, category) => sum + (category.subcategoryRows?.length || 0), 0)} subcategories.`}</p>
    </div>

    <div className="gt2-search">
      <span>⌕</span>
      <input value={query} onChange={event => onQuery?.(event.target.value)} placeholder="Search venue, neighborhood, category or vibe…" />
      {query && <button onClick={() => onQuery?.('')}>×</button>}
    </div>

    {!activeCategory && <>
      <div className="gt2-taxonomy-heading"><span>DISCOVER BY CATEGORY</span><small>Choose a lane to see its subcategories and best-matched places.</small></div>
      <div className="gt2-category-grid" data-creative-mode="motion-glass">
        {categoryRows.map((category,index) => <button
          key={category.id}
          type="button"
          data-gt-category={category.id}
          style={{ '--gt-cat-hue': categoryHue(category.id,index), '--gt-cat-order': index }}
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

      <div className="gt2-subcategory-rail">
        <button className={!selectedSubcategory ? 'active' : ''} onClick={() => onSubcategory?.(null)}>All {activeCategory.name}</button>
        {subcategoryRows.map(subcategory => {
          const count = new Set(directory.filter(row => row.subcategory_key === subcategory.subcategory_key).map(row => row.id)).size
          return <button key={subcategory.subcategory_key} className={selectedSubcategory === subcategory.subcategory_key ? 'active' : ''} onClick={() => onSubcategory?.(subcategory.subcategory_key)}>{subcategory.subcategory_name}<small>{count}</small></button>
        })}
      </div>

      <div className="gt2-taxonomy-heading compact"><span>{selectedSubcategoryLabel || activeCategory.name}</span><small>{filteredRows.length} unique verified places</small></div>

      {mapMode ? <div className="gt2-map-view">
        <div className="gt2-map-frame"><iframe title={`${cityName} map`} src="https://www.openstreetmap.org/export/embed.html?bbox=-84.62%2C33.60%2C-84.15%2C34.02&layer=mapnik"/><div className="gt2-map-veil"/><div className="gt2-map-count">⌖ {filteredRows.filter(venue => venue.latitude != null && venue.longitude != null).length} map-ready places</div></div>
        <div className="gt2-horizontal">{filteredRows.slice(0, 20).map(venue => renderVenue?.(venue, true))}</div>
      </div> : filteredRows.length ? <div className="gt2-venue-grid">{filteredRows.map(venue => renderVenue?.(venue, false))}</div> : <div className="gt2-empty"><span>⌕</span><h2>No verified matches yet</h2><p>Try another subcategory or clear the search. This lane remains visible while its sourcing agent fills it.</p></div>}
    </>}
  </section>
}
