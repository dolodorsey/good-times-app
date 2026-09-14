/** GOOD TIMES event-calendar rules. No UI, inventory, or reservation-state mutation. */
export const CITY_TIMEZONES = Object.freeze({
  atlanta:'America/New_York', charlotte:'America/New_York', miami:'America/New_York',
  new_york:'America/New_York', washington_dc:'America/New_York',
  houston:'America/Chicago', dallas:'America/Chicago',
  los_angeles:'America/Los_Angeles', las_vegas:'America/Los_Angeles',
  phoenix:'America/Phoenix', scottsdale:'America/Phoenix',
})
// Product convention: the night runs 18:00–04:00 in the selected city.
// This identifies a scheduled night, never proves OPEN NOW or availability.
export const NIGHT_START_MINUTE = 18 * 60
export const NIGHT_END_MINUTE = 4 * 60
const DAY = 86400000
const formatters = new Map()
const normalize = value => String(value || '').toLowerCase().trim().replace(/[\s-]+/g, '_')
const cityKey = value => ({nyc:'new_york',new_york_city:'new_york',vegas:'las_vegas',dc:'washington_dc',washington:'washington_dc'}[normalize(value)] || normalize(value))

export function dateNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const n = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10) !== value) return null
  return n / DAY
}
const isoDate = n => new Date(n * DAY).toISOString().slice(0,10)
export function timeMinutes(value) {
  const m = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/)
  if (!m || +m[1] > 23 || +m[2] > 59 || (m[3] && +m[3] > 59)) return null
  return +m[1] * 60 + +m[2]
}
export function selectedCityClock(city, now = Date.now()) {
  const key = cityKey(city), timeZone = CITY_TIMEZONES[key]
  const instant = new Date(now)
  if (!timeZone || !Number.isFinite(instant.getTime())) return null
  if (!formatters.has(timeZone)) formatters.set(timeZone,new Intl.DateTimeFormat('en-US',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }))
  const parts = Object.fromEntries(formatters.get(timeZone).formatToParts(instant).map(p=>[p.type,p.value]))
  const date = `${parts.year}-${parts.month}-${parts.day}`, day = dateNumber(date)
  const minute = +parts.hour * 60 + +parts.minute
  const serviceDay = day - (minute < NIGHT_END_MINUTE ? 1 : 0)
  return {city:key,timeZone,date,day,minute,serviceDay,serviceDate:isoDate(serviceDay),wallMinute:day*1440+minute}
}
function eventFacts(event, city, now) {
  const clock = selectedCityClock(city || event?.city_key,now)
  if (!clock || (event?.city_key && cityKey(event.city_key) !== clock.city)) return null
  const day = dateNumber(event?.event_date ?? event?.show_date)
  if (day === null) return null
  const startMinute = timeMinutes(event?.event_time ?? event?.show_time)
  const endMinute = timeMinutes(event?.event_end_time ?? event?.end_time)
  const explicitEnd = event?.event_end_date ?? event?.end_date
  let endDay = explicitEnd ? dateNumber(explicitEnd) : day
  // A documented end earlier than its start denotes a next-calendar-day end.
  if (!explicitEnd && startMinute !== null && endMinute !== null && endMinute < startMinute) endDay++
  const start = startMinute === null ? null : day*1440+startMinute
  const end = endMinute === null || endDay === null ? null : endDay*1440+endMinute
  if (explicitEnd && endDay === null) return null
  if (end !== null && start !== null && end <= start) return null
  return {clock,day,startMinute,start,end}
}
function unavailable(event) {
  return /cancel|sold[ _-]?out|postpon|ended|expired/i.test(`${event?.ticket_status || ''} ${event?.status || ''}`)
}
function ended(f) {
  if (f.end !== null) return f.clock.wallMinute >= f.end
  // Do not invent overnight duration for last-calendar-day events without an end.
  return f.day < f.clock.day
}
export function eventIsTonight(event,city = event?.city_key,now = Date.now()) {
  const f = eventFacts(event,city,now)
  if (!f || unavailable(event) || f.start === null || ended(f)) return false
  const from = f.clock.serviceDay*1440+NIGHT_START_MINUTE
  const until = (f.clock.serviceDay+1)*1440+NIGHT_END_MINUTE
  if (f.start >= from && f.start < until) return true
  // A daytime event may cross into tonight only with a documented end time.
  return f.start < from && f.end !== null && f.end > from && f.end > f.clock.wallMinute
}
export function eventIsToday(event,city = event?.city_key,now = Date.now()) {
  const f = eventFacts(event,city,now)
  return Boolean(f && !unavailable(event) && !ended(f) && f.day === f.clock.day)
}
export function eventIsThisWeekend(event,city = event?.city_key,now = Date.now()) {
  const f = eventFacts(event,city,now)
  if (!f || unavailable(event) || ended(f)) return false
  const dow = new Date(f.clock.serviceDay*DAY).getUTCDay()
  const friday = f.clock.serviceDay + (dow === 0 ? -2 : 5-dow)
  return f.day >= friday && f.day <= friday+2
}
export function eventDaysAway(value,city,now = Date.now()) {
  const day = dateNumber(value), clock = selectedCityClock(city,now)
  return day === null || !clock ? 999 : day-clock.day
}
export function eventStatus(event,city = event?.city_key,now = Date.now()) {
  const text = `${event?.ticket_status || ''} ${event?.status || ''}`.toLowerCase()
  if (text.includes('cancel')) return 'CANCELLED'
  if (text.includes('postpon')) return 'POSTPONED'
  const f = eventFacts(event,city,now)
  if (f && ended(f)) return 'ENDED'
  if (/sold[ _-]?out/.test(text)) return 'SOLD OUT'
  if (text.includes('fast') || event?.selling_fast) return 'SELLING FAST'
  if (text.includes('presale')) return 'PRESALE'
  if (eventIsTonight(event,city,now)) return 'TONIGHT'
  if (eventIsToday(event,city,now)) return 'TODAY'
  if (event?.announced_at || event?.is_new) return 'NEW'
  return event?.is_featured ? 'GT PICK' : 'CURATED'
}
