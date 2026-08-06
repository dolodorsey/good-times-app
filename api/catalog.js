const CONTENT_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co'
const CONTENT_KEY = 'sb_publishable_ekvoOK6QQ05dUZuWgzQfUw_2RgbWPFR'
const MAX_DIRECTORY_ROWS = 800
const CACHE = 'gt_venue_taxonomy_directory_cache'

const CATEGORY_SELECT = 'category_key,category_name,description,sort_order'
const SUBCATEGORY_SELECT = 'category_key,subcategory_key,subcategory_name,description,sort_order,minimum_upcoming_inventory'
const MEMBERSHIP_SELECT = 'id,category_key,subcategory_key,hero_image,quality_score'
const DIRECTORY_SELECT = [
  'id','city_key','name','neighborhood','side_of_town','short_desc','hero_image','google_rating',
  'google_reviews','quality_score','price_range','vibe_tags','category_key','category_name','subcategory',
  'subcategory_key','venue_category_key','venue_subcategory','tab_tags','search_tags','culture_tier','is_khg',
  'is_culture_pick','is_black_owned','culture_tags','instagram_handle','sourced_from','website','phone',
  'booking_link','status','taxonomy_confidence','latitude','longitude','address','hours_summary','dress_code',
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
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function fetchRows(path, label) {
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
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
    if (attempt < 2) await wait(160 * (attempt + 1))
  }
  throw lastError || new Error(`${label} failed`)
}
function send(response, status, payload) {
  response.statusCode=status
  response.setHeader('Content-Type','application/json; charset=utf-8')
  response.setHeader('Cache-Control',status===200?'public, s-maxage=300, stale-while-revalidate=900':'no-store')
  response.setHeader('X-Content-Type-Options','nosniff')
  response.end(JSON.stringify(payload))
}
function countUnique(rows, field) {
  const result=new Map()
  for (const row of rows) {
    const key=row[field]
    if(!key)continue
    if(!result.has(key))result.set(key,new Set())
    result.get(key).add(row.id)
  }
  return result
}

export default async function handler(request,response) {
  if ((request.method || 'GET') !== 'GET') {
    response.setHeader('Allow','GET'); return send(response,405,{ok:false,error:'Method not allowed'})
  }
  const url=new URL(request.url || '/api/catalog','https://thegoodtimesworldwide.com')
  const city=normalizeCity(url.searchParams.get('city'))
  const mode=url.searchParams.get('mode') || 'taxonomy'
  try {
    if (mode === 'directory') {
      const category=url.searchParams.get('category')
      const subcategory=url.searchParams.get('subcategory')
      const query=[
        `${CACHE}?select=${DIRECTORY_SELECT}`,
        `city_key=eq.${encodeURIComponent(city)}`,
        category?`category_key=eq.${encodeURIComponent(category)}`:'',
        subcategory?`subcategory_key=eq.${encodeURIComponent(subcategory)}`:'',
        'order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast',
        `limit=${clamp(url.searchParams.get('limit'),300,MAX_DIRECTORY_ROWS)}`,
      ].filter(Boolean).join('&')
      const rows=await fetchRows(query,'GOOD TIMES directory')
      const seen=new Set()
      const venues=rows.filter(row=>{if(!row?.id||seen.has(row.id))return false;seen.add(row.id);return true}).map(row=>({...row,hero_image:safePublicImage(row.hero_image)}))
      return send(response,200,{ok:true,city,category,subcategory,count:venues.length,venues})
    }

    const [categories,subcategories,memberships]=await Promise.all([
      fetchRows(`gt_taxonomy_categories?select=${CATEGORY_SELECT}&is_active=eq.true&order=sort_order.asc,category_name.asc`,'GOOD TIMES categories'),
      fetchRows(`gt_taxonomy_subcategories?select=${SUBCATEGORY_SELECT}&is_active=eq.true&order=category_key.asc,sort_order.asc,subcategory_name.asc`,'GOOD TIMES subcategories'),
      fetchRows(`${CACHE}?select=${MEMBERSHIP_SELECT}&city_key=eq.${encodeURIComponent(city)}&order=quality_score.desc.nullslast&limit=10000`,'GOOD TIMES category membership'),
    ])
    const categoryCounts=countUnique(memberships,'category_key')
    const subcategoryCounts=countUnique(memberships,'subcategory_key')
    const categoryImages=new Map(),subcategoryImages=new Map()
    for(const row of memberships){
      const image=safePublicImage(row.hero_image)
      if(image&&row.category_key&&!categoryImages.has(row.category_key))categoryImages.set(row.category_key,image)
      if(image&&row.subcategory_key&&!subcategoryImages.has(row.subcategory_key))subcategoryImages.set(row.subcategory_key,image)
    }
    const grouped=new Map()
    for(const row of subcategories){
      if(!grouped.has(row.category_key))grouped.set(row.category_key,[])
      grouped.get(row.category_key).push({id:row.subcategory_key,name:row.subcategory_name,description:row.description,minimum_inventory:row.minimum_upcoming_inventory,count:subcategoryCounts.get(row.subcategory_key)?.size||0,image:subcategoryImages.get(row.subcategory_key)||null})
    }
    return send(response,200,{ok:true,city,counts:{categories:categories.length,subcategories:subcategories.length},categories:categories.map(category=>({id:category.category_key,name:category.category_name,description:category.description,count:categoryCounts.get(category.category_key)?.size||0,image:categoryImages.get(category.category_key)||null,subcategories:grouped.get(category.category_key)||[]}))})
  } catch(error){
    console.error('[GOOD TIMES catalog]',{city,mode,message:error?.message||String(error)})
    return send(response,503,{ok:false,city,mode,error:'GOOD TIMES catalog is temporarily unavailable.',detail:error?.message||String(error)})
  }
}
