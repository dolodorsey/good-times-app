import fs from 'node:fs'

const commandPath = new URL('../src/features/experience/GoodTimesCommandApp.jsx', import.meta.url)
const clientPath = new URL('../src/features/intelligence/client.js', import.meta.url)
const mainPath = new URL('../src/main.jsx', import.meta.url)

const read = path => fs.readFileSync(path, 'utf8')
const write = (path, content) => fs.writeFileSync(path, content)

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source
  const index = source.indexOf(needle)
  if (index < 0) throw new Error(`Could not find ${label}`)
  return source.slice(0, index) + replacement + source.slice(index + needle.length)
}

let client = read(clientPath)
if (!client.includes('export async function loadExploreTaxonomy')) {
  const insertion = `
export async function loadExploreTaxonomy() {
  const [categories, subcategories] = await Promise.all([
    fetchJson(
      \`${'${KHG_SUPABASE_URL}'}/rest/v1/gt_taxonomy_categories?select=category_key,category_name,description,sort_order&is_active=eq.true&order=sort_order.asc,category_name.asc\`,
      { headers: gatewayHeaders },
    ),
    fetchJson(
      \`${'${KHG_SUPABASE_URL}'}/rest/v1/gt_taxonomy_subcategories?select=category_key,subcategory_key,subcategory_name,description,sort_order,minimum_upcoming_inventory&is_active=eq.true&order=category_key.asc,sort_order.asc,subcategory_name.asc\`,
      { headers: gatewayHeaders },
    ),
  ])

  const grouped = new Map()
  for (const row of subcategories || []) {
    if (!grouped.has(row.category_key)) grouped.set(row.category_key, [])
    grouped.get(row.category_key).push(row)
  }

  return (categories || []).map(category => ({
    id: category.category_key,
    name: category.category_name,
    description: category.description,
    subcategoryRows: grouped.get(category.category_key) || [],
  }))
}

export async function loadExploreDirectory(city = 'atlanta', { limit = 2500 } = {}) {
  const normalizedCity = normalizeCity(city)
  return fetchJson(
    \`${'${KHG_SUPABASE_URL}'}/rest/v1/v_gt_venue_taxonomy_directory?select=id,city_key,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,category_key,category_name,subcategory,subcategory_key,venue_category_key,venue_subcategory,tab_tags,search_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,sourced_from,website,phone,booking_link,status,taxonomy_confidence,latitude,longitude&city_key=eq.${'${encodeURIComponent(normalizedCity)}'}&order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast&limit=${'${limit}'}\`,
    { headers: gatewayHeaders },
  )
}

`
  client = replaceOnce(client, 'export async function loadGoodTimesProfile', `${insertion}export async function loadGoodTimesProfile`, 'profile export')
}
write(clientPath, client)

let command = read(commandPath)
command = replaceOnce(
  command,
  "  loadCanonicalVenues,\n",
  "  loadCanonicalVenues,\n  loadExploreDirectory,\n  loadExploreTaxonomy,\n",
  'intelligence imports',
)
if (!command.includes("from './BuildMyNightPanel.jsx'")) {
  command = replaceOnce(
    command,
    "} from '../intelligence/client.js'\n",
    "} from '../intelligence/client.js'\nimport BuildMyNightPanel from './BuildMyNightPanel.jsx'\nimport ExploreTaxonomyBrowser from './ExploreTaxonomyBrowser.jsx'\n",
    'experience component imports',
  )
}
command = command.replace("['concierge', '✦', 'Concierge']", "['concierge', '✦', 'Build Night']")

if (!command.includes('const [taxonomy, setTaxonomy]')) {
  command = replaceOnce(
    command,
    "  const [venues, setVenues] = useState([])\n",
    "  const [venues, setVenues] = useState([])\n  const [taxonomy, setTaxonomy] = useState([])\n  const [exploreDirectory, setExploreDirectory] = useState([])\n  const [exploreCategory, setExploreCategory] = useState(null)\n  const [exploreSubcategory, setExploreSubcategory] = useState(null)\n",
    'venue state',
  )
}

