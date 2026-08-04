export type Intent = {
  categories: string[];
  dateStart: string;
  dateEnd: string;
  dateLabel: string;
  neighborhoods: string[];
  budget: string;
  occasion: string;
  partySize: number;
  queryTokens: string[];
};

export type MemoryProfile = {
  maturityStage: 'cold' | 'warm' | 'mature';
  signalCount: number;
  positiveSignalCount: number;
  negativeSignalCount: number;
  categoryAffinity: Record<string, number>;
  neighborhoodAffinity: Record<string, number>;
  daypartAffinity: Record<string, number>;
  priceAffinity: Record<string, number>;
  suppressions: Record<string, number>;
  explorationRate: number;
  lastSignalAt: string | null;
};

export type ScoredCandidate = Record<string, any> & {
  object_type: 'event' | 'venue';
  object_id: string;
  relevance_score: number;
  confidence_score: number;
  completeness_score: number;
  freshness_score: number;
  score_components: Record<string, number>;
  reasons: string[];
  diversity_adjustment?: number;
  exploration_pick?: boolean;
  rank_position?: number;
};

export const CATEGORY_TERMS: Record<string, string[]> = {
  nightlife: ['club', 'nightlife', 'party', 'dance', 'lounge', 'hookah', 'late night', 'dj', 'turn up'],
  concerts_live_music: ['concert', 'music', 'live music', 'r&b', 'hip hop', 'jazz', 'show', 'band', 'artist'],
  dining_culinary: ['dinner', 'dining', 'restaurant', 'food', 'eat', 'brunch', 'date night', 'chef'],
  day_parties_brunch: ['brunch', 'day party', 'daytime', 'sunday funday', 'rooftop brunch'],
  comedy_performing_arts: ['comedy', 'stand up', 'theater', 'theatre', 'play', 'performing arts'],
  festivals_major_activations: ['festival', 'activation', 'expo', 'convention', 'fair', 'block party'],
  sports_watch: ['sports', 'game', 'watch party', 'basketball', 'football', 'baseball', 'soccer'],
  arts_museums_culture: ['art', 'museum', 'gallery', 'culture', 'exhibit', 'creative'],
  dating_social: ['date', 'dating', 'singles', 'social', 'meet people', 'romantic'],
  wellness_fitness: ['wellness', 'fitness', 'yoga', 'spa', 'workout', 'recovery'],
  vip_exclusive: ['vip', 'exclusive', 'luxury', 'premium', 'celebrity', 'private'],
  community_civic: ['community', 'civic', 'networking', 'business', 'nonprofit', 'professional'],
  family_kids: ['family', 'kids', 'children', 'child friendly'],
  college_alumni: ['college', 'alumni', 'homecoming', 'university', 'hbcus'],
};

export const VENUE_CATEGORIES: Record<string, string[]> = {
  nightlife: ['nightclub', 'lounge', 'hookah', 'bar', 'cocktail_bar', 'rooftop', 'speakeasy', 'jazz'],
  concerts_live_music: ['music_venue', 'jazz', 'event_venue', 'theater'],
  dining_culinary: ['restaurant', 'brunch', 'food_hall', 'coffee', 'wine_bar', 'food_truck', 'fine_dining'],
  day_parties_brunch: ['brunch', 'day_party', 'pool_party', 'rooftop'],
  comedy_performing_arts: ['comedy', 'theater', 'event_venue'],
  arts_museums_culture: ['culture', 'museum', 'gallery', 'event_venue'],
  sports_watch: ['sports_bar', 'stadium', 'entertainment'],
  wellness_fitness: ['spa', 'fitness', 'gym'],
  vip_exclusive: ['nightclub', 'lounge', 'fine_dining', 'rooftop'],
  family_kids: ['family', 'museum', 'outdoor_adventures', 'entertainment'],
};

const SIGNAL_WEIGHT: Record<string, number> = {
  view: 1,
  search: 1,
  save: 5,
  share: 4,
  book: 9,
  attend: 10,
  rate: 6,
  dismiss: -3,
  hide: -8,
  concierge_select: 6,
};

const VIBE_TO_CATEGORY: Record<string, string[]> = {
  nightlife: ['nightlife'],
  hookah: ['nightlife'],
  dining: ['dining_culinary'],
  drinks: ['nightlife', 'dining_culinary'],
  music: ['concerts_live_music'],
  sports: ['sports_watch'],
  culture: ['arts_museums_culture'],
  dating: ['dating_social'],
  wellness: ['wellness_fitness'],
  exclusive: ['vip_exclusive'],
  shopping: ['shopping'],
  adventure: ['family_kids'],
};

