import fs from 'node:fs'

const appUrl=new URL('../src/features/experience/GoodTimesLiveApp.jsx',import.meta.url)
let source=fs.readFileSync(appUrl,'utf8')

// Ask the only question that matters: did this patch's NEW lines land already?
// Comparing whole blocks fails because a later codemod edits the anchor line
// (apply-growth-personalization rewrites `venues` -> `personalizedVenues`
// inside the exact line this patch anchors on).
function alreadyApplied(text,before,after){
  if(text.includes(after))return true
  const anchor=new Set(before.split('\n').map(l=>l.trim()))
  const added=after.split('\n').map(l=>l.trim()).filter(l=>l.length>24&&!anchor.has(l))
  return added.length>0&&added.some(l=>text.includes(l))
}
function replaceOnce(before,after,label){
  if(alreadyApplied(source,before,after))return
  if(!source.includes(before))throw new Error(`GOOD TIMES multi-city polish could not locate ${label}`)
  source=source.replace(before,after)
}

replaceOnce(
  "  const [mapMode,setMapMode]=useState(false)\n  const [vaultType,setVaultType]=useState('events')",
  "  const [mapMode,setMapMode]=useState(false)\n  const [exploreSpecial,setExploreSpecial]=useState(null)\n  const [vaultType,setVaultType]=useState('events')",
  'Explore state',
)

replaceOnce(
  "  const blackOwned=useMemo(()=>venues.filter(item=>item.is_black_owned),[venues])",
  "  const blackOwned=useMemo(()=>venues.filter(item=>item.is_black_owned),[venues])\n  const filteredBlackOwned=useMemo(()=>{const needle=query.toLowerCase().trim();return blackOwned.filter(item=>!needle||[item.name,item.neighborhood,item.short_desc,item.category_key,item.subcategory,...(item.vibe_tags||[])].filter(Boolean).join(' ').toLowerCase().includes(needle))},[blackOwned,query])",
  'Black-Owned filter',
)

replaceOnce(
  "    setCity(nextCity);setSelectedCategory(null);setSelectedSubcategory(null);setDirectory([]);setQuery('')",
  "    setCity(nextCity);setSelectedCategory(null);setSelectedSubcategory(null);setExploreSpecial(null);setDirectory([]);setQuery('')",
  'city-switch reset',
)

replaceOnce(
  "  const loadDirectory=async(categoryId,subcategoryId=null)=>{\n    setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('');setCatalogError('');setCatalogError('')",
  "  const loadDirectory=async(categoryId,subcategoryId=null)=>{\n    setExploreSpecial(null);setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('');setCatalogError('');setCatalogError('')",
  'directory special reset',
)

replaceOnce(
  "hero?'THE MOVE RIGHT NOW':'ATLANTA IS OUTSIDE'",
  "hero?'THE MOVE RIGHT NOW':`${cityLabel(city).toUpperCase()} IS OUTSIDE`",
  'hero city copy',
)
replaceOnce(
  "title={tonight.length?'Atlanta tonight':'Next up'}",
  "title={tonight.length?`${cityLabel(city)} tonight`:'Next up'}",
  'tonight city copy',
)
replaceOnce(
  'title="Black-owned Atlanta"',
  'title={`Black-owned ${cityLabel(city)}`}',
  'Black-Owned rail title',
)
replaceOnce(
  '<span>Loading Atlanta’s real moves</span>',
  '<span>{`Loading ${cityLabel(city)}’s real moves`}</span>',
  'loading city copy',
)

replaceOnce(
  "onClick={()=>{setScreen(target);if(label==='Black-Owned')setQuery('black-owned')}}",
  "onClick={()=>{setScreen(target);setQuery('');if(label==='Black-Owned'){setExploreSpecial('black_owned');setSelectedCategory(null);setSelectedSubcategory(null);setDirectory([])}else setExploreSpecial(null)}}",
  'Black-Owned quick action',
)

replaceOnce(
  "<h1>{selectedTaxonomy?.name||'The whole city.'}</h1>",
  "<h1>{exploreSpecial==='black_owned'?`Black-owned ${cityLabel(city)}`:selectedTaxonomy?.name||'The whole city.'}</h1>",
  'Explore heading',
)
replaceOnce(
  "<p>{TAXONOMY_TOTALS.categories} categories · {TAXONOMY_TOTALS.subcategories} subcategories · {venues.length||'800+'} verified places</p>",
  "<p>{exploreSpecial==='black_owned'?`${filteredBlackOwned.length} verified Black-owned places`:`${TAXONOMY_TOTALS.categories} categories · ${TAXONOMY_TOTALS.subcategories} subcategories · ${venues.length||'800+'} verified places`}</p>",
  'Explore subtitle',
)

replaceOnce(
  '{!selectedTaxonomy?<div className="gtlive-explore-grid">',
  `{exploreSpecial==='black_owned'?<><div className="gtlive-explore-tools"><button onClick={()=>{setExploreSpecial(null);setQuery('')}}>‹ All categories</button><div><button className="active" type="button">Black-owned</button></div></div>{filteredBlackOwned.length?<div className="gtlive-grid">{filteredBlackOwned.map(item=><VenueCard key={item.id} venue={item} saved={savedKeys.has(\`venue:\${item.id}\`)} onOpen={()=>openVenue(item)} onSave={()=>toggleSave('venue',item.id)}/>)}</div>:<div className="gtlive-compact-empty"><span>◇</span><h2>No verified matches yet.</h2><p>Try another city or browse all verified GOOD TIMES places.</p><button onClick={()=>{setExploreSpecial(null);setQuery('')}}>Browse all categories</button></div>}</>:!selectedTaxonomy?<div className="gtlive-explore-grid">`,
  'Black-Owned Explore lane',
)

replaceOnce(
  "onClick={()=>{setScreen(id);setQuery('')}}",
  "onClick={()=>{setScreen(id);setQuery('');if(id==='explore')setExploreSpecial(null)}}",
  'Explore navigation reset',
)

const required=["exploreSpecial==='black_owned'",'filteredBlackOwned','Black-owned ${cityLabel(city)}','setExploreSpecial(\'black_owned\')']
for(const marker of required){if(!source.includes(marker))throw new Error(`GOOD TIMES multi-city polish missing ${marker}`)}

fs.writeFileSync(appUrl,source)
console.log('GOOD TIMES multi-city home + Black-Owned polish applied.')
