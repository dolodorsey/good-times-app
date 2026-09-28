import React, { useEffect, useState } from 'react'
import GoodTimesIcon from './GoodTimesIcon.jsx'
const safeMedia = value => {
  const raw = String(value || '')
  return (/^https:\/\//.test(raw) || /^\/(?!\/)/.test(raw)) && !/images\.unsplash\.com|city-atlanta|\/good-times-backgrounds\//i.test(raw) ? raw : null
}
export default function CompactVenueCard({ venue, saved, onOpen, onSave }) {
  const [failed, setFailed] = useState(false), [pending, setPending] = useState(false)
  useEffect(() => setFailed(false), [venue.hero_image])
  const media = !failed && safeMedia(venue.hero_image)
  const subtitle = [venue.neighborhood, venue.price_range].filter(Boolean).join(' · ')
  const kind = venue.venue_subcategory || venue.subcategory || venue.category_name || 'Place'
  const save = async event => { event.stopPropagation(); if (pending) return; setPending(true); try { await onSave() } finally { setPending(false) } }
  return <article className="gt5-card gt5-venue gt-compact-card" data-venue-id={venue.id}>
    <button type="button" className="gt-compact-card-open" onClick={onOpen} aria-label={`View ${venue.name}`}>
      <div className="gt-compact-card-media">{media ? <img src={media} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <div className="gt-compact-placeholder"><span>GT</span><small>Photo unavailable</small></div>}</div>
      <div className="gt-compact-card-copy"><small>{String(kind).replaceAll('_', ' ')}</small><h3>{venue.name}</h3><p>{subtitle || 'Atlanta'}</p><span className="gt-compact-card-link">Explore place <span aria-hidden="true">↗</span></span></div>
    </button>
    <button className={`gt5-save ${saved ? 'active' : ''}`} type="button" aria-label={`${saved ? 'Unsave' : 'Save'} ${venue.name}`} aria-pressed={Boolean(saved)} disabled={pending} onClick={save}><GoodTimesIcon glyph={saved ? '✓' : '♡'} /></button>
  </article>
}
