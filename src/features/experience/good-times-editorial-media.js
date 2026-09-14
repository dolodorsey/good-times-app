/** GOOD TIMES editorial art is not venue photography. Never select by list position. */
const MEDIA_ROOT = 'https://dzlmtvodpyhetvektfuo.supabase.co/storage/v1/object/public'
const BRAND_FRAME = `${MEDIA_ROOT}/brand-graphics/motion/goodtimes.jpg`
const ATLANTA_SCREENS = Object.freeze({
  home: '/city-atlanta-nightlife.png',
  discover: '/city-atlanta.png',
  plan: '/city-atlanta-night.png',
  saved: '/city-atlanta.png',
  profile: '/city-atlanta-night.png',
  radar: '/city-atlanta-nightlife.png',
})
// Existing approved category art from gt_asset_manifest. These are category covers,
// never substituted into event or named-venue cards.
const CATEGORIES = Object.freeze({
  dining: { match: /^(restaurant|food|food_and_dining|dining_culinary|coffee|bakery|cafe)$/, cover: 'gt-cat-dining.webp' },
  nightlife: { match: /^(nightlife|nightclub|bar|wine_bar|rooftop|lounge)$/, cover: 'gt-cat-nightlife.webp' },
  'live music': { match: /^(concerts_live_music|live_music|music|concert|jazz)$/, cover: 'gt-cat-music.webp' },
  hotel: { match: /^(hotel|hotels|lodging|resort|staycation|travel_staycations|hotels_staycations)$/, cover: 'gt-bg-waterfront-venue.webp' },
  experience: { match: /^(attractions_experiences|entertainment|culture|arts_museums_culture|outdoor_adventures|family_kids)$/, cover: 'gt-cat-adventure.webp' },
})
const normalize = value => String(value || '').trim().toLowerCase().replace(/[ &/\-]+/g, '_')
const GENERIC_MEDIA = /images\.unsplash\.com|\/good-times-backgrounds\/(?:gt-cat-|event-)/i
function venuePhoto(value) {
  const raw = String(value || '').trim()
  if (!raw || GENERIC_MEDIA.test(raw)) return ''
  try {
    const url = new URL(raw, 'https://thegoodtimesworldwide.com')
    return url.protocol === 'https:' && !/["'()\\\n\r]/.test(raw) ? raw : ''
  } catch { return '' }
}
export function screenEditorialMedia(city, screen = 'home') {
  return normalize(city) === 'atlanta' ? ATLANTA_SCREENS[screen] || ATLANTA_SCREENS.home : BRAND_FRAME
}
export function categoryEditorialMedia(category, venues = [], city = '') {
  const config = CATEGORIES[category]
  if (!config) return BRAND_FRAME
  const matching = venues.find(venue => {
    const sameCity = normalize(venue.city_key || venue.city_slug) === normalize(city)
    return sameCity && config.match.test(normalize(venue.category_key)) && venuePhoto(venue.hero_image)
  })
  return matching ? venuePhoto(matching.hero_image) : `${MEDIA_ROOT}/good-times-backgrounds/${config.cover}`
}