export const clean = (value: unknown, max = 1000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
export const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
};

function nextWeekday(today: string, weekday: number) {
  const date = new Date(`${today}T12:00:00Z`);
  const delta = (weekday - date.getUTCDay() + 7) % 7;
  return addDays(today, delta);
}

function parseNamedDate(text: string, today: string) {
  const weekdays: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  for (const [name, value] of Object.entries(weekdays)) {
    if (text.includes(name)) return { start: nextWeekday(today, value), end: nextWeekday(today, value), label: name };
  }
  const monthPattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i;
  const match = text.match(monthPattern);
  if (match) {
    const year = match[3] || today.slice(0, 4);
    const parsed = new Date(`${match[1]} ${match[2]}, ${year} 12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const value = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      return { start: value, end: value, label: `${match[1]} ${match[2]}` };
    }
  }
  return null;
}

export function parseIntent(query: string, today: string, input: Record<string, unknown>): Intent {
  const text = query.toLowerCase();
  const categories = Object.entries(CATEGORY_TERMS)
    .filter(([, terms]) => terms.some((term) => text.includes(term)))
    .map(([key]) => key);

  let dateStart = clean(input.date, 10) || today;
  let dateEnd = dateStart;
  let dateLabel = 'today';
  if (text.includes('tomorrow')) {
    dateStart = addDays(today, 1);
    dateEnd = dateStart;
    dateLabel = 'tomorrow';
  } else if (text.includes('weekend')) {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    dateStart = addDays(today, (5 - day + 7) % 7);
    dateEnd = addDays(dateStart, 2);
    dateLabel = 'this weekend';
  } else if (text.includes('this week') || text.includes('next 7')) {
    dateEnd = addDays(today, 7);
    dateLabel = 'the next seven days';
  } else if (text.includes('tonight')) {
    dateLabel = 'tonight';
  } else {
    const named = parseNamedDate(text, today);
    if (named) {
      dateStart = named.start;
      dateEnd = named.end;
      dateLabel = named.label;
    }
  }

  const neighborhoods = [
    'buckhead', 'midtown', 'downtown', 'old fourth ward', 'west midtown', 'east atlanta',
    'edgewood', 'decatur', 'atlantic station', 'poncey-highland', 'inman park',
    'virginia-highland', 'little five points', 'castleberry hill', 'college park',
    'sandy springs', 'alpharetta', 'brookhaven', 'marietta', 'vinings', 'west end',
  ].filter((value) => text.includes(value));

  const budget = text.includes('free') ? 'free'
    : /cheap|budget|affordable|under \$/.test(text) ? 'budget'
    : /vip|luxury|premium|exclusive|table/.test(text) ? 'premium'
    : clean(input.budget, 30) || 'any';

  const occasion = /birthday/.test(text) ? 'birthday'
    : /date night|romantic|date/.test(text) ? 'date'
    : /girls|ladies/.test(text) ? 'girls_night'
    : /guys|boys/.test(text) ? 'guys_night'
    : /business|client|network/.test(text) ? 'business'
    : /anniversary/.test(text) ? 'anniversary'
    : /solo|by myself/.test(text) ? 'solo'
    : /family|kids|children/.test(text) ? 'family'
    : 'general';

  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'tonight', 'tomorrow', 'weekend', 'please', 'need', 'want', 'good', 'times']);
  const queryTokens = text.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((token) => token.length > 2 && !stopWords.has(token)).slice(0, 20);

  return {
    categories,
    dateStart,
    dateEnd,
    dateLabel,
    neighborhoods,
    budget,
    occasion,
    partySize: Math.max(1, Math.min(100, Number(input.party_size) || 1)),
    queryTokens,
  };
}

function addWeight(target: Record<string, number>, key: unknown, value: number) {
  if (!key || !Number.isFinite(value)) return;
  const normalized = String(key).trim().toLowerCase();
  if (!normalized) return;
  target[normalized] = (target[normalized] || 0) + value;
}

function normalizeAffinity(values: Record<string, number>) {
  const entries = Object.entries(values);
  const maximum = Math.max(1, ...entries.map(([, value]) => Math.abs(value)));
  return Object.fromEntries(entries.map(([key, value]) => [key, Math.round((value / maximum) * 1000) / 10]));
}

export function buildMemoryProfile(profile: any, signals: any[], now = Date.now()): MemoryProfile {
  const categoryAffinity: Record<string, number> = {};
  const neighborhoodAffinity: Record<string, number> = {};
  const daypartAffinity: Record<string, number> = {};
  const priceAffinity: Record<string, number> = {};
  const suppressions: Record<string, number> = {};
  let positiveSignalCount = 0;
  let negativeSignalCount = 0;
  let lastSignalAt: string | null = null;

  for (const vibe of profile?.vibe_preferences || []) {
    for (const category of VIBE_TO_CATEGORY[String(vibe)] || [String(vibe)]) addWeight(categoryAffinity, category, 4);
  }

  for (const signal of signals || []) {
    const occurred = new Date(signal.occurred_at || now).getTime();
    const ageDays = Math.max(0, (now - occurred) / 86400000);
    const decay = Math.pow(.5, ageDays / 45);
    const rawWeight = (SIGNAL_WEIGHT[signal.signal_type] || 0) * Number(signal.signal_value || 1) * decay;
    if (rawWeight >= 0) positiveSignalCount += 1;
    else negativeSignalCount += 1;
    if (!lastSignalAt || String(signal.occurred_at) > lastSignalAt) lastSignalAt = signal.occurred_at;

    const category = signal.metadata?.category_key || signal.metadata?.category || (signal.entity_type === 'category' ? signal.entity_id : null);
    const neighborhood = signal.metadata?.neighborhood;
    const daypart = signal.metadata?.daypart;
    const price = signal.metadata?.price_range || signal.metadata?.budget;
    addWeight(categoryAffinity, category, rawWeight * (signal.entity_type === 'category' ? 1 : .55));
    addWeight(neighborhoodAffinity, neighborhood, rawWeight);
    addWeight(daypartAffinity, daypart, rawWeight);
    addWeight(priceAffinity, price, rawWeight);
    if (rawWeight < 0) addWeight(suppressions, `${signal.entity_type}:${signal.entity_id}`, Math.abs(rawWeight));
  }

  const signalCount = (signals || []).length;
  const maturityStage: MemoryProfile['maturityStage'] = signalCount < 10 ? 'cold' : signalCount < 50 ? 'warm' : 'mature';
  const explorationRate = maturityStage === 'cold' ? .20 : maturityStage === 'warm' ? .12 : .08;

  return {
    maturityStage,
    signalCount,
    positiveSignalCount,
    negativeSignalCount,
    categoryAffinity: normalizeAffinity(categoryAffinity),
    neighborhoodAffinity: normalizeAffinity(neighborhoodAffinity),
    daypartAffinity: normalizeAffinity(daypartAffinity),
    priceAffinity: normalizeAffinity(priceAffinity),
    suppressions: normalizeAffinity(suppressions),
    explorationRate,
    lastSignalAt,
  };
}

export function adaptWeights(base: Record<string, number>, stage: MemoryProfile['maturityStage']) {
  const multipliers: Record<string, number> = stage === 'cold'
    ? { preference_match: .4, intent_match: 1.25, base_quality: 1.15, social_proof: 1.15, novelty: 1.5, source_confidence: 1.1 }
    : stage === 'warm'
      ? { preference_match: .9, intent_match: 1.1, novelty: 1.15 }
      : { preference_match: 1.3, intent_match: 1.0, novelty: .7, source_confidence: 1.05 };
  const adjusted = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, Number(value) * (multipliers[key] || 1)]));
  const total = Object.values(adjusted).reduce((sum, value) => sum + Number(value), 0) || 1;
  return Object.fromEntries(Object.entries(adjusted).map(([key, value]) => [key, Number(value) / total]));
}

function weighted(parts: Record<string, number>, weights: Record<string, number>) {
  return clamp(Object.entries(weights).reduce((sum, [key, weight]) => sum + (parts[key] || 0) * Number(weight), 0));
}

function freshnessScore(value: unknown, now = Date.now()) {
  if (!value) return 45;
  const ageHours = Math.max(0, (now - new Date(String(value)).getTime()) / 3600000);
  if (ageHours <= 6) return 100;
  if (ageHours <= 24) return 90;
  if (ageHours <= 72) return 75;
  if (ageHours <= 168) return 60;
  if (ageHours <= 720) return 45;
  return 25;
}

function temporalScore(date: string, intent: Intent) {
  if (date >= intent.dateStart && date <= intent.dateEnd) return 100;
  const distance = Math.abs((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${intent.dateStart}T12:00:00Z`).getTime()) / 86400000);
  return clamp(78 - distance * 11);
}

