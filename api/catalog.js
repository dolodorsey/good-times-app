const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const MAX_DIRECTORY_ROWS = 2500
const CACHE = 'gt_venue_taxonomy_directory_cache'
const COUNT_CACHE = 'gt_venue_taxonomy_count_cache'
const RESPONSE_CACHE = globalThis.__GOOD_TIMES_CATALOG_CACHE__ || (globalThis.__GOOD_TIMES_CATALOG_CACHE__ = new Map())

const CATEGORY_SELECT = 'category_key,category_name,description,sort_order'
const SUBCATEGORY_SELECT = 'category_key,subcategory_key,subcategory_name,description,sort_order,minimum_upcoming_inventory'
const COUNT_SELECT = 'category_key,subcategory_key,venue_count'
const DIRECTORY_SELECT = [
  'id','city_key','name','neighborhood','side_of_town','short_desc','hero_image','google_rating',
  'google_reviews','quality_score','price_range','vibe_tags','category_key','category_name','subcategory',
  'subcategory_key','venue_category_key','venue_subcategory','tab_tags','search_tags','culture_tier','is_khg',
  'is_culture_pick','is_black_owned','culture_tags','instagram_handle','sourced_from','website','phone',
  'booking_link','status','taxonomy_confidence','address','latitude','longitude','hours_summary','dress_code',
].join(',')

function normalizeCity(value) { return String(value || 'atlanta').trim().toLowerCase().replace(/[\s-]+/g, '_') }
function clamp(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}
function headers() { return { apikey:CONTENT_KEY, Authorization:`Bearer ${CONTENT_KEY}`, Accept:'application/json' } }
function safePublicImage(value) {
  if (!value) return null
  const text = String(value).trim()
  if (!text || /maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(text) || /[?&]key=/i.test(text)) return null
  return text.startsWith('http://') ? text.replace(/^http:\/\//i, 'https://') : text
}
function hasValue(value) { return value !== null && value !== undefined && String(value).trim() !== '' }
function customerReadyDirectoryVenue(row) {
  if (!row?.id || !hasValue(row.name) || row.status !== 'active') return false
  if (Number(row.quality_score || 0) < 55) return false
  return [row.address,row.website,row.phone,row.booking_link,row.instagram_handle].some(hasValue)
}
const NON_NIGHTCLUB_IDENTITY = /\b(diner|restaurant|draft\s*house|gastropub|food\s*hall|food\s*truck|coffee|cafe|bakery)\b/i
function isCategoryIdentityMismatch(row) {
  if (row?.category_key === 'festivals_major_activations'
    && row?.subcategory_key === 'food_festivals'
    && ['food_truck','food_hall'].includes(row?.venue_category_key)) return true
  if (row?.category_key === 'nightlife' && row?.subcategory_key === 'nightclubs') {
    const identityText=[row?.name,row?.subcategory,row?.venue_subcategory,row?.short_desc].filter(Boolean).join(' ')
    return Number(row?.taxonomy_confidence || 0) < 95 || NON_NIGHTCLUB_IDENTITY.test(identityText)
  }
  return false
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function fetchRows(path, label) {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)
    try {
      const response = await fetch(`${CONTENT_URL}/rest/v1/${path}`, { headers:headers(), cache:'no-store', signal:controller.signal })
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(`${label} returned HTTP ${response.status}: ${text.slice(0, 200)}`)
        if (response.status < 500) throw error
        lastError = error
      } else {
        const rows = text ? JSON.parse(text) : []
        if (!Array.isArray(rows)) throw new Error(`${label} returned an invalid payload`)
        return rows
      }
    } catch (error) {
      lastError = error?.name === 'AbortError' ? new Error(`${label} request timed out`) : error
      if (attempt === 2) throw lastError
    } finally { clearTimeout(timeout) }
    if (attempt < 2) await wait(120 * (attempt + 1))
  }
  throw lastError || new Error(`${label} failed`)
}
function send(response, status, payload, cacheState='MISS') {
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control',status===200?'public, s-maxage=300, stale-while-revalidate=1800':'no-store')
  response.setHeader('X-Content-Type-Options','nosniff')
  response.setHeader('X-Good-Times-Catalog-Cache',cacheState)
  response.end(JSON.stringify(payload))
}
function cacheKey(city,mode,category,subcategory,limit) {
  return [city,mode,category||'',subcategory||'',limit||''].join(':')
}
function fresh(entry, ttl) { return entry && Date.now() - entry.at < ttl }

