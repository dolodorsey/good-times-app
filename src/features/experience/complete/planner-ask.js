// Instant, deterministic answers for "Ask GOOD TIMES" from the verified feed already on the device.
// It only filters real listings by the words used — no generated places, ratings or claims.
import {unique,occurrenceUsable} from './model.js'
import {selectedCityClock,eventIsThisWeekend} from '../good-times-event-clock.js'
import {tonightOrNext} from './tonight.js'

const t = x => [x?.name, x?.title, x?.category_key, x?.venue_category_key, x?.subcategory, x?.venue_subcategory, x?.venue_name, ...(x?.vibe_tags || []), ...(x?.search_tags || [])].filter(Boolean).join(' ').toLowerCase()

const CLUBBY = v => /nightclub|strip|gentlem/.test(`${v?.venue_category_key || v?.category_key || ''} ${v?.venue_subcategory || v?.subcategory || ''}`.toLowerCase())
const RULES = [
  { label: 'Date night', when: /date|romantic|anniversary|bae|boo|special/, venue: v => !CLUBBY(v) && /date|romantic|intimate|upscale|rooftop|wine|steak|sushi|italian|french|cocktail|fine/.test(t(v)), event: e => ['comedy_performing_arts', 'concerts_live_music'].includes(e.category_key) },
  { label: 'Brunch', when: /brunch|mimosa|day ?party|daytime/, venue: v => /brunch/.test(t(v)), event: e => e.category_key === 'day_parties_brunch' },
  { label: 'Clubs', when: /club|turn ?up|party|lit\b|dance|\bdj\b|bottle/, venue: v => /nightclub/.test(`${v?.venue_category_key || v?.category_key || ''} ${v?.venue_subcategory || v?.subcategory || ''}`.toLowerCase()) && !/strip|gentlem/.test(t(v)), event: e => e.category_key === 'nightlife' },
  { label: 'Strip clubs', when: /strip|gentlem|magic city|onyx|blue flame/, venue: v => /strip|gentlem/.test(t(v)) },
  { label: 'Lounges & bars', when: /lounge|chill|drinks?|cocktail|\bbar\b|low.?key|wine/, venue: v => !/nightclub|strip|gentlem/.test(t(v)) && /lounge|\bbar\b|cocktail|wine|speakeasy/.test(t(v)) },
  { label: 'Hookah', when: /hookah|shisha/, venue: v => /hookah/.test(t(v)) },
  { label: 'Rooftop', when: /rooftop|roof|view|skyline/, venue: v => /rooftop|skyline|sky ?lounge|observation/.test(t(v)) },
  { label: 'Live music', when: /live music|concert|\bshow\b|jazz|r&b|rnb|hip.?hop|\brap\b/, venue: v => /jazz|live music/.test(t(v)), event: e => e.category_key === 'concerts_live_music' },
  { label: 'Comedy', when: /comedy|laugh|stand.?up/, venue: v => /comedy/.test(t(v)), event: e => e.category_key === 'comedy_performing_arts' },
  { label: 'Sports', when: /sports?|hawks|falcons|braves|atlanta united|dream|watch party|game day/, venue: v => /sports/.test(t(v)), event: e => e.category_key === 'sports_watch' },
  { label: 'Food', when: /\beat\b|food|dinner|lunch|hungry|restaurant|wings|seafood|steak|sushi|italian|mexican|soul|bbq|pizza|burger|thai|caribbean/, venue: v => !CLUBBY(v) && /restaurant|dining|food|brunch|steak|sushi|seafood|pizza|bbq|wings|grill|kitchen/.test(t(v)) },
  { label: 'Family', when: /kids?|family|children|toddler/, venue: v => /family|kids|children|playground|trampoline|zoo|aquarium|museum/.test(t(v)), event: e => e.category_key === 'family_kids' },
  { label: 'Holiday', when: /holiday|christmas|thanksgiving|santa|new year|nye|lights/, event: e => e.category_key === 'seasonal_holiday' || /christmas|holiday|thanksgiving|santa|new year|nutcracker|lights/i.test(e.title || '') },
  { label: 'Things to do', when: /fun|different|activity|activities|games?|bowling|arcade|golf|\bvr\b|immersive|museum|something to do/, venue: v => /entertainment|interactive|arcade|bowling|escape|immersive|museum|attraction|vr|golf|game/.test(t(v)), event: e => ['games_interactive', 'arts_museums_culture'].includes(e.category_key) },
]
const CUISINE = /(wings|seafood|steak|sushi|italian|mexican|soul|bbq|pizza|burger|thai|caribbean|jamaican|indian|chinese|japanese|korean|vegan)/
const AREAS = [['midtown', /\bmidtown\b/], ['buckhead', /buckhead/], ['downtown', /downtown/], ['west midtown', /west midtown|westside/], ['old fourth ward', /old fourth ward|o4w|beltline/], ['decatur', /decatur/], ['east atlanta', /east atlanta|eav/]]

