import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadExploreCounts, loadExplorePage, loadExploreTaxonomy } from '../intelligence/client.js'
import { exploreSignature, knownPlaceCount, uniqueScopedPlaces, validCoordinate } from '../intelligence/explore-page.js'
import GoodTimesIcon from './GoodTimesIcon.jsx'

const categoryGlyph = key => ({ nightlife: '◇', concerts_live_music: '♫', sports_watch: '◉', dining_culinary: '🍴', family_kids: '◎', seasonal_holiday: '✦', wellness_fitness: '♡', arts_museums_culture: '▱' })[key] || '✦'
const normalize = category => ({ ...category, subcategoryRows: category.subcategoryRows || (category.subcategories || []).map((s, index) => ({ subcategory_key: s.subcategory_key || s.id, subcategory_name: s.subcategory_name || s.name, sort_order: s.sort_order ?? index })) })
function countText(value) { return value == null ? 'Browse places' : `${value} ${value === 1 ? 'place' : 'places'}` }
function jumpToResults() { requestAnimationFrame(() => document.querySelector('.gtc-event-results-start,.gt-compact-result-header')?.scrollIntoView({ block: 'start' })) }

export default function CompactExplorePanel({ taxonomy = [], cityName, query = '', onQuery, selectedCategory, selectedSubcategory, onCategory, onSubcategory, directoryOpen, onDirectoryOpen, mapMode, onMapMode, renderVenue, renderEvents = null, eventsFirst = false }) {
  const [counts, setCounts] = useState([]), [countError, setCountError] = useState(false)
  const [retryTaxonomy, setRetryTaxonomy] = useState(null), [catalogError, setCatalogError] = useState(''), [catalogBusy, setCatalogBusy] = useState(false)
  const categoryRows = useMemo(() => (retryTaxonomy || taxonomy).map(normalize), [taxonomy, retryTaxonomy])
  const activeCategory = categoryRows.find(c => c.id === selectedCategory)
  const subcategoryRows = activeCategory?.subcategoryRows || []
  const selectedLabel = subcategoryRows.find(s => s.subcategory_key === selectedSubcategory)?.subcategory_name
  const [sort, setSort] = useState('quality'), [settledQuery, setSettledQuery] = useState(query)
  const [pageState, setPageState] = useState({ items: [], nextCursor: null, status: 'idle', error: '', signature: '', asOf: null })
  const [retry, setRetry] = useState(0), [mapId, setMapId] = useState(null)
  const sequence = useRef(0), requestController = useRef(null), pendingPage = useRef(false)
  useEffect(() => { const timer = setTimeout(() => setSettledQuery(query), 240); return () => clearTimeout(timer) }, [query])
  useEffect(() => { let live = true; setCountError(false); loadExploreCounts(cityName).then(rows => { if (live) setCounts(rows || []) }).catch(() => { if (live) { setCounts([]); setCountError(true) } }); return () => { live = false } }, [cityName, retry])
  const scope = useMemo(() => ({ category: selectedCategory || null, subcategory: selectedSubcategory || null, query: settledQuery, sort, limit: 24 }), [selectedCategory, selectedSubcategory, settledQuery, sort])
  const signature = exploreSignature(scope)
  const showResults = Boolean((activeCategory && directoryOpen) || settledQuery.trim())
  const changingQuery = query !== settledQuery
  useEffect(() => {
    const current = ++sequence.current
    requestController.current?.abort(); pendingPage.current = false
    if (!showResults) { setPageState({ items: [], nextCursor: null, status: 'idle', error: '', signature, asOf: null }); return }
    const controller = new AbortController(); requestController.current = controller
    setPageState({ items: [], nextCursor: null, status: 'loading', error: '', signature, asOf: null })
    loadExplorePage(cityName, scope, { signal: controller.signal }).then(result => {
      if (current === sequence.current && !controller.signal.aborted) setPageState({ ...result, status: 'success', signature, error: '' })
    }).catch(error => {
      if (current === sequence.current && !controller.signal.aborted) setPageState({ items: [], nextCursor: null, status: 'error', error: error.message, signature, asOf: null })
    })
    return () => controller.abort()
  }, [signature, showResults, cityName, retry])
  useEffect(() => () => requestController.current?.abort(), [])
  const loadMore = async () => {
    if (!pageState.nextCursor || pendingPage.current || changingQuery) return
    pendingPage.current = true
    const current = sequence.current, controller = new AbortController(); requestController.current = controller
    setPageState(previous => ({ ...previous, status: 'loading-more', error: '' }))
    try {
      const result = await loadExplorePage(cityName, { ...scope, cursor: pageState.nextCursor }, { signal: controller.signal })
      if (current === sequence.current && !controller.signal.aborted) setPageState(previous => ({ ...result, items: uniqueScopedPlaces([...previous.items, ...result.items], scope), status: 'success', signature, error: '' }))
    } catch (error) { if (current === sequence.current && !controller.signal.aborted) setPageState(previous => ({ ...previous, status: 'more-error', error: error.message })) }
    finally { if (current === sequence.current) pendingPage.current = false }
  }
  const chooseCategory = id => { onCategory(id); onSubcategory(null); onDirectoryOpen(false); onMapMode(false); onQuery(''); setMapId(null) }
  const chooseSubcategory = id => { onSubcategory(id); onDirectoryOpen(true); onMapMode(false); setMapId(null); jumpToResults() }
  const items = pageState.signature === signature && !changingQuery ? pageState.items : []
  const mapped = items.filter(validCoordinate), mappedItem = mapped.find(v => v.id === mapId) || mapped[0]
  const coordinates = mappedItem ? [Number(mappedItem.latitude), Number(mappedItem.longitude)] : [33.76, -84.39]
  const [lat, lng] = coordinates
  const mapURL = `https://www.openstreetmap.org/export/embed.html?bbox=${[lng - .018, lat - .012, lng + .018, lat + .012].join('%2C')}&layer=mapnik${mappedItem ? `&marker=${lat}%2C${lng}` : ''}`
  const scopeCount = !query.trim() && selectedCategory ? knownPlaceCount(counts, selectedCategory, selectedSubcategory || null) : null
  const loading = changingQuery || pageState.status === 'loading'
  const refreshCatalog = async () => { setCatalogBusy(true); setCatalogError(''); try { const rows = await loadExploreTaxonomy(); setRetryTaxonomy(rows); if (!rows.length) setCatalogError('No categories are available right now.') } catch { setCatalogError('Could not load categories. Please retry.') } finally { setCatalogBusy(false) } }
  return <section className="gt2-explore-browser gt-compact-explore" aria-label="Explore Atlanta places">
    {!activeCategory && !query.trim() && <>
      <div className="gt-compact-section-heading"><h2>Find your kind of good time</h2><span>Atlanta</span></div>
      {!categoryRows.length && <div className="gt-compact-state" role="status"><h2>Categories unavailable</h2><p>{catalogError || 'The catalog has not loaded yet.'}</p><button onClick={refreshCatalog} disabled={catalogBusy}>{catalogBusy ? 'Loading…' : 'Retry categories'}</button></div>}
      <div className="gt2-category-grid gt-compact-category-grid">
        {categoryRows.map(category => <button key={category.id} type="button" data-gt-category={category.id} onClick={() => chooseCategory(category.id)}><span className="gt-compact-category-icon"><GoodTimesIcon glyph={categoryGlyph(category.id)} /></span><strong>{category.name}</strong><small>{category.subcategoryRows.length} subcategories</small><span aria-hidden="true" className="gt-compact-arrow">›</span></button>)}
      </div>
    </>}
    {activeCategory && <>
      <div className="gt2-explore-actions gt-compact-breadcrumb"><button type="button" onClick={() => chooseCategory(null)}>‹ All categories</button><span>{activeCategory.name}</span></div>
      <details className="gt-compact-subcategories" open={!directoryOpen} key={activeCategory.id}>
        <summary>{directoryOpen ? `${selectedLabel || `All ${activeCategory.name}`} · Change` : `Explore ${activeCategory.name}`}<span aria-hidden="true">⌄</span></summary>
        <div className="gt2-subcategory-grid" data-gt-subcategories={activeCategory.id} data-gt-explore-stage={directoryOpen ? 'directory' : 'subcategories'}>
          <button className={directoryOpen && !selectedSubcategory ? 'active' : ''} onClick={() => chooseSubcategory(null)}><strong>All {activeCategory.name}</strong><small>{countText(knownPlaceCount(counts, activeCategory.id))}</small></button>
          {subcategoryRows.map(sub => <button key={sub.subcategory_key} data-gt-subcategory={sub.subcategory_key} className={selectedSubcategory === sub.subcategory_key ? 'active' : ''} onClick={() => chooseSubcategory(sub.subcategory_key)}><strong>{sub.subcategory_name}</strong><small>{countText(knownPlaceCount(counts, activeCategory.id, sub.subcategory_key))}</small></button>)}
        </div>
      </details>
    </>}
    {showResults && <>
      {renderEvents && eventsFirst && <div className="gtc-event-results-start">{renderEvents()}</div>}
      <header className="gt-compact-result-header"><div><h2>{renderEvents?'Places':selectedLabel || activeCategory?.name || 'Search results'}</h2><p role="status">{loading ? 'Searching places…' : pageState.status === 'error' ? 'Could not refresh places' : scopeCount != null ? `${countText(scopeCount)} · ${items.length} shown` : `${items.length} ${items.length === 1 ? 'place' : 'places'} shown${pageState.nextCursor ? ' · more to explore' : ''}`}</p></div><button onClick={() => setRetry(n => n + 1)} aria-label="Refresh places" title="Refresh places">↻</button></header>
      <div className="gt-compact-result-tools"><label><span className="gt-compact-sr">Sort places</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="quality">Quality first</option><option value="name">Name A–Z</option></select></label><div className="gt2-explore-toggle"><button className={!mapMode ? 'active' : ''} aria-pressed={!mapMode} onClick={() => onMapMode(false)}>Directory</button><button className={mapMode ? 'active' : ''} aria-pressed={Boolean(mapMode)} onClick={() => onMapMode(true)}>Map</button></div></div>
      {countError && <p className="gt-compact-note">Category totals could not refresh. Showing loaded places only.</p>}
      {loading ? <div className="gt-compact-skeleton-grid" aria-label="Loading places" aria-busy="true">{[0,1,2,3].map(n => <div key={n} />)}</div>
        : pageState.status === 'error' ? <div className="gt-compact-state" role="alert"><h2>Couldn’t load these places</h2><p>{pageState.error}</p><button onClick={() => setRetry(n => n + 1)}>Retry places</button></div>
        : items.length === 0 ? <div className="gt2-empty gt-compact-state"><h2>No verified matches yet</h2><p>This lane remains visible. Try another subcategory or clear your search.</p>{query && <button onClick={() => onQuery('')}>Clear search</button>}<button onClick={() => { onSubcategory(null); onDirectoryOpen(false); onQuery('') }}>Browse subcategories</button></div>
        : <>
          {mapMode && <section className="gt-compact-map" aria-label="Map of loaded places"><div className="gt2-map-frame"><iframe title={`${mappedItem?.name || cityName} area map`} src={mapURL} loading="lazy" /></div><p>{mapped.length} of {items.length} loaded places have coordinates. {mappedItem ? `Pin: ${mappedItem.name}.` : 'No place pins are available.'}</p><label>Center on<select aria-label="Center map on place" value={mappedItem?.id || ''} onChange={e => setMapId(e.target.value)}>{mapped.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label></section>}
          <div className="gt2-venue-grid gt-compact-results">{items.map(venue => renderVenue(venue, false))}</div>
          {pageState.error && <p className="gt-compact-note" role="alert">{pageState.error} Your loaded places are still here.</p>}
          {pageState.nextCursor && <button className="gt-compact-load-more" disabled={pageState.status === 'loading-more'} onClick={loadMore}>{pageState.status === 'loading-more' ? 'Loading…' : pageState.status === 'more-error' ? 'Retry more places' : 'Load more places'}</button>}
        </>}
      {renderEvents && !eventsFirst && renderEvents()}
    </>}
  </section>
}