command = replaceOnce(
  command,
  `      const [nextEvents, nextVenues] = await Promise.all([\n        loadCanonicalEvents(nextCity),\n        loadCanonicalVenues(nextCity),\n      ])\n      setEvents(nextEvents || [])\n      setVenues(nextVenues || [])`,
  `      const [nextEvents, nextVenues, nextTaxonomy, nextExploreDirectory] = await Promise.all([\n        loadCanonicalEvents(nextCity),\n        loadCanonicalVenues(nextCity),\n        loadExploreTaxonomy().catch(() => []),\n        loadExploreDirectory(nextCity).catch(() => []),\n      ])\n      setEvents(nextEvents || [])\n      setVenues(nextVenues || [])\n      setTaxonomy(nextTaxonomy || [])\n      setExploreDirectory(nextExploreDirectory || [])`,
  'experience loading block',
)

command = command.replace('<div><strong>{categories.length}</strong><span>Categories</span></div>', '<div><strong>{taxonomy.length || categories.length}</strong><span>Categories</span></div>')
command = command.replace("<button className=\"gt2-command-launch\" onClick={() => setTab('concierge')}><span>✦</span><div><small>GOOD TIMES CONCIERGE</small><strong>Tell us the night you need.</strong></div><em>›</em></button>", "<button className=\"gt2-command-launch\" onClick={() => setTab('concierge')}><span>✦</span><div><small>BUILD MY NIGHT</small><strong>Turn your vibe into a complete plan.</strong></div><em>›</em></button>")
command = command.replace("<h1>What kind of<br/>night do you need?</h1><p>The concierge ranks real events and venues using quality, timing, source confidence, actionability and your first-party taste signals.</p></div>", "<h1>Build My Night.</h1><p>Start with the guided builder, then use the concierge chat to refine the plan around real events and verified places.</p></div><BuildMyNightPanel cityName={cityLabel(city)} busy={conciergeBusy} onBuild={prompt => runConcierge({ prompt, action: 'itinerary' })}/>")
command = command.replace("<button onClick={() => { setTab('concierge');setConciergeQuery('Plan my night tonight') }}>Ask concierge</button>", "<button onClick={() => { setTab('concierge');setConciergeQuery('Build my night tonight') }}>Build my night</button>")
command = command.replace("setTab('concierge')\n    const prompt = `Build a complete night", "setTab('concierge')\n    const prompt = `Build a complete night")
command = command.replace("    setQuery('')\n    await updatePreferences", "    setQuery('')\n    setExploreCategory(null)\n    setExploreSubcategory(null)\n    await updatePreferences")

const exploreStart = command.indexOf("      {tab === 'explore' && <section className=\"gt2-screen\">")
const exploreEnd = command.indexOf("      {tab === 'vault'", exploreStart)
if (exploreStart < 0 || exploreEnd < 0) throw new Error('Could not find Explore screen block')
const exploreBlock = `      {tab === 'explore' && <ExploreTaxonomyBrowser
        taxonomy={taxonomy}
        directory={exploreDirectory}
        cityName={cityLabel(city)}
        query={query}
        onQuery={setQuery}
        selectedCategory={exploreCategory}
        selectedSubcategory={exploreSubcategory}
        onCategory={setExploreCategory}
        onSubcategory={setExploreSubcategory}
        mapMode={mapMode}
        onMapMode={setMapMode}
        renderVenue={(venue, compact) => <VenueCard compact={compact} key={\`${'${venue.id}'}-${'${venue.subcategory_key || "all"}'}\`} venue={venue} saved={savedKeySet.has(\`venue:${'${venue.id}'}\`)} onOpen={() => openVenue(venue)} onSave={() => toggleSave('venue', venue.id)}/>} 
      />}

`
command = command.slice(0, exploreStart) + exploreBlock + command.slice(exploreEnd)
write(commandPath, command)

let main = read(mainPath)
if (!main.includes("good-times-command-v2.css")) {
  main = replaceOnce(
    main,
    "import './features/experience/good-times-command.css'\n",
    "import './features/experience/good-times-command.css'\nimport './features/experience/good-times-command-v2.css'\n",
    'command CSS import',
  )
}
write(mainPath, main)

console.log('GOOD TIMES command experience restored.')