/** Every word the guest used has to count: results must satisfy ALL the things asked for when anything does,
 *  and fall back to the best partial matches (most asks satisfied first) only when nothing satisfies all. */
export function askLocal(query, venues = [], events = [], now = Date.now()) {
  const q = String(query || '').toLowerCase()
  if (!q.trim()) return { venues: [], events: [], matched: false, understood: [] }
  const vs = unique(venues), es = unique(events).filter(e => occurrenceUsable(e, now))
  const rules = RULES.filter(r => r.when.test(q))
  const understood = rules.map(r => r.label)
  const vRules = rules.filter(r => r.venue), eRules = rules.filter(r => r.event)
  const hits = (x, rs, k) => rs.reduce((n, r) => n + (r[k](x) ? 1 : 0), 0)
  const base = x => Number(x.good_times_score ?? x.quality_score ?? 0) + (x.hero_image || x.image_url ? 20 : 0) + (Number(x.editorial_rank) > 0 ? 40 : 0) + (x.is_khg ? 60 : 0)
  let V = vRules.length ? vs.map(v => [v, hits(v, vRules, 'venue')]).filter(([, n]) => n > 0) : []
  const full = V.filter(([, n]) => n === vRules.length)
  const exact = full.length > 0
  if (exact) V = full
  let E = eRules.length ? es.filter(e => eRules.some(r => r.event(e))) : []
  const cuisine = q.match(CUISINE)?.[1]
  if (cuisine) { const narrowed = V.filter(([v]) => t(v).includes(cuisine)); if (narrowed.length) { V = narrowed; understood.push(cuisine[0].toUpperCase() + cuisine.slice(1)) } }
  const where = v => `${v.neighborhood || ''} ${v.venue_neighborhood || ''} ${v.address || ''} ${v.venue_address || ''}`.toLowerCase()
  const area = AREAS.find(([, re]) => re.test(q))
  if (area) { const nv = V.filter(([v]) => area[1].test(where(v))); if (nv.length) { V = nv; understood.push(area[0].replace(/\b\w/g, c => c.toUpperCase())) } }
  const c = selectedCityClock('atlanta', now)
  if (/tonight|right now|later/.test(q)) { const n = tonightOrNext(es, now).rows; E = E.length ? E.filter(e => n.includes(e)) : (vRules.length ? [] : n); understood.push('Tonight') }
  else if (/weekend|saturday|friday|sunday/.test(q)) { const w = es.filter(e => eventIsThisWeekend(e, 'atlanta', now)); E = E.length ? E.filter(e => w.includes(e)) : (vRules.length ? [] : w); understood.push('This weekend') }
  else if (/today/.test(q)) { E = E.filter(e => e.event_date === c.date); understood.push('Today') }
  const time = q.match(/\b(?:at|around|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
  if (time) understood.push(`${time[1]}${time[2] ? ':' + time[2] : ''} ${time[3].toUpperCase()}`)
  const outV = V.sort((a, b) => b[1] - a[1] || base(b[0]) - base(a[0])).slice(0, 8).map(([v]) => v)
  E = E.sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)) || base(b) - base(a)).slice(0, 8)
  return { venues: outV, events: E, matched: rules.length > 0 || Boolean(area) || E.length > 0, understood: [...new Set(understood)], exact: exact || !vRules.length }
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