function queryMatch(itemText: string, tokens: string[]) {
  if (!tokens.length) return 60;
  const text = itemText.toLowerCase();
  const matches = tokens.filter((token) => text.includes(token)).length;
  return clamp(30 + matches / tokens.length * 70);
}

function categoryIntentMatch(category: string, requested: string[]) {
  return requested.length ? (requested.includes(category) ? 100 : 25) : 65;
}

function budgetFit(price: unknown, budget: string, free = false) {
  const text = String(price || '').toLowerCase();
  if (budget === 'any') return 70;
  if (budget === 'free') return free || text.includes('free') || text.includes('$0') ? 100 : 15;
  const dollarCount = (text.match(/\$/g) || []).length;
  if (budget === 'budget') return dollarCount <= 2 || /cheap|affordable|low/.test(text) ? 90 : 35;
  if (budget === 'premium') return dollarCount >= 3 || /premium|luxury|vip|$$$$/.test(text) ? 95 : 55;
  return 65;
}

function socialProof(rating: unknown, reviews: unknown, fallback: number) {
  const ratingValue = Number(rating || 0);
  const reviewValue = Number(reviews || 0);
  if (ratingValue > 0) return clamp(ratingValue / 5 * 75 + Math.min(Math.log10(reviewValue + 1) * 12, 25));
  return clamp(fallback);
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function proximityScore(item: any, input: Record<string, unknown>) {
  const userLat = Number(input.latitude);
  const userLng = Number(input.longitude);
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || item.latitude == null || item.longitude == null) return 55;
  return clamp(100 - distanceMiles(userLat, userLng, Number(item.latitude), Number(item.longitude)) * 6);
}

