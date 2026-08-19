const BG_BASE = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/good-times-backgrounds'

const CATEGORY_BACKGROUNDS = {
  restaurant: 'gt-cat-dining.webp',
  food_and_dining: 'gt-cat-dining.webp',
  dining_culinary: 'gt-cat-dining.webp',
  brunch: 'gt-cat-dining.webp',
  coffee: 'gt-cat-dining.webp',
  nightclub: 'gt-cat-nightlife.webp',
  nightlife: 'gt-cat-nightlife.webp',
  lounge: 'gt-cat-nightlife.webp',
  hookah: 'gt-cat-hookah.webp',
  bar: 'gt-cat-drinks.webp',
  cocktail_bar: 'gt-cat-drinks.webp',
  rooftop: 'gt-cat-drinks.webp',
  sports_watch: 'gt-cat-sports.webp',
  sports: 'gt-cat-sports.webp',
  museum: 'gt-cat-culture.webp',
  gallery: 'gt-cat-culture.webp',
  culture: 'gt-cat-culture.webp',
  arts_museums_culture: 'gt-cat-culture.webp',
  shopping: 'gt-cat-shopping.webp',
  wellness: 'gt-cat-wellness.webp',
  wellness_fitness: 'gt-cat-wellness.webp',
  fitness: 'gt-cat-wellness.webp',
  spa: 'gt-cat-wellness.webp',
  family_kids: 'gt-cat-family.webp',
}

const ROTATION = [
  'gt-cat-mood-bougie.webp',
  'gt-cat-mood-chill.webp',
  'gt-cat-mood-explore.webp',
  'gt-cat-mood-date.webp',
  'gt-cat-culture.webp',
  'gt-cat-nightlife.webp',
]

function hash(value = '') {
  let result = 2166136261
  for (const char of String(value)) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return Math.abs(result >>> 0)
}

function brandedFallback(item) {
  const key = String(item?.category_key || item?.venue_category_key || '').toLowerCase()
  const file = CATEGORY_BACKGROUNDS[key] || ROTATION[hash(item?.id || item?.name || item?.title) % ROTATION.length]
  return `${BG_BASE}/${file}`
}

function normalizedName(value) {
  return String(value || '').toLowerCase().replace(/&[a-z0-9#]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function isLikelyLogo(url) {
  const value = String(url || '').toLowerCase()
  return /(?:^|[\/_\-.])(logo|wordmark|brandmark)(?:[\/_\-.]|$)/.test(value) || /logo\.png(?:\?|$)/.test(value)
}

function dedupeVenues(rows = []) {
  const imageCounts = new Map()
  for (const venue of rows) {
    const image = String(venue?.hero_image || '').trim()
    if (image) imageCounts.set(image, (imageCounts.get(image) || 0) + 1)
  }

  const seen = new Set()
  const cleaned = []
  for (const venue of rows) {
    const name = normalizedName(venue?.name)
    const area = normalizedName(venue?.neighborhood || venue?.address)
    const key = `${name}|${area}`
    if (name && seen.has(key)) continue
    if (name) seen.add(key)

    const image = String(venue?.hero_image || '').trim()
    const duplicateStock = image && (imageCounts.get(image) || 0) > 1
    cleaned.push({
      ...venue,
      hero_image: !image || duplicateStock || isLikelyLogo(image) ? brandedFallback(venue) : image,
      media_fallback: Boolean(!image || duplicateStock || isLikelyLogo(image)),
    })
  }
  return cleaned
}

function cleanPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload
  const venues = Array.isArray(payload.venues) ? dedupeVenues(payload.venues) : payload.venues
  return {
    ...payload,
    venues,
    counts: payload.counts && Array.isArray(venues) ? { ...payload.counts, venues: venues.length } : payload.counts,
  }
}

export function installMediaIntegrityGuard() {
  if (typeof window === 'undefined' || window.__GOOD_TIMES_MEDIA_GUARD__) return
  window.__GOOD_TIMES_MEDIA_GUARD__ = true

  const upstreamFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const response = await upstreamFetch(input, init)
    try {
      const raw = typeof input === 'string' ? input : input?.url
      const url = new URL(raw || '', window.location.origin)
      if (!['/api/data', '/api/data-fast', '/api/data-live'].includes(url.pathname) || !response.ok) return response

      const payload = await response.clone().json()
      const cleaned = cleanPayload(payload)
      const headers = new Headers(response.headers)
      headers.set('content-type', 'application/json; charset=utf-8')
      headers.delete('content-length')
      return new Response(JSON.stringify(cleaned), {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      console.warn('[GOOD TIMES media integrity]', error)
      return response
    }
  }
}
