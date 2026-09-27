/** Bounded reads over the existing eligible taxonomy view, not the Home download.
 * Cursor order is stable per scope; no claim of a database snapshot across requests.
 * The view has multiple memberships per venue. Never label row counts as place totals.
 */
const FIELDS = 'id,city_key,name,neighborhood,short_desc,hero_image,quality_score,price_range,vibe_tags,category_key,category_name,subcategory,subcategory_key,venue_category_key,venue_subcategory,website,phone,booking_link,status,taxonomy_confidence,latitude,longitude'
const quoted = value => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
const key = value => {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Invalid discovery category.')
  return value
}
export function normalizeExploreScope(input = {}) {
  const category = key(input.category), subcategory = key(input.subcategory)
  if (subcategory && !category) throw new Error('Select a category before a subcategory.')
  const query = String(input.query || '').trim().slice(0, 120)
  const sort = ['quality', 'name'].includes(input.sort) ? input.sort : 'quality'
  const limit = Math.max(2, Math.min(48, Math.trunc(Number(input.limit) || 24)))
  return { city: 'atlanta', category, subcategory, query, sort, limit }
}
export function exploreSignature(input) { return JSON.stringify(normalizeExploreScope(input)) }
function scoreOf(row) { return row.quality_score != null && Number.isFinite(Number(row.quality_score)) ? Number(row.quality_score) : null }
export function buildExploreParams(input = {}) {
  const scope = normalizeExploreScope(input)
  const params = new URLSearchParams({ select: FIELDS, city_key: 'eq.atlanta', order: scope.sort === 'name' ? 'name.asc,id.asc' : 'quality_score.desc.nullslast,name.asc,id.asc', limit: String(scope.limit) })
  if (scope.category) params.set('category_key', `eq.${scope.category}`)
  if (scope.subcategory) params.set('subcategory_key', `eq.${scope.subcategory}`)
  const conditions = []
  if (scope.query) {
    // Treat user-supplied LIKE metacharacters literally; all values are quoted.
    const pattern = '*' + scope.query.replace(/[\\%_*]/g, char => '\\' + char) + '*'
    conditions.push(`or(${['name','neighborhood','category_name','subcategory','short_desc'].map(column => `${column}.ilike.${quoted(pattern)}`).join(',')})`)
  }
  if (input.cursor) {
    const cursor = input.cursor
    if (cursor.signature !== exploreSignature(scope) || typeof cursor.id !== 'string' || typeof cursor.name !== 'string' || cursor.id.length > 128 || cursor.name.length > 1000) throw new Error('The results changed. Refresh this collection.')
    const afterName = `or(name.gt.${quoted(cursor.name)},and(name.eq.${quoted(cursor.name)},id.gt.${quoted(cursor.id)}))`
    if (scope.sort === 'name') conditions.push(afterName)
    else if (cursor.score === null) conditions.push(`and(quality_score.is.null,${afterName})`)
    else {
      if (!Number.isFinite(cursor.score)) throw new Error('Invalid discovery cursor.')
      conditions.push(`or(quality_score.lt.${cursor.score},quality_score.is.null,and(quality_score.eq.${cursor.score},${afterName}))`)
    }
  }
  if (conditions.length) params.set('and', `(${conditions.join(',')})`)
  return params
}
export function uniqueScopedPlaces(rows, input = {}) {
  const scope = normalizeExploreScope(input), seen = new Set()
  return rows.filter(row => {
    if (!row?.id || !row.name || row.city_key !== 'atlanta' || (row.status && row.status !== 'active')) return false
    if (scope.category && row.category_key !== scope.category) return false
    if (scope.subcategory && row.subcategory_key !== scope.subcategory) return false
    if (seen.has(row.id)) return false
    seen.add(row.id); return true
  })
}
export function pageFromRows(rows, input = {}, asOf = new Date().toISOString()) {
  if (!Array.isArray(rows)) throw new Error('The directory returned an invalid response. Please retry.')
  const scope = normalizeExploreScope(input), last = rows.at(-1)
  // A repeated membership at the boundary is safe to skip: that venue was already returned.
  const nextCursor = rows.length >= scope.limit && last?.id && last?.name ? { signature: exploreSignature(scope), id: String(last.id), name: last.name, score: scoreOf(last) } : null
  return { items: uniqueScopedPlaces(rows, scope), nextCursor, asOf, count: null, countType: 'unknown', state: 'success' }
}
export async function requestExplorePage(baseURL, headers, input = {}, { signal, fetcher = globalThis.fetch } = {}) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetcher(`${baseURL}/rest/v1/v_gt_venue_taxonomy_directory?${buildExploreParams(input)}`, { method: 'GET', headers, cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error('Could not load these places. Please retry.')
    return pageFromRows(await response.json(), input)
  } catch (error) {
    if (signal?.aborted) throw error
    if (error?.name === 'AbortError') throw new Error('The directory took too long. Please retry.')
    throw error
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel) }
}
export function knownPlaceCount(rows, category, subcategory = null) {
  const row = rows.find(r => r.category_key === category && (r.subcategory_key ?? null) === subcategory)
  return row && row.place_count != null && Number.isFinite(Number(row.place_count)) ? Number(row.place_count) : null
}
export function validCoordinate(row) {
  return row.latitude != null && row.longitude != null && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) && Math.abs(Number(row.latitude)) <= 90 && Math.abs(Number(row.longitude)) <= 180
}
