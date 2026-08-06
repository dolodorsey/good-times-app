import fs from 'node:fs'

function read(path) { return fs.readFileSync(path, 'utf8') }
function write(path, value) { fs.writeFileSync(path, value) }
function replace(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Missing ${label}`)
  pattern.lastIndex = 0
  return source.replace(pattern, replacement)
}

const appPath = 'src/features/experience/GoodTimesLiveApp.jsx'
let app = read(appPath)

app = replace(app, /async function getJson\(path\) \{[\s\S]*?\n\}\nfunction formatDate/, `const jsonInflight = new Map()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const buildId = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'local'

function reportClientIssue(surface, error, extra = {}) {
  const payload = {
    surface,
    message: error?.message || String(error),
    city: extra.city || '',
    path: extra.path || window.location.pathname,
    build: buildId,
    online: navigator.onLine,
    userAgent: navigator.userAgent,
  }
  fetch('/api/client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => null)
}

async function getJson(path) {
  if (jsonInflight.has(path)) return jsonInflight.get(path)
  const request = (async () => {
    let lastError = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await Promise.race([
          fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 16000)),
        ])
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.ok) throw new Error(payload?.detail || payload?.error || \`Request failed (\${response.status})\`)
        return payload
      } catch (error) {
        lastError = error
        if (attempt < 2) await sleep(350 * (attempt + 1))
      }
    }
    reportClientIssue('json_request', lastError, { path })
    throw lastError || new Error('Live data request failed')
  })().finally(() => jsonInflight.delete(path))
  jsonInflight.set(path, request)
  return request
}
function formatDate`, 'getJson')

app = replace(app, /function eventImage\(event\) \{[\s\S]*?function uniqueBy/, `function normalizeImage(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!text || /maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text) || /[?&]key=/i.test(text)) return null
  return text.startsWith('http://') ? text.replace(/^http:\/\//i, 'https://') : text
}
function sceneForCategory(categoryId) {
  const meta = CATEGORY_META[categoryId]
  return \`\${GT_SCENE_BASE}/\${meta?.scene || 'gt-homescreen-atlanta.webp'}\`
}
function venueScene(venue) {
  const key = String(venue?.category_key || '').toLowerCase()
  if (CATEGORY_META[key]) return sceneForCategory(key)
  if (/nightclub|lounge|hookah|bar|rooftop|speakeasy/.test(key)) return sceneForCategory('nightlife')
  if (/restaurant|food|brunch|coffee|wine|pizza|burger|seafood/.test(key)) return sceneForCategory('dining_culinary')
  if (/museum|gallery|culture|theater|comedy/.test(key)) return sceneForCategory('arts_museums_culture')
  if (/sport|stadium|arena|fitness|gym/.test(key)) return sceneForCategory('sports_watch')
  return BG_FALLBACK
}
function SafeImage({ src, fallback = BG_FALLBACK, ...props }) {
  const safeSource = normalizeImage(src) || fallback
  const [current, setCurrent] = useState(safeSource)
  useEffect(() => setCurrent(safeSource), [safeSource])
  return <img {...props} src={current} referrerPolicy="no-referrer" onError={() => setCurrent(value => value === fallback ? BG_FALLBACK : fallback)} />
}
function eventImage(event) { return normalizeImage(event?.image_url) || sceneForCategory(event?.category_key) }
function venueImage(venue) { return normalizeImage(venue?.hero_image) || venueScene(venue) }
function uniqueBy`, 'image helpers')

app = app.replace('<img src={eventImage(event)} alt="" loading="lazy"/>', '<SafeImage src={eventImage(event)} fallback={sceneForCategory(event.category_key)} alt="" loading="lazy"/>')
app = app.replace('<img src={venueImage(venue)} alt="" loading="lazy"/>', '<SafeImage src={venueImage(venue)} fallback={venueScene(venue)} alt="" loading="lazy"/>')
app = app.replace('<img src={eventImage(selectedEvent)} alt=""/>', '<SafeImage src={eventImage(selectedEvent)} fallback={sceneForCategory(selectedEvent.category_key)} alt=""/>')
app = app.replace('<img src={venueImage(selectedVenue)} alt=""/>', '<SafeImage src={venueImage(selectedVenue)} fallback={venueScene(selectedVenue)} alt=""/>')

app = replace(app, /  const loadCity=useCallback\(async nextCity=>\{[\s\S]*?\n  \},\[\]\)/, `  const loadCity=useCallback(async nextCity=>{
    const cacheKey=\`gt_live_city_v2:\${nextCity}\`
    let cached=null
    try{cached=JSON.parse(localStorage.getItem(cacheKey)||'null')}catch{}
    if(cached?.events?.length||cached?.venues?.length){
      setEvents(cached.events||[]);setVenues(cached.venues||[])
      if(cached.categories)setTaxonomy(mergeTaxonomy(cached.categories))
      setLoading(false)
    }else setLoading(true)
    setDataError('');setCatalogError('')
    const [dataResult,catalogResult]=await Promise.allSettled([
      getJson(\`/api/data?city=\${encodeURIComponent(nextCity)}&event_limit=500&venue_limit=700\`),
      getJson(\`/api/catalog?city=\${encodeURIComponent(nextCity)}&mode=taxonomy\`),
    ])
    let nextEvents=cached?.events||[]
    let nextVenues=cached?.venues||[]
    let nextCategories=cached?.categories||null
    if(dataResult.status==='fulfilled'){
      nextEvents=dataResult.value.events||[];nextVenues=dataResult.value.venues||[]
      setEvents(nextEvents);setVenues(nextVenues);setDataError('')
    }else if(!nextEvents.length&&!nextVenues.length){
      const message=dataResult.reason?.message||'Live inventory is reconnecting.'
      setDataError(message);reportClientIssue('city_inventory',dataResult.reason,{city:nextCity,path:'/api/data'})
    }
    if(catalogResult.status==='fulfilled'){
      nextCategories=catalogResult.value.categories||[]
      setTaxonomy(mergeTaxonomy(nextCategories));setCatalogError('')
    }else if(!nextCategories){
      setTaxonomy(mergeTaxonomy())
      const message=catalogResult.reason?.message||'Live category counts are reconnecting.'
      setCatalogError(message);reportClientIssue('taxonomy',catalogResult.reason,{city:nextCity,path:'/api/catalog'})
    }
    if(nextEvents.length||nextVenues.length){
      try{localStorage.setItem(cacheKey,JSON.stringify({events:nextEvents.slice(0,180),venues:nextVenues.slice(0,260),categories:nextCategories,storedAt:Date.now()}))}catch{}
    }
    setLoading(false)
  },[])`, 'loadCity')

app = replace(app, /  const loadDirectory=async\(categoryId,subcategoryId=null\)=>\{[\s\S]*?\n  \}/, `  const loadDirectory=async(categoryId,subcategoryId=null)=>{
    setSelectedCategory(categoryId);setSelectedSubcategory(subcategoryId);setDirectoryLoading(true);setQuery('');setCatalogError('')
    const requestKey=\`gt_directory_v2:\${city}:\${categoryId}:\${subcategoryId||'all'}\`
    let cached=[]
    try{cached=JSON.parse(sessionStorage.getItem(requestKey)||'[]')}catch{}
    if(cached.length)setDirectory(cached)
    try{
      const params=new URLSearchParams({mode:'directory',city,category:categoryId,limit:'600'})
      if(subcategoryId)params.set('subcategory',subcategoryId)
      const payload=await getJson(\`/api/catalog?\${params}\`)
      const rows=payload.venues||[]
      setDirectory(rows);setCatalogError('')
      try{sessionStorage.setItem(requestKey,JSON.stringify(rows.slice(0,220)))}catch{}
    }catch(error){
      if(!cached.length){
        const categoryFallback=venues.filter(item=>item.category_key===categoryId||String(item.category_key||'').includes(categoryId)).slice(0,120)
        setDirectory(categoryFallback)
        if(!categoryFallback.length)setCatalogError('This category is reconnecting. Try again in a moment.')
      }
      reportClientIssue('directory',error,{city,path:\`/api/catalog?category=\${categoryId}\`})
    }finally{setDirectoryLoading(false)}
  }`, 'loadDirectory')

app = app.replace("      {dataError&&<InlineNotice onRetry={()=>loadCity(city)}>Live inventory is reconnecting. Categories and saved features remain available.</InlineNotice>}", "      {dataError&&!events.length&&!venues.length&&<InlineNotice onRetry={()=>loadCity(city)}>Live inventory is reconnecting. Retry without leaving this screen.</InlineNotice>}")
app = app.replace("{catalogError&&<InlineNotice>{catalogError} Live counts may be temporarily hidden.</InlineNotice>}", "{catalogError&&!directory.length&&<InlineNotice onRetry={()=>selectedCategory?loadDirectory(selectedCategory,selectedSubcategory):loadCity(city)}>{catalogError}</InlineNotice>}")

write(appPath, app)

const mainPath = 'src/main.jsx'
let main = read(mainPath)
main = main.replace('async function bootstrap(){', `async function retireLegacyServiceWorker(){
  if(!('serviceWorker' in navigator))return true
  try{
    const registrations=await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(item=>item.unregister()))
    if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('good-times-shell')).map(key=>caches.delete(key)))}
    if(navigator.serviceWorker.controller&&sessionStorage.getItem('gt-sw-retired-v1')!=='1'){
      sessionStorage.setItem('gt-sw-retired-v1','1')
      window.location.reload()
      return false
    }
  }catch(error){console.warn('GOOD TIMES service worker cleanup failed',error)}
  return true
}

async function bootstrap(){
  if(!(await retireLegacyServiceWorker()))return`)
main = main.replace(/ReactDOM\.createRoot\(rootElement\)\.render\(<React\.StrictMode>([\s\S]*?)<\/React\.StrictMode>\)/, 'ReactDOM.createRoot(rootElement).render($1)')
main = main.replace(/\nconst isNativeRuntime=[\s\S]*$/, '\n')
write(mainPath, main)

const swPath = 'public/sw.js'
write(swPath, `const CACHE_VERSION='good-times-retired-v1'\nself.addEventListener('install',event=>event.waitUntil(self.skipWaiting()))\nself.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(key=>caches.delete(key)));await self.registration.unregister();await self.clients.claim()})()))\n`)

for (const path of ['api/data.js','api/catalog.js']) {
  let source=read(path)
  if(!source.includes('function safePublicImage')){
    source=source.replace(/function headers\([^)]*\)\{/, `function safePublicImage(value){if(!value)return null;const text=String(value).trim();if(!text||/maps\\.googleapis\\.com\\/maps\\/api\\/place\\/photo/i.test(text)||/[?&]key=/i.test(text))return null;return text.startsWith('http://')?text.replace(/^http:\\/\\//i,'https://'):text}\nfunction headers(){`)
  }
  if(path==='api/data.js'){
    source=source.replace('image_url: item.image_url,', 'image_url: safePublicImage(item.image_url),')
    source=source.replace("const events = city === 'atlanta' ? rawEvents : mapShows(rawEvents)", "const events=(city==='atlanta'?mapShows(rawEvents):mapShows(rawEvents)).map(item=>({...item,image_url:safePublicImage(item.image_url)}));const safeVenues=venues.map(item=>({...item,hero_image:safePublicImage(item.hero_image)}))")
    source=source.replace('counts: { events: events.length, venues: venues.length }, events, venues,', 'counts: { events: events.length, venues: safeVenues.length }, events, venues: safeVenues,')
    source=source.replace("String(venues.length)", "String(safeVenues.length)")
  }else{
    source=source.replace('const venues=rows.filter(row=>{if(!row?.id||seen.has(row.id))return false;seen.add(row.id);return true})', 'const venues=rows.filter(row=>{if(!row?.id||seen.has(row.id))return false;seen.add(row.id);return true}).map(row=>({...row,hero_image:safePublicImage(row.hero_image)}))')
    source=source.replace('if(row.hero_image&&row.category_key', 'row.hero_image=safePublicImage(row.hero_image);if(row.hero_image&&row.category_key')
  }
  write(path, source)
}

console.log('Good Times live runtime repair applied')