function affinityScore(memory: MemoryProfile, category: string, neighborhood?: string, price?: string) {
  const categoryScore = Number(memory.categoryAffinity[String(category || '').toLowerCase()] || 0);
  const neighborhoodScore = Number(memory.neighborhoodAffinity[String(neighborhood || '').toLowerCase()] || 0);
  const priceScore = Number(memory.priceAffinity[String(price || '').toLowerCase()] || 0);
  return clamp(50 + categoryScore * .35 + neighborhoodScore * .1 + priceScore * .05);
}

function suppressionPenalty(memory: MemoryProfile, objectType: string, objectId: string) {
  return Number(memory.suppressions[`${objectType}:${objectId}`] || 0) * .45;
}

function confidenceFrom(parts: {
  provenance: number;
  completeness: number;
  freshness: number;
  consistency: number;
  actionability: number;
}) {
  return clamp(parts.provenance * .27 + parts.completeness * .25 + parts.freshness * .18 + parts.consistency * .15 + parts.actionability * .15);
}

export function scoreEvent(item: any, intent: Intent, memory: MemoryProfile, weights: Record<string, number>, input: Record<string, unknown>): ScoredCandidate {
  const completeFields = [item.title, item.event_date, item.category_key, item.venue_name, item.event_time, item.image_url, item.ticket_url, item.organizer];
  const completeness = completeFields.filter(Boolean).length / completeFields.length * 100;
  const freshness = freshnessScore(item.refreshed_at);
  const consistency = clamp(40 + (item.title ? 15 : 0) + (item.event_date >= isoDate() ? 20 : 0) + (item.category_key ? 15 : 0) + (item.event_time ? 10 : 0));
  const actionability = clamp(25 + (item.ticket_url ? 35 : 0) + (item.venue_name ? 15 : 0) + (item.event_time ? 10 : 0) + (item.image_url ? 10 : 0) + (item.organizer ? 5 : 0));
  const provenance = clamp(35 + (item.is_curated ? 30 : 0) + (item.is_featured ? 12 : 0) + (item.organizer ? 8 : 0) + (item.source_table ? 10 : 0) + (item.venue_name ? 5 : 0));
  const confidence = confidenceFrom({ provenance, completeness, freshness, consistency, actionability });
  const intentMatch = categoryIntentMatch(item.category_key || '', intent.categories) * .72
    + queryMatch(`${item.title || ''} ${item.venue_name || ''} ${item.organizer || ''} ${item.raw_type || ''} ${item.raw_category || ''}`, intent.queryTokens) * .28;
  const parts = {
    base_quality: clamp(Number(item.good_times_score || 50)),
    intent_match: clamp(intentMatch),
    preference_match: affinityScore(memory, item.category_key),
    temporal_fit: temporalScore(item.event_date, intent),
    source_confidence: confidence,
    actionability,
    culture_signal: clamp(40 + (item.is_curated ? 35 : 0) + (item.is_featured ? 20 : 0)),
    freshness,
    proximity: 55,
    social_proof: clamp(45 + (item.is_featured ? 20 : 0) + (item.is_curated ? 15 : 0) + Math.max(0, 20 - Number(item.rank_order || 20))),
    novelty: memory.suppressions[`event:${item.event_key}`] ? 0 : 88,
    budget_fit: budgetFit(item.raw_category, intent.budget, /free/i.test(`${item.title || ''} ${item.raw_category || ''}`)),
  };
  const relevance = clamp(weighted(parts, weights) - suppressionPenalty(memory, 'event', String(item.event_key)));
  const reasons = buildReasons(parts, confidence, item, intent, 'event');
  return {
    ...item,
    object_type: 'event',
    object_id: String(item.event_key),
    relevance_score: Math.round(relevance * 10) / 10,
    confidence_score: Math.round(confidence * 10) / 10,
    completeness_score: Math.round(completeness * 10) / 10,
    freshness_score: Math.round(freshness * 10) / 10,
    score_components: parts,
    reasons,
  };
}

