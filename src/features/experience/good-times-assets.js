import { KHG_SUPABASE_URL, khgF } from '../../lib/supabase.js'

export const GT_STORAGE_BASE = `${KHG_SUPABASE_URL}/storage/v1/object/public/brand-graphics`

export const GT_APPROVED_DEFAULTS = Object.freeze({
  motion: 'good_times/graphics/GOOD_TIMES_ANIMATION.mp4',
  home: 'good_times/graphics/GOODTIMES_HOMESCREEN.png',
  logo: 'good_times/graphics/GOOD_TIMES_logo.png',
})

export function gtAssetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${GT_STORAGE_BASE}/${String(path).split('/').map(encodeURIComponent).join('/')}`
}

let manifestPromise = null

export async function loadGoodTimesAssetManifest() {
  if (!manifestPromise) {
    manifestPromise = khgF('gt_asset_manifest?select=asset_key,asset_type,surface,city_key,category_key,venue_slug,storage_path,priority,metadata&approved=eq.true&is_active=eq.true&order=priority.asc,asset_key.asc')
      .then(rows => Array.isArray(rows) ? rows.map(row => ({ ...row, url: gtAssetUrl(row.storage_path) })) : [])
      .catch(() => [])
  }
  return manifestPromise
}

export function pickManifestAsset(rows, surface, predicate = () => true, fallbackPath = '') {
  const row = (rows || []).find(asset => asset.surface === surface && predicate(asset))
  return row?.url || gtAssetUrl(fallbackPath)
}

export function approvedVenueImage(rows, venue) {
  const slug = String(venue?.slug || venue?.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const direct = (rows || []).find(asset => asset.surface === 'places_that_matter' && asset.venue_slug && (asset.venue_slug === slug || slug.startsWith(asset.venue_slug) || asset.venue_slug.startsWith(slug)))
  return direct?.url || ''
}

export function safeCustomerImage(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  const blocked = [
    'maps.googleapis.com/maps/api/place/photo',
    'maps.gstatic.com',
    '/staticmap',
    'streetview',
    'GOODTIMES_SCREENS.png',
    'ChatGPT_Image_Feb_10_2026_03_52_56_AM.png',
    'ChatGPT_Image_Feb_10_2026_04_06_58_AM.png',
    'ChatGPT_Image_Feb_10_2026_04_10_54_AM.png',
  ]
  return blocked.some(token => value.includes(token)) ? '' : value
}
