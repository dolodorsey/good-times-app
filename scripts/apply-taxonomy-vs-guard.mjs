import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const target = new URL('../api/data.js', import.meta.url)
const oldSports = "  if (/\\b(vs\\.?|versus|boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text)) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }"
const guardedSports = "  if (/\\b(boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text) || (/\\b(vs\\.?|versus)\\b/.test(text) && hasSportsSignal(text))) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }"
const concertAnchor = "  const concertSignal = rawType === 'concert' || /live music|music show|concert|symphony|dj set|night sets|\\br&b\\b|\\brnb\\b|hip hop|hip-hop|\\brap\\b|\\bjazz\\b|\\bgospel\\b|karaoke|open mic/.test(text)"
const dayPartyRule = "  if (/\\b(day party|rooftop day party)\\b/.test(text)) return { category:'day_parties_brunch', subcategory:'day_parties' }\n\n"
const intentMarker = '// High-confidence intent rules beat noisy upstream event_type/category labels.'
const obviousIntentRules = `  ${intentMarker}\n  if (/farmers? (?:\\+|and )?artisans? market|farmers? market|artisan market|makers? market/.test(text)) return { category:'community_civic', subcategory:'markets' }\n  if (/mindful mondays?|sound bath|guided meditation|nervous system training/.test(text)) return { category:'wellness_fitness', subcategory:'wellness_events' }\n  if (/\\bzumba\\b|pilates|yoga class/.test(text)) return { category:'wellness_fitness', subcategory:'fitness_classes' }\n  if (/voice of the customer program|professional connections|business networking|career advancement|leadership program/.test(text)) return { category:'business_professional', subcategory:/networking|connections|career advancement/.test(text)?'professional_networking':'conferences_summits' }\n  if (/travel business owner|entrepreneurial skills|entrepreneur workshop/.test(text)) return { category:'business_professional', subcategory:'entrepreneurship' }\n  if (/dynamics 365 fundamentals/.test(text)) return { category:'business_professional', subcategory:'tech_startups' }\n  if (/money talks: the real return of sustainable partnerships/.test(text)) return { category:'business_professional', subcategory:'finance_investing' }\n  if (/handling challenging calls/.test(text)) return { category:'classes_workshops', subcategory:'professional_development' }\n  if (/stadium tours?|arena tours?|black atlanta bus tour/.test(text)) return { category:'attractions_experiences', subcategory:'tours_sightseeing' }\n  if (/exploring atlanta'?s flavors.*food tour/.test(text)) return { category:'dining_culinary', subcategory:'tastings' }\n  if (/creative industry mixer/.test(text)) return { category:'creative_creator', subcategory:'creator_meetups' }\n  if (/ballistic bingo|\\bbingo nights?\\b/.test(text)) return { category:'games_interactive', subcategory:'game_nights' }\n  if (/skating .*family session|family skating|adult skating session/.test(text)) return { category:'family_kids', subcategory:'family_festivals' }\n\n`

export function patchTaxonomySource(source) {
  let next = source
  if (next.includes(oldSports)) next = next.replace(oldSports, guardedSports)
  if (!next.includes(guardedSports)) throw new Error('GOOD TIMES taxonomy guard could not locate VS sports classifier')
  if (!next.includes(dayPartyRule.trim())) {
    if (!next.includes(concertAnchor)) throw new Error('GOOD TIMES taxonomy guard could not locate concert classifier')
    next = next.replace(concertAnchor, dayPartyRule + concertAnchor)
  }
  const markerIndex = next.indexOf(intentMarker)
  if (markerIndex >= 0) {
    const blockStart = next.lastIndexOf('  //', markerIndex)
    const blockEnd = next.indexOf(concertAnchor, markerIndex)
    if (blockStart < 0 || blockEnd < 0) throw new Error('GOOD TIMES taxonomy intent block moved')
    next = `${next.slice(0,blockStart)}${obviousIntentRules}${next.slice(blockEnd)}`
  } else {
    if (!next.includes(concertAnchor)) throw new Error('GOOD TIMES taxonomy guard could not locate intent-rule anchor')
    next = next.replace(concertAnchor, obviousIntentRules + concertAnchor)
  }
  return next
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const before = fs.readFileSync(target, 'utf8')
  const after = patchTaxonomySource(before)
  if (after !== before) fs.writeFileSync(target, after)
  console.log('GOOD TIMES VS/day-party/high-confidence taxonomy guards applied.')
}
