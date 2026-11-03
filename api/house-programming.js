// Kollective-owned programming (the founder's own events).
// Rows come from public.gt_house_listings via the gt-house-eventbrite-sync worker,
// which re-verifies each official Kollective Eventbrite listing every 4 hours.
// Their venues may be unannounced: the venue is never invented, it is shown as
// "Venue TBA" until the official listing publishes one. This exception applies
// only to rows from the house source; every other event still needs a real venue.
export const HOUSE_SOURCE = 'Kollective Hospitality · Official Eventbrite'
export const HOUSE_VENUE_TBA = 'Venue TBA'

export function isHouseRow(row) {
  return String(row?.source || '') === HOUSE_SOURCE
}

export function houseVenueTba(row) {
  return isHouseRow(row) && !String(row?.venue_name || '').trim()
}

/**
 * Apply a payload limit without cutting house programming: every house row is kept
 * (they are few and owner-featured) and the remaining slots go to other rows in the
 * existing order. Order is preserved; the total never exceeds the limit unless the
 * house rows alone do.
 */
export function limitKeepingHouse(rows, limit, isHouse = row => row?.source_name === HOUSE_SOURCE) {
  if (!Array.isArray(rows) || rows.length <= limit) return rows
  const houseCount = rows.filter(isHouse).length
  let otherSlots = Math.max(limit - houseCount, 0)
  return rows.filter(row => isHouse(row) || otherSlots-- > 0)
}

/** Present an unannounced house venue as "Venue TBA"; all other rows pass through unchanged. */
export function withHouseVenue(row) {
  return houseVenueTba(row) ? { ...row, venue_name: HOUSE_VENUE_TBA, venue_address: null, venue_tba: true } : row
}
