// GOOD TIMES Intelligence Director
// Taste, source authority, momentum, visual quality, uniqueness, and proximity are
// scored independently. SEO/search rank is never an input. Proximity is capped at 5%.

export const GOOD_TIMES_WEIGHTS = Object.freeze({
  cultural_relevance: 25,
  experience_quality: 20,
  source_authority: 15,
  current_momentum: 15,
  visual_quality: 10,
  uniqueness: 10,
  proximity: 5,
})

const TIER_SCORE = Object.freeze({ s: 100, a: 85, b: 65, c: 40, d: 20 })
const PREMIUM_CATEGORIES = new Set([
  'nightlife','concerts_live_music','festivals_major_activations','arts_museums_culture',
  'dining_culinary','vip_exclusive','black_culture_diaspora','attractions_experiences',
])

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, number(value)))
}

function bool(value) { return value === true || value === 1 || value === 'true' }

function text(value) { return String(value || '').trim().toLowerCase() }

function array(value) { return Array.isArray(value) ? value : [] }

function sourceTier(item) {
  const tier = text(item?.source_tier || item?.authority_tier || item?.culture_tier).replace(/^tier\s*/,'')
  return TIER_SCORE[tier] ?? null
}

function ageDays(value) {
  if (!value) return null
  const stamp = new Date(value).getTime()
  if (!Number.isFinite(stamp)) return null
  return Math.max(0, (Date.now() - stamp) / 86_400_000)
}

function weighted(component, weight) {
  return Number(((clamp(component) / 100) * weight).toFixed(2))
}

function independentEvidenceScore(item) {
  const independent = number(item?.independent_source_count ?? item?.independent_sources ?? item?.source_breadth, 0)
  const mentions = number(item?.mention_count ?? item?.recent_mentions ?? item?.social_mentions, 0)
  const authority = clamp(item?.mention_authority ?? item?.tracked_source_authority ?? 0)
  return clamp(Math.min(independent * 18, 54) + Math.min(mentions * 4, 20) + authority * 0.26)
}

export function scoreSourceAuthority(item, kind = 'venue') {
  const explicit = item?.source_authority_score ?? item?.authority_score
  if (explicit !== null && explicit !== undefined && Number.isFinite(Number(explicit))) return clamp(explicit)
  const tier = sourceTier(item)
  if (tier !== null) return tier

  const source = text(`${item?.source_name || item?.source || ''} ${item?.source_url || ''}`)
  const official = /official|venue|organizer|artist|team|league|museum|university|government|\.gov\b/.test(source)
  const ticketing = /eventbrite|ticketmaster|axs|dice|seatgeek/.test(source)
  const editorial = /ajc|atlanta magazine|eater|thrillist|timeout|essence|complex|billboard|rolling stone|forbes|cntraveler|travel\s*\+\s*leisure/.test(source)
  const verified = bool(item?.is_verified)
  const hasDirect = Boolean(item?.source_url || item?.website)
  const evidence = independentEvidenceScore(item)

  let score = verified ? 45 : 20
  if (official) score += 28
  else if (editorial) score += 24
  else if (ticketing) score += 18
  if (hasDirect) score += 8
  score += evidence * 0.19
  if (kind === 'venue' && item?.instagram_handle) score += 4
  return clamp(score)
}

function scoreCulturalRelevance(item) {
  const explicit = item?.cultural_relevance_score
  if (explicit !== null && explicit !== undefined) return clamp(explicit)
  const culture = clamp(item?.culture_score ?? 0)
  let score = culture * 0.72
  if (bool(item?.is_culture_pick)) score += 20
  if (bool(item?.is_curated)) score += 7
  if (bool(item?.is_black_owned)) score += 6
  if (PREMIUM_CATEGORIES.has(item?.category_key || item?.venue_category_key)) score += 6
  score += Math.min(array(item?.culture_tags).length * 2.5, 10)
  return clamp(score)
}

function scoreExperienceQuality(item) {
  const explicit = item?.experience_quality_score
  if (explicit !== null && explicit !== undefined) return clamp(explicit)
  const quality = clamp(item?.quality_score ?? 0)
  let score = quality
  if (bool(item?.is_verified)) score += 12
  if (item?.booking_link || item?.ticket_url) score += 7
  if (item?.website) score += 5
  if (item?.short_desc || item?.description) score += 4
  // Deliberately no Google/Yelp/SEO rank weighting here. Those may be evidence, never authority.
  return clamp(score)
}

