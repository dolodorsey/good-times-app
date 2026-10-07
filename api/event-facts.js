import { validClock } from './event-time-display.js'

// One explicit projection for browse, saved hydration, and the legacy gateway.
// The live-inventory RPC must retain the same facts in its gt_shows JSON rows.
export const SHOW_PUBLIC_FIELDS = [
  'id','city_key','artist_id','venue_id','event_name','event_type','genre',
  'show_date','show_time','doors_time','end_date','end_time','timezone',
  'venue_name','venue_address','image_url','ticket_url','ticket_price_min','ticket_price_max',
  'is_free','free_status','admission_type','currency','price_basis','is_sold_out',
  'age_requirement','age_requirement_verified_at','description','organizer','source','source_url',
  'status','quality_score','good_times_score','display_priority','is_featured','is_curated',
  'category_key_v2','subcategory_key_v2','freshness_tier','fact_verified_at','valid_until',
  'provider_occurrence_id','updated_at',
].join(',')

const FREE_STATES = new Set(['verified_free','verified_paid','conditional_free','unknown'])
const nullable = value => value === undefined || value === '' ? null : value
const booleanFact = value => typeof value === 'boolean' ? value : null
const validTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
function priceFact(value) {
  if (!['number','string'].includes(typeof value) || String(value).trim() === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

/** Preserve source facts without converting inherited defaults into verified claims. */
export function eventFacts(item = {}) {
  const freeStatus = FREE_STATES.has(item.free_status) ? item.free_status : 'unknown'
  const age = nullable(item.age_requirement)
  const inheritedAge = typeof age === 'string' && age.replace(/\s/g, '') === '18+'
  const endDate = nullable(item.end_date ?? item.event_end_date)
  const endTimeRaw = nullable(item.end_time ?? item.event_end_time)
  const endTime = validClock(endTimeRaw)
  return {
    id: nullable(item.id),
    venue_id: nullable(item.venue_id),
    venue_address: nullable(item.venue_address),
    artist_id: nullable(item.artist_id),
    event_end_date: endDate,
    event_end_time: endTime,
    end_date: endDate,
    end_time: endTime,
    show_time_raw: nullable(item.show_time),
    doors_time_raw: nullable(item.doors_time),
    end_time_raw: endTimeRaw,
    timezone: nullable(item.timezone),
    ticket_price_min: priceFact(item.ticket_price_min),
    ticket_price_max: priceFact(item.ticket_price_max),
    currency: nullable(item.currency),
    price_basis: nullable(item.price_basis),
    admission_type: nullable(item.admission_type),
    // A default false or a zero/from price does not establish the admission policy.
    is_free: freeStatus === 'verified_free' ? true : freeStatus === 'verified_paid' ? false : null,
    is_free_raw: booleanFact(item.is_free),
    free_status: freeStatus,
    is_sold_out: booleanFact(item.is_sold_out),
    status: nullable(item.status),
    age_requirement: inheritedAge && !validTimestamp(item.age_requirement_verified_at) ? null : age,
    age_requirement_raw: age,
    age_requirement_verified_at: nullable(item.age_requirement_verified_at),
    fact_verified_at: nullable(item.fact_verified_at),
    valid_until: nullable(item.valid_until),
    provider_occurrence_id: nullable(item.provider_occurrence_id),
  }
}
