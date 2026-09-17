import { validClock } from './event-time-display.js'

const normalized = value => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/&amp;/g, '&').replace(/&#39;|&#8217;|&apos;/g, "'")
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0

/** A ticket URL identifies a destination, not necessarily one performance. */
export function occurrenceKey(item = {}, index = 0) {
  const title = normalized(item.event_name ?? item.title)
  const venue = normalized(item.venue_name)
  const date = String(item.show_date ?? item.event_date ?? '')
  const city = normalized(item.city_key)
  const start = validClock(item.show_time ?? item.performance_time ?? item.event_time)
  const doors = validClock(item.doors_time)
  const time = start ? `show:${start}` : doors ? `doors:${doors}` : null
  // Do not merge incomplete rows on a shared link or a guessed time.
  if (!title || !venue || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) {
    return JSON.stringify(['record', city, item.id ?? item.source_id ?? item.event_key ?? index])
  }
  return JSON.stringify(['occurrence', city, title, venue, date, time])
}
function recordScore(item) {
  return numeric(item.good_times_score) * 10 - numeric(item.display_priority ?? 50)
    + (item.is_curated ? 20 : 0) + (item.is_featured ? 12 : 0)
    + (validClock(item.show_time) ? 6 : 0) + (item.organizer ? 4 : 0)
    + (item.subcategory_key_v2 ? 3 : 0)
}
export function dedupeEventOccurrences(rows = []) {
  const best = new Map()
  rows.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const key = occurrenceKey(item, index)
    const previous = best.get(key)
    if (!previous || recordScore(item) > recordScore(previous)) best.set(key, item)
  })
  return [...best.values()].sort((a, b) => recordScore(b) - recordScore(a)
    || String(a.show_date ?? a.event_date ?? '').localeCompare(String(b.show_date ?? b.event_date ?? '')))
}

/** Separate fallback payloads for different requested result limits. */
export function inventoryCacheKey(city, serviceDate, eventLimit, venueLimit) {
  return JSON.stringify([city, serviceDate, eventLimit, venueLimit])
}