export default async function handler(request,response) {
  if ((request.method || 'GET') !== 'GET') {
    response.setHeader('Allow','GET'); return send(response,405,{ok:false,error:'Method not allowed'})
  }
  const url=new URL(request.url || '/api/catalog','https://thegoodtimesworldwide.com')
  const city=normalizeCity(url.searchParams.get('city'))
  const mode=url.searchParams.get('mode') || 'taxonomy'
  const category=url.searchParams.get('category')
  const subcategory=url.searchParams.get('subcategory')
  const limit=mode==='directory'?clamp(url.searchParams.get('limit'),120,MAX_DIRECTORY_ROWS):null
  const key=cacheKey(city,mode,category,subcategory,limit)
  const cached=RESPONSE_CACHE.get(key)
  if (fresh(cached, 5 * 60 * 1000)) return send(response,200,cached.payload,'HIT')

  try {
    if (mode === 'directory') {
      const fetchLimit=Math.min(Math.max(limit * 2, limit), MAX_DIRECTORY_ROWS)
      const query=[
        `${CACHE}?select=${DIRECTORY_SELECT}`,
        `city_key=eq.${encodeURIComponent(city)}`,
        'status=eq.active',
        'quality_score=gte.55',
        category?`category_key=eq.${encodeURIComponent(category)}`:'',
        subcategory?`subcategory_key=eq.${encodeURIComponent(subcategory)}`:'',
        'order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast',
        `limit=${fetchLimit}`,
      ].filter(Boolean).join('&')
      const rows=await fetchRows(query,'GOOD TIMES directory')
      const seen=new Set()
      const venues=rows
        .filter(customerReadyDirectoryVenue)
        .filter(row=>!isCategoryIdentityMismatch(row))
        .filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true})
        .slice(0,limit)
        .map(row=>({...row,hero_image:safePublicImage(row.hero_image)}))
      const payload={ok:true,city,category,subcategory,count:venues.length,customer_ready:true,venues}
      RESPONSE_CACHE.set(key,{at:Date.now(),payload})
      return send(response,200,payload)
    }

    const [categoriesResult,subcategoriesResult,countsResult]=await Promise.allSettled([
      fetchRows(`gt_taxonomy_categories?select=${CATEGORY_SELECT}&is_active=eq.true&order=sort_order.asc,category_name.asc`,'GOOD TIMES categories'),
      fetchRows(`gt_taxonomy_subcategories?select=${SUBCATEGORY_SELECT}&is_active=eq.true&order=category_key.asc,sort_order.asc,subcategory_name.asc`,'GOOD TIMES subcategories'),
      fetchRows(`${COUNT_CACHE}?select=${COUNT_SELECT}&city_key=eq.${encodeURIComponent(city)}&limit=500`,'GOOD TIMES taxonomy counts'),
    ])

    if(categoriesResult.status!=='fulfilled' || subcategoriesResult.status!=='fulfilled') {
      const reason=categoriesResult.status==='rejected'?categoriesResult.reason:subcategoriesResult.reason
      throw reason || new Error('GOOD TIMES taxonomy definitions unavailable')
    }

    const categories=categoriesResult.value
    const subcategories=subcategoriesResult.value
    const counts=countsResult.status==='fulfilled'?countsResult.value:[]
    const countsLive=countsResult.status==='fulfilled'
    if(!countsLive) console.warn('[GOOD TIMES catalog counts fallback]',{city,message:countsResult.reason?.message||'count cache unavailable'})

    const categoryCounts=new Map()
    const subcategoryCounts=new Map()
    for(const row of counts){
      const value=Number(row.venue_count||0)
      if(row.subcategory_key)subcategoryCounts.set(`${row.category_key}:${row.subcategory_key}`,value)
      else categoryCounts.set(row.category_key,value)
    }

    const grouped=new Map()
    for(const row of subcategories){
      if(!grouped.has(row.category_key))grouped.set(row.category_key,[])
      grouped.get(row.category_key).push({
        id:row.subcategory_key,
        name:row.subcategory_name,
        description:row.description,
        minimum_inventory:row.minimum_upcoming_inventory,
        count:subcategoryCounts.get(`${row.category_key}:${row.subcategory_key}`)||0,
        image:null,
      })
    }

    const payload={
      ok:true,
      city,
      counts_live:countsLive,
      counts:{categories:categories.length,subcategories:subcategories.length},
      categories:categories.map(category=>({
        id:category.category_key,
        name:category.category_name,
        description:category.description,
        count:categoryCounts.get(category.category_key)||0,
        image:null,
        subcategories:grouped.get(category.category_key)||[],
      })),
    }
    RESPONSE_CACHE.set(key,{at:Date.now(),payload})
    if(RESPONSE_CACHE.size>80){const oldest=[...RESPONSE_CACHE.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];if(oldest)RESPONSE_CACHE.delete(oldest)}
    return send(response,200,payload)
  } catch(error){
    const stale=RESPONSE_CACHE.get(key)
    if(fresh(stale, 30 * 60 * 1000)) {
      console.warn('[GOOD TIMES catalog stale fallback]',{city,mode,message:error?.message||String(error)})
      return send(response,200,{...stale.payload,degraded:true},'STALE')
    }
    console.error('[GOOD TIMES catalog]',{city,mode,message:error?.message||String(error)})
    return send(response,503,{ok:false,city,mode,error:'GOOD TIMES catalog is temporarily unavailable.',detail:error?.message||String(error)})
  }
}
