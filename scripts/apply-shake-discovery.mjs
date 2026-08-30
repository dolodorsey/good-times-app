import fs from 'node:fs'

const appPath = new URL('../src/features/experience/GoodTimesCommandApp.jsx', import.meta.url)
const clientPath = new URL('../src/features/intelligence/client.js', import.meta.url)
const mainPath = new URL('../src/main.jsx', import.meta.url)

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source
  if (!source.includes(needle)) throw new Error(`[shake] Could not find ${label}`)
  return source.replace(needle, replacement)
}

let app = fs.readFileSync(appPath, 'utf8')
app = replaceOnce(
  app,
  "import ExploreTaxonomyBrowser from './ExploreTaxonomyBrowser.jsx'",
  "import ExploreTaxonomyBrowser from './ExploreTaxonomyBrowser.jsx'\nimport ShakeRestaurantPanel from './ShakeRestaurantPanel.jsx'",
  'experience import anchor',
)
app = replaceOnce(
  app,
  "        <button className=\"gt2-command-launch\" onClick={() => setTab('concierge')}><span>✦</span><div><small>BUILD MY NIGHT</small><strong>Turn your vibe into a complete plan.</strong></div><em>›</em></button>\n\n        <section className=\"gt2-pulse\">",
  "        <button className=\"gt2-command-launch\" onClick={() => setTab('concierge')}><span>✦</span><div><small>BUILD MY NIGHT</small><strong>Turn your vibe into a complete plan.</strong></div><em>›</em></button>\n\n        <ShakeRestaurantPanel city={city} cityName={cityLabel(city)} session={session} onOpen={openVenue} />\n\n        <section className=\"gt2-pulse\">",
  'home insertion anchor',
)
fs.writeFileSync(appPath, app)

let client = fs.readFileSync(clientPath, 'utf8')
const shakeLoader = `export async function loadShakeRestaurants(city = 'atlanta', { limit = 240 } = {}) {
  const normalizedCity = normalizeCity(city)
  const safeLimit = Math.min(300, Math.max(20, Number(limit) || 240))
  const fields = 'id,name,slug,city_key,neighborhood,category_key,subcategory,address,latitude,longitude,phone,website,instagram_handle,short_desc,vibe_tags,best_for,price_range,reservation_req,hours_summary,status,is_verified,quality_score,hero_image,booking_link,google_rating,culture_score,culture_tags,is_black_owned,search_tags,shake_enabled,shake_weight,shake_tags,amenity_tags,dietary_tags,ownership_tags'
  return fetchJson(
    \`${KHG_SUPABASE_URL}/rest/v1/gt_venues?select=\${fields}&city_key=eq.\${encodeURIComponent(normalizedCity)}&status=eq.active&is_verified=eq.true&shake_enabled=eq.true&category_key=in.(restaurant,brunch,food_hall,food_truck,coffee)&order=quality_score.desc.nullslast,culture_score.desc.nullslast&limit=\${safeLimit}\`,
    { headers: gatewayHeaders },
  )
}

`
if (!client.includes('export async function loadShakeRestaurants')) {
  client = replaceOnce(client, 'export function cityLabel(city) {', `${shakeLoader}export function cityLabel(city) {`, 'client export anchor')
  fs.writeFileSync(clientPath, client)
}

let main = fs.readFileSync(mainPath, 'utf8')
main = replaceOnce(
  main,
  "import './features/experience/good-times-owner-polish.css'",
  "import './features/experience/good-times-owner-polish.css'\nimport './features/experience/good-times-shake.css'",
  'css import anchor',
)
fs.writeFileSync(mainPath, main)

console.log('[shake] GOOD TIMES Shake discovery wired into production sources')