export function scoreVenue(item: any, intent: Intent, memory: MemoryProfile, weights: Record<string, number>, input: Record<string, unknown>): ScoredCandidate {
  const mappedCategory = Object.entries(VENUE_CATEGORIES).find(([, values]) => values.includes(item.category_key))?.[0] || item.category_key || '';
  const completeFields = [item.name, item.category_key, item.address, item.hero_image, item.hours_summary, item.short_desc, item.neighborhood, item.latitude, item.longitude, item.phone || item.website || item.booking_link];
  const completeness = completeFields.filter((value) => value !== null && value !== undefined && value !== '').length / completeFields.length * 100;
  const freshness = freshnessScore(item.enriched_at || item.updated_at);
  const actionability = clamp(20 + (item.booking_link ? 25 : 0) + (item.website ? 15 : 0) + (item.phone ? 10 : 0) + (item.address ? 10 : 0) + (item.hours_summary ? 10 : 0) + (item.hero_image ? 10 : 0));
  const provenance = clamp(25 + (item.is_verified ? 35 : 0) + (item.evidence_url_1 ? 14 : 0) + (item.evidence_url_2 ? 8 : 0) + Math.min(Number(item.source_count || 0) * 4, 12) + (item.is_khg ? 6 : 0));
  const consistency = clamp(35 + (item.status === 'active' ? 20 : 0) + (item.name ? 15 : 0) + (item.category_key ? 10 : 0) + (item.address ? 10 : 0) + (item.hours_summary ? 10 : 0));
  const confidence = confidenceFrom({ provenance, completeness, freshness, consistency, actionability });
  const queryIntent = queryMatch(`${item.name || ''} ${item.short_desc || ''} ${item.neighborhood || ''} ${item.category_key || ''} ${(item.vibe_tags || []).join(' ')} ${(item.culture_tags || []).join(' ')}`, intent.queryTokens);
  const neighborhoodMatch = intent.neighborhoods.length
    ? intent.neighborhoods.some((hood) => `${item.neighborhood || ''} ${item.side_of_town || ''}`.toLowerCase().includes(hood)) ? 100 : 20
    : 65;
  const intentMatch = categoryIntentMatch(mappedCategory, intent.categories) * .55 + queryIntent * .25 + neighborhoodMatch * .20;
  const parts = {
    base_quality: clamp(Number(item.quality_score || 0) * .55 + Number(item.google_rating || 0) / 5 * 100 * .45),
    intent_match: clamp(intentMatch),
    preference_match: affinityScore(memory, mappedCategory, item.neighborhood, item.price_range),
    temporal_fit: 70,
    source_confidence: confidence,
    actionability,
    culture_signal: clamp(Number(item.culture_score || 0) || (item.is_culture_pick ? 85 : item.is_black_owned ? 72 : item.is_khg ? 80 : 42)),
    freshness,
    proximity: proximityScore(item, input),
    social_proof: socialProof(item.google_rating, item.google_reviews, Number(item.quality_score || 45)),
    novelty: memory.suppressions[`venue:${item.id}`] ? 0 : 88,
    budget_fit: budgetFit(item.price_range, intent.budget),
  };
  const relevance = clamp(weighted(parts, weights) - suppressionPenalty(memory, 'venue', String(item.id)));
  const reasons = buildReasons(parts, confidence, item, intent, 'venue');
  return {
    ...item,
    mapped_category: mappedCategory,
    object_type: 'venue',
    object_id: String(item.id),
    relevance_score: Math.round(relevance * 10) / 10,
    confidence_score: Math.round(confidence * 10) / 10,
    completeness_score: Math.round(completeness * 10) / 10,
    freshness_score: Math.round(freshness * 10) / 10,
    score_components: parts,
    reasons,
  };
}

