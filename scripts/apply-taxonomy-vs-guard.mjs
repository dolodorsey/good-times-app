import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const target = new URL('../api/data.js', import.meta.url)
const oldSports = "  if (/\\b(vs\\.?|versus|boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text)) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }"
const guardedSports = "  if (/\\b(boxing|ufc|mma|wrestling|fight night|home game|matchup)\\b/.test(text) || (/\\b(vs\\.?|versus)\\b/.test(text) && hasSportsSignal(text))) return { category:'sports_watch', subcategory:/boxing|ufc|mma|wrestling|fight/.test(text)?'combat_sports':fallbackSub || 'pro_home_games' }"
const concertAnchor = "  const concertSignal = rawType === 'concert' || /live music|music show|concert|symphony|dj set|night sets|\\br&b\\b|\\brnb\\b|hip hop|hip-hop|\\brap\\b|\\bjazz\\b|\\bgospel\\b|karaoke|open mic/.test(text)"
const dayPartyRule = "  if (/\\b(day party|rooftop day party)\\b/.test(text)) return { category:'day_parties_brunch', subcategory:'day_parties' }\n\n"

export function patchTaxonomySource(source) {
  let next = source
  if (next.includes(oldSports)) next = next.replace(oldSports, guardedSports)
  if (!next.includes(guardedSports)) throw new Error('GOOD TIMES taxonomy guard could not locate VS sports classifier')
  if (!next.includes(dayPartyRule.trim())) {
    if (!next.includes(concertAnchor)) throw new Error('GOOD TIMES taxonomy guard could not locate concert classifier')
    next = next.replace(concertAnchor, dayPartyRule + concertAnchor)
  }
  return next
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const before = fs.readFileSync(target, 'utf8')
  const after = patchTaxonomySource(before)
  if (after !== before) fs.writeFileSync(target, after)
  console.log('GOOD TIMES VS/day-party taxonomy guard applied.')
}