function scoreMomentum(item) {
  const explicit = item?.current_momentum_score ?? item?.momentum_score ?? item?.social_score
  if (explicit !== null && explicit !== undefined) return clamp(explicit)
  const mentions = number(item?.recent_mentions ?? item?.mention_count, 0)
  const views = number(item?.recent_views ?? item?.view_count, 0)
  const engagement = number(item?.recent_engagement ?? item?.like_count, 0) + number(item?.comment_count, 0) * 2
  const freshness = ageDays(item?.updated_at ?? item?.observed_at ?? item?.mentioned_at)
  let score = Math.min(mentions * 10, 35) + Math.min(Math.log10(Math.max(1, views)) * 9, 28) + Math.min(Math.log10(Math.max(1, engagement)) * 7, 20)
  if (freshness !== null) score += freshness <= 3 ? 17 : freshness <= 7 ? 13 : freshness <= 30 ? 8 : 2
  if (bool(item?.is_featured)) score += 8
  return clamp(score)
}

function scoreUniqueness(item) {
  const explicit = item?.uniqueness_score
  if (explicit !== null && explicit !== undefined) return clamp(explicit)
  let score = 35
  if (bool(item?.is_culture_pick)) score += 20
  if (bool(item?.is_khg)) score += 8
  if (bool(item?.is_black_owned)) score += 8
  score += Math.min(array(item?.vibe_tags).length * 4, 16)
  score += Math.min(array(item?.culture_tags).length * 3, 15)
  if (PREMIUM_CATEGORIES.has(item?.category_key || item?.venue_category_key)) score += 8
  return clamp(score)
}

function scoreProximity(item) {
  const miles = Number(item?.distance_miles)
  if (!Number.isFinite(miles) || miles < 0) return 50 // neutral when unknown; never fabricate distance
  if (miles <= 1) return 100
  if (miles <= 3) return 90
  if (miles <= 7) return 75
  if (miles <= 15) return 55
  if (miles <= 30) return 30
  return 10
}

function normalizeCandidate(candidate, fallback = {}) {
  if (!candidate) return null
  if (typeof candidate === 'string') return { url: candidate, ...fallback }
  const url = candidate.url || candidate.image_url || candidate.hero_image || candidate.src
  if (!url) return null
  return { ...fallback, ...candidate, url }
}

function mediaSourceScore(candidate) {
  const source = text(candidate?.source_type || candidate?.source || candidate?.source_name)
  if (bool(candidate?.is_official) || /official|venue_owned|venue-owned|organizer|artist_owned|team_owned/.test(source)) return 25
  if (bool(candidate?.is_editorial) || /editorial|magazine|newspaper|press_photo|photojournal/.test(source)) return 24
  if (bool(candidate?.is_press) || /press|publicity/.test(source)) return 22
  if (/ticketing|eventbrite|ticketmaster|axs|dice/.test(source)) return 19
  if (bool(candidate?.is_creator) || /creator|photographer|social/.test(source)) return 15
  if (bool(candidate?.is_curator_submission) || /curator|submission/.test(source)) return 9
  if (/stock|unsplash|pexels|fallback|category/.test(source)) return 1
  if (/current_record|current/.test(source)) return 7
  return 5
}

export function scoreMediaCandidate(candidate, subjectType = 'venue') {
  const c = normalizeCandidate(candidate)
  if (!c) return -100
  const url = text(c.url)
  const source = text(c.source_type || c.source || c.source_name)
  const rights = text(c.rights_status || c.rights || 'unknown')
  if (/blocked|rejected|copyright_denied|do_not_use/.test(rights)) return -100

  const width = number(c.width ?? c.image_width, 0)
  const height = number(c.height ?? c.image_height, 0)
  const ratio = width > 0 && height > 0 ? width / height : null
  const recency = ageDays(c.captured_at ?? c.published_at ?? c.observed_at)

  let score = mediaSourceScore(c)
  if (bool(c.subject_verified) || bool(c.identity_verified)) score += 20
  else if (bool(c.is_official)) score += 16

  if (width >= 1600) score += 20
  else if (width >= 1200) score += 17
  else if (width >= 800) score += 12
  else if (width >= 600) score += 8
  else if (width > 0) score -= 8

  if (ratio !== null) {
    if (ratio >= 1.45 && ratio <= 1.9) score += 10
    else if (ratio >= 1.2 && ratio <= 2.1) score += 7
    else if (subjectType === 'venue') score -= 7
  }

  if (recency !== null) score += recency <= 90 ? 10 : recency <= 365 ? 7 : recency <= 730 ? 3 : 0
  else score += 3

  score += clamp(c.composition_score ?? c.aesthetic_score ?? 0) * 0.1
  if (bool(c.mobile_crop_safe)) score += 5
  if (/approved|owned|licensed|permission|public_domain/.test(rights)) score += 10

  const looksLogo = bool(c.is_logo) || /(?:^|[\/_\-.])(logo|wordmark|brandmark)(?:[\/_\-.]|$)/.test(url)
  const looksStock = bool(c.is_stock) || /stock|unsplash|pexels|shutterstock|istock/.test(source) || /stock|unsplash|pexels/.test(url)
  const looksFlyer = bool(c.text_heavy) || /flyer|poster/.test(source) || /flyer|poster/.test(url)
  const watermark = bool(c.has_watermark) || /watermark/.test(source)

  if (looksLogo) score -= 40
  if (watermark) score -= 28
  if (looksStock) score -= 30
  if (looksFlyer) score -= subjectType === 'venue' ? 25 : 7
  if (bool(c.is_duplicate)) score -= 20
  if (/fallback|category/.test(source)) score -= 25

  return Number(clamp(score, -100, 100).toFixed(2))
}

