/** Compact pilot: bounded public directory reads; no account or scheduler state. */
export const COMPACT_PAGE_SIZE = 24
const KEY = /^[a-z0-9][a-z0-9_-]{0,95}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const DIRECTORY_FIELDS = 'id,city_key,name,neighborhood,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,category_key,category_name,subcategory,subcategory_key,venue_category_key,venue_subcategory,tab_tags,search_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,sourced_from,website,phone,booking_link,status,taxonomy_confidence,latitude,longitude'

export function compactPilotEnabled({hostname = '', search = '', preview = false} = {}) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
  return (local || preview === true) && new URLSearchParams(search).get('gt_compact') === '1'
}
export function normalizeDirectoryQuery(value) {
  return String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}\s'&.\-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}
export function directoryScope({category = null, subcategory = null, query = ''} = {}) {
  for (const key of [category, subcategory]) if (key != null && !KEY.test(key)) throw new TypeError('Invalid category key')
  if (subcategory && !category) throw new TypeError('A subcategory requires its parent category')
  return JSON.stringify(['atlanta', category, subcategory, normalizeDirectoryQuery(query).toLowerCase()])
}
export function encodeDirectoryCursor(row, scope) {
  if (!UUID.test(row?.id || '') || !KEY.test(row?.subcategory_key || '')) throw new TypeError('Invalid directory cursor record')
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({v:1, id:row.id, sub:row.subcategory_key, scope})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}
export function decodeDirectoryCursor(cursor, scope) {
  if (!cursor || typeof cursor !== 'string' || cursor.length > 1800 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new TypeError('Invalid directory cursor')
  let value
  try { value = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cursor.replace(/-/g,'+').replace(/_/g,'/')), character => character.charCodeAt(0)))) } catch { throw new TypeError('Invalid directory cursor') }
  if (value.v !== 1 || value.scope !== scope || !UUID.test(value.id || '') || !KEY.test(value.sub || '')) throw new TypeError('Cursor does not match this search')
  return value
}
export function directoryPageUrl(base, {category = null, subcategory = null, query = '', cursor = null} = {}) {
  const scope = directoryScope({category, subcategory, query})
  const url = new URL('/rest/v1/v_gt_venue_taxonomy_directory', base)
  const params = url.searchParams
  params.set('select', DIRECTORY_FIELDS)
  params.set('city_key','eq.atlanta')
  if (category) params.set('category_key',`eq.${category}`)
  if (subcategory) params.set('subcategory_key',`eq.${subcategory}`)
  params.set('order','id.asc,subcategory_key.asc')
  params.set('limit',String(COMPACT_PAGE_SIZE + 1))
  const predicates = []
  const text = normalizeDirectoryQuery(query)
  if (text) {
    // Only letters, digits, spaces and harmless name punctuation survive normalization.
    const pattern = `"*${text}*"`
    predicates.push(`or(name.ilike.${pattern},neighborhood.ilike.${pattern},category_name.ilike.${pattern},subcategory.ilike.${pattern},short_desc.ilike.${pattern})`)
  }
  if (cursor) {
    const after = decodeDirectoryCursor(cursor,scope)
    predicates.push(`or(id.gt.${after.id},and(id.eq.${after.id},subcategory_key.gt.${after.sub}))`)
  }
  if (predicates.length) params.set('and',`(${predicates.join(',')})`)
  return {url:url.toString(), scope}
}
export function mergeDirectoryPages(existing, incoming) {
  const result = new Map()
  for (const row of [...existing, ...incoming]) if (row?.id && !result.has(row.id)) result.set(row.id,row)
  return [...result.values()]
}
export function coordinatesFor(row) {
  if (row?.latitude == null || row?.longitude == null || row.latitude === '' || row.longitude === '') return null
  const lat = Number(row.latitude), lon = Number(row.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? {lat,lon} : null
}