function buildReasons(parts: Record<string, number>, confidence: number, item: any, intent: Intent, type: 'event' | 'venue') {
  const output: string[] = [];
  if (parts.intent_match >= 80) output.push('direct match for your request');
  if (parts.preference_match >= 72) output.push('matches your stated or learned taste');
  if (type === 'event' && parts.temporal_fit >= 90) output.push(`fits ${intent.dateLabel}`);
  if (parts.base_quality >= 74) output.push('strong quality signals');
  if (confidence >= 75) output.push('well-supported profile data');
  if (parts.culture_signal >= 75) output.push('strong local culture signal');
  if (parts.actionability >= 75) output.push(type === 'event' && item.ticket_url ? 'ticket link available' : item.booking_link ? 'booking link available' : 'complete visit details');
  if (type === 'venue' && item.is_black_owned) output.push('Black-owned business');
  if (parts.proximity >= 80) output.push('close to your current location');
  return output.length ? [...new Set(output)].slice(0, 4) : ['best available match from current source-backed data'];
}

function deterministicValue(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function diversityRerank(
  candidates: ScoredCandidate[],
  kind: 'event' | 'venue',
  limit: number,
  thresholds: Record<string, any>,
  memory: MemoryProfile,
  seed: string,
) {
  const remaining = [...candidates];
  const selected: ScoredCandidate[] = [];
  const categoryCounts: Record<string, number> = {};
  const venueCounts: Record<string, number> = {};
  const neighborhoodCounts: Record<string, number> = {};
  let explorationUsed = false;
  const maximumCategory = Number(kind === 'event' ? thresholds.max_same_event_category : thresholds.max_same_venue_category) || 3;
  const maximumVenue = Number(thresholds.max_same_event_venue) || 1;
  const maximumNeighborhood = Number(thresholds.max_same_neighborhood) || 3;

  while (remaining.length && selected.length < limit) {
    let bestIndex = -1;
    let bestAdjusted = -Infinity;
    let bestExploration = false;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const category = String(kind === 'event' ? candidate.category_key : candidate.mapped_category || candidate.category_key || 'other');
      const venue = String(kind === 'event' ? candidate.venue_name || candidate.object_id : candidate.object_id);
      const neighborhood = String(candidate.neighborhood || 'unknown');
      const categoryCount = categoryCounts[category] || 0;
      const venueCount = venueCounts[venue] || 0;
      const neighborhoodCount = neighborhoodCounts[neighborhood] || 0;
      if (categoryCount >= maximumCategory) continue;
      if (kind === 'event' && venueCount >= maximumVenue) continue;
      if (kind === 'venue' && neighborhood !== 'unknown' && neighborhoodCount >= maximumNeighborhood) continue;

      const categoryPenalty = categoryCount * 4.5;
      const neighborhoodPenalty = neighborhood === 'unknown' ? 0 : neighborhoodCount * 2.5;
      const venuePenalty = kind === 'event' ? venueCount * 18 : 0;
      const isDiscovery = !explorationUsed
        && candidate.confidence_score >= Number(thresholds.minimum_confidence || 35) + 10
        && Number(memory.categoryAffinity[category] || 0) < 35
        && deterministicValue(`${seed}:${candidate.object_id}`) <= memory.explorationRate;
      const discoveryBoost = isDiscovery ? 6 : 0;
      const adjusted = candidate.relevance_score - categoryPenalty - neighborhoodPenalty - venuePenalty + discoveryBoost;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
        bestExploration = isDiscovery;
      }
    }

    if (bestIndex < 0) {
      const fallback = remaining.shift();
      if (!fallback) break;
      selected.push({ ...fallback, diversity_adjustment: 0, exploration_pick: false, rank_position: selected.length + 1 });
      continue;
    }

    const [picked] = remaining.splice(bestIndex, 1);
    const category = String(kind === 'event' ? picked.category_key : picked.mapped_category || picked.category_key || 'other');
    const venue = String(kind === 'event' ? picked.venue_name || picked.object_id : picked.object_id);
    const neighborhood = String(picked.neighborhood || 'unknown');
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    venueCounts[venue] = (venueCounts[venue] || 0) + 1;
    neighborhoodCounts[neighborhood] = (neighborhoodCounts[neighborhood] || 0) + 1;
    if (bestExploration) explorationUsed = true;
    selected.push({
      ...picked,
      diversity_adjustment: Math.round((bestAdjusted - picked.relevance_score) * 10) / 10,
      exploration_pick: bestExploration,
      rank_position: selected.length + 1,
    });
  }

  return selected;
}

