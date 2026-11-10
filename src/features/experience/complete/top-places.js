// Owner-curated "Top Places in Atlanta" (2026-11-09) and owner-stated venue types.
// Order comes from public.gt_editorial_top_places (editorial_rank on each venue in the live feed).
// The name list is only a fallback order for venues already in the verified feed — it never adds a venue
// and never invents facts; a venue must pass the normal verified gate to appear at all.
export const OWNER_TOP_PLACES = [
  { match: /^opium\b/i, type: 'Nightclub' },
  { match: /^revel\b/i, type: 'Nightclub' },
  { match: /^tulum\b/i, type: null },
  { match: /^sea salt\b/i, type: null },
  { match: /^hungry af\b/i, type: null },
  { match: /^goodfellas\b/i, type: null },
  { match: /^(club )?33\b/i, type: null },
  { match: /^happy hour\b/i, type: 'Lounge' },
  { match: /^(the )?locker room\b/i, type: null },
  { match: /^utopia\b/i, type: 'Lounge' },
  { match: /^magic city\b/i, type: 'Strip Club' },
  { match: /^onyx\b/i, type: 'Strip Club' },
  { match: /^pasha\b/i, type: null },
  { match: /^blue flame\b/i, type: 'Strip Club' },
  { match: /^cosm\b/i, type: 'Immersive Venue' },
]

const ownerIndex = venue => OWNER_TOP_PLACES.findIndex(p => p.match.test(String(venue?.name || '').trim()))

/** Owner-stated type for a named venue ("Opium is a club, Magic City is a strip club"), else null. */
export function ownerTypeLabel(venue) {
  const i = ownerIndex(venue)
  return i >= 0 ? OWNER_TOP_PLACES[i].type : null
}

/** Top Places: owner editorial order first (DB rank, then owner list), then the feed's own order. */
export function topPlaces(venues = [], limit = 14) {
  const rows = (Array.isArray(venues) ? venues : []).map((v, i) => {
    const rank = Number(v?.editorial_rank)
    const owner = ownerIndex(v)
    return { v, i, key: Number.isFinite(rank) && rank > 0 ? rank : owner >= 0 ? 100 + owner : Infinity }
  })
  const seen = new Set()
  return rows.sort((a, b) => a.key - b.key || a.i - b.i)
    .map(r => r.v)
    .filter(v => { const k = String(v?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (!k || seen.has(k)) return false; seen.add(k); return true })
    .slice(0, limit)
}

/** Nightlife type from the venue's own category/subcategory, so clubs never read as restaurants. */
export function nightlifeKind(venue) {
  const owner = ownerTypeLabel(venue)
  if (owner) return owner
  const category = String(venue?.venue_category_key || venue?.category_key || '').toLowerCase()
  const t = `${category} ${venue?.venue_subcategory || venue?.subcategory || ''}`.toLowerCase()
  if (/strip|gentlem/.test(t)) return 'Strip Club'
  // Eateries keep their cuisine label; only true nightlife venues get a nightlife type.
  if (/restaurant|brunch|coffee|cafe|bakery|food|dining/.test(category)) return null
  if (/hookah/.test(t)) return 'Hookah Lounge'
  if (/speakeasy/.test(t)) return 'Speakeasy'
  if (/rooftop/.test(t)) return 'Rooftop Lounge'
  if (/nightclub|night_club|\bclubs?\b/.test(t)) return 'Nightclub'
  if (/lounge/.test(t)) return 'Lounge'
  if (/jazz/.test(t)) return 'Jazz Club'
  if (/sports_bar|sports bar/.test(t)) return 'Sports Bar'
  if (/wine_bar|wine bar/.test(t)) return 'Wine Bar'
  return null
}
