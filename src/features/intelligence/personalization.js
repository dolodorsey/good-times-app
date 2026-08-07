import { GT_SUPABASE_ANON_KEY, GT_SUPABASE_URL } from '../../lib/supabase.js'
import { readSession } from '../auth/client.js'

const CATEGORY_ALIASES = {
  nightlife: ['nightlife'],
  music: ['concerts_live_music', 'nightlife'],
  concerts: ['concerts_live_music'],
  dining: ['dining_culinary', 'day_parties_brunch'],
  food: ['dining_culinary', 'day_parties_brunch'],
  dating: ['dating_social', 'dining_culinary'],
  date: ['dating_social', 'dining_culinary'],
  culture: ['arts_museums_culture', 'black_culture_diaspora'],
  black_culture: ['black_culture_diaspora'],
  sports: ['sports_watch'],
  wellness: ['wellness_fitness'],
  family: ['family_kids'],
  business: ['business_professional'],
  shopping: ['fashion_beauty_shopping'],
  free: ['free_things_to_do'],
  vip: ['vip_exclusive', 'nightlife'],
  travel: ['travel_staycations'],
}

const VENUE_CATEGORY_TO_LANE = {
  nightclub: 'nightlife', lounge: 'nightlife', bar: 'nightlife', rooftop: 'nightlife', hookah: 'nightlife',
  restaurant: 'dining_culinary', brunch: 'day_parties_brunch', food_and_dining: 'dining_culinary', coffee: 'dining_culinary',
  museum: 'arts_museums_culture', gallery: 'arts_museums_culture', entertainment: 'attractions_experiences',
  hotel: 'travel_staycations', housing: 'travel_staycations', wellness: 'wellness_fitness', fitness: 'wellness_fitness',
}

function headers(token) {
  return {
    apikey: GT_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || GT_SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  }
}

function clean(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function stableJitter(value) {
  const text = String(value || '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0
  return Math.abs(hash % 1000) / 1000
}

function expandInterest(value) {
  const key = clean(value)
  return CATEGORY_ALIASES[key] || [key]
}

function interestSet(profile) {
  const values = [...(profile?.tab_interests || []), ...(profile?.vibe_preferences || [])]
  return new Set(values.flatMap(expandInterest).filter(Boolean))
}

function affinityScore(affinity, category) {
  if (!affinity || typeof affinity !== 'object') return 0
  const direct = Number(affinity[category] || 0)
  let alias = 0
  for (const [key, weight] of Object.entries(affinity)) {
    if (expandInterest(key).includes(category)) alias = Math.max(alias, Number(weight || 0))
  }
  return Math.max(direct, alias)
}

function suppressedSet(intelligence) {
  const values = intelligence?.suppression_rules?.entity_ids
  return new Set(Array.isArray(values) ? values.map(String) : [])
}

export async function loadIntelligenceProfile(session = readSession()) {
  if (!session?.access_token || !session?.user?.id) return null
  const response = await fetch(
    `${GT_SUPABASE_URL}/rest/v1/gt_user_intelligence_profiles?auth_id=eq.${encodeURIComponent(session.user.id)}&select=*&limit=1`,
    { headers: headers(session.access_token), cache: 'no-store' },
  )
  if (!response.ok) return null
  const rows = await response.json().catch(() => [])
  return rows?.[0] || null
}

export function rankEventsForUser(events = [], profile = null, intelligence = null) {
  const interests = interestSet(profile)
  const suppressed = suppressedSet(intelligence)
  const categoryAffinity = intelligence?.category_affinity || {}

  return [...events]
    .filter(item => !suppressed.has(String(item?.event_key || item?.id || '')))
    .map(item => {
      const category = clean(item?.category_key)
      const base = Number(item?.good_times_score || 50)
      const interestBoost = interests.has(category) ? 18 : 0
      const affinityBoost = affinityScore(categoryAffinity, category) * 16
      const curatedBoost = item?.is_curated ? 5 : 0
      const featuredBoost = item?.is_featured ? 4 : 0
      const date = item?.event_date ? new Date(`${item.event_date}T12:00:00`) : null
      const days = date ? Math.max(0, Math.round((date - new Date()) / 86400000)) : 30
      const recencyBoost = Math.max(0, 7 - Math.min(days, 7)) * 0.7
      return { item, score: base + interestBoost + affinityBoost + curatedBoost + featuredBoost + recencyBoost + stableJitter(item?.event_key) }
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item)
}

export function rankVenuesForUser(venues = [], profile = null, intelligence = null) {
  const interests = interestSet(profile)
  const suppressed = suppressedSet(intelligence)
  const categoryAffinity = intelligence?.category_affinity || {}
  const neighborhoodAffinity = intelligence?.neighborhood_affinity || {}
  const priceAffinity = intelligence?.price_affinity || {}

  return [...venues]
    .filter(item => !suppressed.has(String(item?.id || '')))
    .map(item => {
      const rawCategory = clean(item?.category_key)
      const category = VENUE_CATEGORY_TO_LANE[rawCategory] || rawCategory
      const neighborhood = String(item?.neighborhood || '').trim().toLowerCase()
      const price = String(item?.price_range || '').trim().toLowerCase()
      const quality = Number(item?.quality_score || 60)
      const rating = Number(item?.google_rating || 0) * 4
      const interestBoost = interests.has(category) ? 16 : 0
      const affinityBoost = affinityScore(categoryAffinity, category) * 14
      const neighborhoodBoost = Number(neighborhoodAffinity?.[neighborhood] || 0) * 8
      const priceBoost = Number(priceAffinity?.[price] || 0) * 5
      const cultureBoost = item?.is_culture_pick ? 4 : 0
      const verifiedBoost = item?.is_verified ? 3 : 0
      return { item, score: quality + rating + interestBoost + affinityBoost + neighborhoodBoost + priceBoost + cultureBoost + verifiedBoost + stableJitter(item?.id) }
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item)
}