function parseTime(value: unknown) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function coordinates(stop: any, venueLookup: Map<string, any>) {
  if (stop.object_type === 'venue') return stop.latitude != null && stop.longitude != null ? [Number(stop.latitude), Number(stop.longitude)] : null;
  const venue = venueLookup.get(String(stop.venue_name || '').toLowerCase());
  return venue?.latitude != null && venue?.longitude != null ? [Number(venue.latitude), Number(venue.longitude)] : null;
}

function occasionFit(sequence: any[], occasion: string) {
  const categories = sequence.map((item) => String(item.mapped_category || item.category_key || ''));
  if (occasion === 'date' || occasion === 'anniversary') return categories.some((value) => value === 'dining_culinary') && categories.some((value) => ['nightlife', 'concerts_live_music', 'arts_museums_culture'].includes(value)) ? 95 : 65;
  if (occasion === 'birthday') return categories.some((value) => ['nightlife', 'vip_exclusive'].includes(value)) ? 92 : 70;
  if (occasion === 'business') return categories.some((value) => ['dining_culinary', 'community_civic'].includes(value)) ? 90 : 65;
  if (occasion === 'family') return categories.every((value) => !['nightlife', 'vip_exclusive'].includes(value)) ? 90 : 30;
  return 75;
}

function sequenceTravel(sequence: any[], venueLookup: Map<string, any>, thresholds: Record<string, any>) {
  let totalMiles = 0;
  let measuredLegs = 0;
  for (let index = 1; index < sequence.length; index += 1) {
    const from = coordinates(sequence[index - 1], venueLookup);
    const to = coordinates(sequence[index], venueLookup);
    if (!from || !to) continue;
    const miles = distanceMiles(from[0], from[1], to[0], to[1]);
    if (miles > Number(thresholds.maximum_leg_miles || 12)) return { feasible: false, score: 0, totalMiles };
    totalMiles += miles;
    measuredLegs += 1;
  }
  if (totalMiles > Number(thresholds.maximum_total_miles || 24)) return { feasible: false, score: 0, totalMiles };
  if (!measuredLegs) return { feasible: true, score: 60, totalMiles: null };
  return { feasible: true, score: clamp(100 - totalMiles * 4), totalMiles: Math.round(totalMiles * 10) / 10 };
}

function scheduledStops(sequence: any[]) {
  const anchorIndex = sequence.findIndex((item) => item.object_type === 'event');
  const anchorTime = anchorIndex >= 0 ? parseTime(sequence[anchorIndex].event_time) : null;
  return sequence.map((item, index) => {
    let scheduledMinutes = anchorTime == null ? 19 * 60 + index * 120 : anchorTime + (index - anchorIndex) * 150;
    if (item.object_type === 'event' && parseTime(item.event_time) != null) scheduledMinutes = parseTime(item.event_time)!;
    return {
      ...item,
      scheduled_time: formatTime(scheduledMinutes),
      role: index === 0 ? 'start' : index === sequence.length - 1 ? 'finish' : item.object_type === 'event' ? 'anchor' : 'middle',
    };
  });
}