export function selectBestMedia(item, subjectType = 'venue') {
  const currentUrl = subjectType === 'event' ? item?.image_url : item?.hero_image
  const candidateArrays = [item?.media_candidates, item?.image_candidates, item?.images]
  const candidates = []
  for (const values of candidateArrays) {
    for (const value of array(values)) {
      const normalized = normalizeCandidate(value)
      if (normalized) candidates.push(normalized)
    }
  }
  if (currentUrl) {
    candidates.push(normalizeCandidate({
      url: currentUrl,
      source_type: item?.image_source || 'current_record',
      subject_verified: true,
      rights_status: item?.image_rights_status || 'unknown',
      is_curator_submission: bool(item?.image_is_curator_submission),
      width: item?.image_width,
      height: item?.image_height,
    }))
  }

  const unique = new Map()
  for (const candidate of candidates.filter(Boolean)) {
    const key = text(candidate.url)
    if (!key || unique.has(key)) continue
    unique.set(key, candidate)
  }

  const ranked = [...unique.values()]
    .map(candidate => ({ candidate, score: scoreMediaCandidate(candidate, subjectType) }))
    .sort((a,b) => b.score - a.score)

  const best = ranked[0]
  return {
    url: best?.candidate?.url || currentUrl || null,
    score: best ? best.score : 0,
    source_type: best?.candidate?.source_type || best?.candidate?.source || 'none',
    candidate_count: ranked.length,
    changed_from_current: Boolean(best?.candidate?.url && currentUrl && best.candidate.url !== currentUrl),
  }
}

export function scoreGoodTimesEntity(item, kind = 'venue') {
  const media = selectBestMedia(item, kind === 'event' ? 'event' : 'venue')
  const components100 = {
    cultural_relevance: scoreCulturalRelevance(item),
    experience_quality: scoreExperienceQuality(item),
    source_authority: scoreSourceAuthority(item, kind),
    current_momentum: scoreMomentum(item),
    visual_quality: clamp(media.score),
    uniqueness: scoreUniqueness(item),
    proximity: scoreProximity(item),
  }
  const weighted_components = Object.fromEntries(
    Object.entries(GOOD_TIMES_WEIGHTS).map(([key,weight]) => [key, weighted(components100[key], weight)])
  )
  const total = Number(Object.values(weighted_components).reduce((sum,value)=>sum+value,0).toFixed(2))
  return { total, components: components100, weighted_components, media }
}

export function scoreGoodTimesVenue(item) { return scoreGoodTimesEntity(item, 'venue') }
export function scoreGoodTimesEvent(item) { return scoreGoodTimesEntity(item, 'event') }

export function applyGoodTimesVenueIntelligence(item) {
  const intelligence = scoreGoodTimesVenue(item)
  return {
    ...item,
    hero_image: intelligence.media.url || item?.hero_image || null,
    image_source: intelligence.media.source_type,
    visual_quality_score: intelligence.media.score,
    intelligence_score: intelligence.total,
    intelligence_components: intelligence.components,
    image_candidate_count: intelligence.media.candidate_count,
    image_changed_by_visual_director: intelligence.media.changed_from_current,
  }
}

export function applyGoodTimesEventIntelligence(item) {
  const intelligence = scoreGoodTimesEvent(item)
  return {
    ...item,
    image_url: intelligence.media.url || item?.image_url || null,
    image_source: intelligence.media.source_type,
    visual_quality_score: intelligence.media.score,
    intelligence_score: intelligence.total,
    intelligence_components: intelligence.components,
    image_candidate_count: intelligence.media.candidate_count,
    image_changed_by_visual_director: intelligence.media.changed_from_current,
  }
}
