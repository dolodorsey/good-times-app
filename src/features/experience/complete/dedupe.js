// One appearance per thing per screen. A show with several dates (comedy runs, two Hawks–Hornets games) is one card
// that opens on its next date; the same event or venue is never repeated across rails on the same screen.
import {identity} from './model.js'

const BRANCH = /\s*[\(\[][^)\]]*[\)\]]\s*$/
export const titleKey = row => String(row?.title || row?.event_name || row?.name || '')
  .toLowerCase().replace(BRANCH, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()

/** Keeps the first row for each title (rows should already be in date / rank order). */
export function collapseByTitle(rows = []) {
  const seen = new Set()
  return (Array.isArray(rows) ? rows : []).filter(r => {
    const k = titleKey(r) || identity(r)
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Screen-level claim: takes rows not yet used on this screen, marks them used, returns up to `limit`. */
export function claim(rows = [], used, limit = Infinity) {
  const out = []
  for (const r of Array.isArray(rows) ? rows : []) {
    const k = titleKey(r) || identity(r)
    if (!k || used.has(k)) continue
    used.add(k)
    out.push(r)
    if (out.length >= limit) break
  }
  return out
}

/** Same photo never shown twice on one screen: drops later rows whose image is already on screen. */
export function imageKey(url) {
  return String(url || '').split('?')[0].replace(/\/+$/, '').toLowerCase()
}

/** One card per show: keeps the earliest row for each title + venue and records how many later dates it has. */
export function collapseShows(rows = []) {
  const first = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const k = `${titleKey(r)}|${String(r?.venue_name || '').toLowerCase().trim()}`
    if (!titleKey(r)) { first.set(identity(r), { row: r, more: 0 }); continue }
    const hit = first.get(k)
    if (hit) hit.more += 1
    else first.set(k, { row: r, more: 0 })
  }
  return [...first.values()].map(({ row, more }) => (more ? { ...row, more_dates: more } : row))
}
