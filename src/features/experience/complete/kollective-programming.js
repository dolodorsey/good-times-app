// "From The Kollective" home rail.
// Events are NOT defined here: they are real gt_shows inventory synced from the
// official Kollective Eventbrite listings (public.gt_house_listings →
// gt-house-eventbrite-sync) and arrive in the live feed like every other event.
// The rail only selects them from the feed by their source.
// Programs below are ongoing brands, not dated or ticketed events, so they have
// no gt_shows row; they link to their own sites.

export const HOUSE_SOURCE = 'Kollective Hospitality · Official Eventbrite'

export const KOLLECTIVE_PROGRAMS = [
  {key:'american-track-field',title:'American Track & Field',kicker:'NOW LAUNCHED',line:'Opening day May 8, 2027',cta:'Explore ATF',url:'https://americantnf.com',image:'https://americantnf.com/atf/atf-02.webp'},
  {key:'sole-exchange',title:'Sole Exchange',kicker:'SHOE DRIVE',line:'Ongoing community shoe drive',cta:'Learn More',url:'https://soleexchangeworldwide.com',image:'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public/brand-graphics/websites/graphics/SOLE_EXCHANGE_WEBSITE/ChatGPT_Image_Jul_30_2026_02_35_07_AM_1_.png'},
]

// Kollective events outside Atlanta (Dr. Dorsey's DC slate) come from /api/house, not the Atlanta
// feed, so they never mix into Atlanta's Tonight/Weekend lanes. The rail shows them with their city.
export const ACCESS_LABELS = {invite_only:'INVITE ONLY',tickets_pending:'TICKETS SOON',free_rsvp:'FREE',tickets:null}
export const ACCESS_CTA = {free_rsvp:'Free RSVP',tickets:'Get Tickets'}

export function otherCityHouseEvents(events = []) {
  return houseEvents((Array.isArray(events) ? events : []).filter(e => e?.city_key && e.city_key !== 'atlanta').map(e => ({...e, source_name: HOUSE_SOURCE})))
}

const seriesKey = event => String(event?.city_key || '') + ':' + String(event?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** House events from the live feed: next upcoming occurrence per series, in date/time order. */
export function houseEvents(events = []) {
  const bySeries = new Map()
  for (const event of events) {
    if (event?.source_name !== HOUSE_SOURCE) continue
    const key = seriesKey(event)
    const current = bySeries.get(key)
    const stamp = `${event.event_date || ''}T${event.event_time || '99:99'}`
    if (!current || stamp < `${current.event_date || ''}T${current.event_time || '99:99'}`) bySeries.set(key, event)
  }
  return [...bySeries.values()].sort((a, b) => `${a.event_date}T${a.event_time || '99:99'}`.localeCompare(`${b.event_date}T${b.event_time || '99:99'}`))
}
