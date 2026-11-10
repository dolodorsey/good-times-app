// Instant, deterministic answers for "Ask GOOD TIMES" from the verified feed already on the device.
// It only filters real listings by the words used — no generated places, ratings or claims.
import {unique,occurrenceUsable} from './model.js'
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {tonightOrNext} from './tonight.js'

const t = x => [x?.name, x?.title, x?.category_key, x?.venue_category_key, x?.subcategory, x?.venue_subcategory, x?.venue_name, ...(x?.vibe_tags || []), ...(x?.search_tags || [])].filter(Boolean).join(' ').toLowerCase()

const RULES = [
  { when: /date|romantic|anniversary|bae|boo|special/, venue: v => /date|romantic|intimate|upscale|rooftop|wine|steak|sushi|italian|french|cocktail/.test(t(v)) || ['$$$', '$$$$'].includes(v.price_range), event: e => ['comedy_performing_arts', 'concerts_live_music'].includes(e.category_key) },
  { when: /brunch|mimosa|day ?party|daytime/, venue: v => /brunch/.test(t(v)), event: e => e.category_key === 'day_parties_brunch' },
  { when: /club|turn ?up|party|lit|dance|dj|bottle/, venue: v => /nightclub|\bclub\b/.test(t(v)) && !/strip|gentlem/.test(t(v)), event: e => e.category_key === 'nightlife' },
  { when: /strip|gentlem|magic city|onyx|blue flame/, venue: v => /strip|gentlem/.test(t(v)) },
  { when: /lounge|hookah|chill|drinks?|cocktail|bar|low.?key|wine/, venue: v => /lounge|hookah|\bbar\b|cocktail|wine|speakeasy/.test(t(v)) },
  { when: /rooftop|view|skyline/, venue: v => /rooftop|view/.test(t(v)) },
  { when: /live music|concert|show|jazz|r&b|rnb|hip.?hop|rap/, venue: v => /jazz|live music/.test(t(v)), event: e => e.category_key === 'concerts_live_music' },
  { when: /comedy|laugh|stand.?up/, event: e => e.category_key === 'comedy_performing_arts' },
  { when: /sports?|hawks|falcons|braves|atlanta united|dream|watch party|game day/, venue: v => /sports/.test(t(v)), event: e => e.category_key === 'sports_watch' },
  { when: /eat|food|dinner|hungry|restaurant|wings|seafood|steak|sushi|italian|mexican|soul|bbq|pizza|burger|thai|caribbean/, venue: v => /restaurant|dining|food|brunch|steak|sushi|seafood|pizza|bbq|wings|grill|kitchen/.test(t(v)) },
  { when: /fun|different|activity|activities|games?|bowling|arcade|golf|vr|immersive|museum|something to do/, venue: v => /entertainment|interactive|arcade|bowling|escape|immersive|museum|attraction|vr|golf|game/.test(t(v)), event: e => ['games_interactive', 'arts_museums_culture'].includes(e.category_key) },
]
const CUISINE = /(wings|seafood|steak|sushi|italian|mexican|soul|bbq|pizza|burger|thai|caribbean|jamaican|indian|chinese|japanese|korean|vegan)/

export function askLocal(query, venues = [], events = [], now = Date.now()) {
  const q = String(query || '').toLowerCase()
  if (!q.trim()) return { venues: [], events: [], matched: false }
  const vs = unique(venues), es = unique(events).filter(e => occurrenceUsable(e, now))
  const rules = RULES.filter(r => r.when.test(q))
  let V = rules.some(r => r.venue) ? vs.filter(v => rules.some(r => r.venue?.(v))) : []
  let E = rules.some(r => r.event) ? es.filter(e => rules.some(r => r.event?.(e))) : []
  const cuisine = q.match(CUISINE)?.[1]
  if (cuisine) { const narrowed = V.filter(v => t(v).includes(cuisine)); if (narrowed.length) V = narrowed }
  // Neighborhood words narrow results when they match real neighborhoods in the feed.
  const hoods = [...new Set(vs.map(v => String(v.neighborhood || '').trim()).filter(n => n.length > 3))]
  const hood = hoods.find(n => q.includes(n.toLowerCase()))
  if (hood) { const nv = V.filter(v => String(v.neighborhood || '').toLowerCase().includes(hood.toLowerCase())); if (nv.length) V = nv }
  const c = selectedCityClock('atlanta', now)
  if (/tonight|right now|later/.test(q)) { const n = tonightOrNext(es, now).rows; E = E.length ? E.filter(e => n.includes(e)) : n }
  else if (/weekend|saturday|friday|sunday/.test(q)) { const w = es.filter(e => eventIsThisWeekend(e, 'atlanta', now)); E = E.length ? E.filter(e => w.includes(e)) : w }
  else if (/today/.test(q)) E = E.filter(e => e.event_date === c.date)
  const score = x => Number(x.good_times_score ?? x.quality_score ?? 0) + (x.hero_image || x.image_url ? 20 : 0) + (Number(x.editorial_rank) > 0 ? 40 : 0)
  V = V.sort((a, b) => score(b) - score(a)).slice(0, 8)
  E = E.sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)) || score(b) - score(a)).slice(0, 8)
  return { venues: V, events: E, matched: rules.length > 0 || Boolean(hood) || E.length > 0 }
}

export const ASK_PROMPTS = [
  'Date night in Midtown',
  'Turn up tonight',
  'Brunch this weekend',
  'Chill lounge with hookah',
  'Rooftop drinks',
  'Live music tonight',
  'Something different to do',
  'Best wings in Atlanta',
]