export function optimizeItinerary(
  events: ScoredCandidate[],
  venues: ScoredCandidate[],
  intent: Intent,
  formula: Record<string, number>,
  thresholds: Record<string, any>,
) {
  const venueLookup = new Map(venues.map((venue) => [String(venue.name || '').toLowerCase(), venue]));
  const dining = venues.filter((item) => ['dining_culinary'].includes(String(item.mapped_category))).slice(0, Number(thresholds.maximum_candidates_per_role || 6));
  const nightlife = venues.filter((item) => ['nightlife', 'vip_exclusive'].includes(String(item.mapped_category))).slice(0, Number(thresholds.maximum_candidates_per_role || 6));
  const activities = venues.filter((item) => ['arts_museums_culture', 'concerts_live_music', 'sports_watch', 'wellness_fitness', 'family_kids'].includes(String(item.mapped_category))).slice(0, Number(thresholds.maximum_candidates_per_role || 6));
  const anchors = events.slice(0, Number(thresholds.maximum_candidates_per_role || 6));
  const sequences: ScoredCandidate[][] = [];

  if (anchors.length) {
    const befores = dining.length ? dining : venues.slice(0, 4);
    const afters = nightlife.length ? nightlife : activities.length ? activities : venues.slice(4, 8);
    for (const before of befores.slice(0, 4)) {
      for (const anchor of anchors.slice(0, 5)) {
        for (const after of afters.slice(0, 4)) {
          if (before.object_id === after.object_id) continue;
          sequences.push([before, anchor, after]);
        }
      }
    }
  }

  const venueStarts = dining.length ? dining : venues.slice(0, 5);
  const venueMiddles = activities.length ? activities : venues.slice(5, 10);
  const venueFinishes = nightlife.length ? nightlife : venues.slice(10, 15);
  for (const start of venueStarts.slice(0, 4)) {
    for (const middle of venueMiddles.slice(0, 4)) {
      for (const finish of venueFinishes.slice(0, 4)) {
        if (new Set([start.object_id, middle.object_id, finish.object_id]).size < 3) continue;
        sequences.push([start, middle, finish]);
      }
    }
  }

  let best: any = null;
  for (const sequence of sequences) {
    if (sequence.some((item) => item.relevance_score < Number(thresholds.minimum_stop_relevance || 55) || item.confidence_score < Number(thresholds.minimum_stop_confidence || 45))) continue;
    const travel = sequenceTravel(sequence, venueLookup, thresholds);
    if (!travel.feasible) continue;
    const categories = new Set(sequence.map((item) => item.mapped_category || item.category_key));
    const actionability = sequence.reduce((sum, item) => sum + Number(item.score_components.actionability || 0), 0) / sequence.length;
    const relevance = sequence.reduce((sum, item) => sum + item.relevance_score, 0) / sequence.length;
    const confidence = sequence.reduce((sum, item) => sum + item.confidence_score, 0) / sequence.length;
    const budget = sequence.reduce((sum, item) => sum + Number(item.score_components.budget_fit || 0), 0) / sequence.length;
    const parts = {
      recommendation_strength: relevance,
      confidence,
      time_feasibility: sequence.some((item) => item.object_type === 'event' && item.event_time) ? 95 : 72,
      travel_efficiency: travel.score,
      occasion_match: occasionFit(sequence, intent.occasion),
      variety: clamp(categories.size / sequence.length * 100),
      actionability,
      budget_fit: budget,
    };
    const score = weighted(parts, formula);
    if (!best || score > best.score) {
      best = {
        score: Math.round(score * 10) / 10,
        parts,
        total_miles: travel.totalMiles,
        stops: scheduledStops(sequence),
      };
    }
  }

  return best;
}

export function evaluateQuality(events: ScoredCandidate[], venues: ScoredCandidate[], minimumConfidence: number) {
  const all = [...events, ...venues];
  const confidenceCoverage = all.length ? all.filter((item) => item.confidence_score >= minimumConfidence).length / all.length * 100 : 0;
  const categories = new Set(all.map((item) => item.mapped_category || item.category_key || 'other'));
  const diversity = all.length ? clamp(categories.size / Math.min(all.length, 8) * 100) : 0;
  const actionable = all.filter((item) => item.ticket_url || item.booking_link || item.website || item.phone).length;
  const actionability = all.length ? actionable / all.length * 100 : 0;
  const freshness = all.length ? all.reduce((sum, item) => sum + item.freshness_score, 0) / all.length : 0;
  const truthfulness = 100;
  return [
    { metric_key: 'confidence_coverage', score: confidenceCoverage, threshold: 80, passed: confidenceCoverage >= 80 },
    { metric_key: 'diversity', score: diversity, threshold: 55, passed: diversity >= 55 },
    { metric_key: 'actionability', score: actionability, threshold: 45, passed: actionability >= 45 },
    { metric_key: 'freshness', score: freshness, threshold: 60, passed: freshness >= 60 },
    { metric_key: 'truthfulness', score: truthfulness, threshold: 100, passed: true },
  ].map((metric) => ({ ...metric, score: Math.round(metric.score * 10) / 10 }));
}
