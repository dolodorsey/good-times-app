import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { loadShakeRestaurants, recordProductEvent, recordTasteSignal } from '../intelligence/client.js'

const CUISINES = ['steakhouse','seafood','italian','mexican','caribbean','sushi','asian','soul food','vegan','brunch','coffee']
const VIBES = ['date night','upscale','casual','romantic','rooftop','late night','groups','hidden gem','live music']

function haystack(venue) {
  return [venue.subcategory, venue.short_desc, ...(venue.vibe_tags || []), ...(venue.best_for || []), ...(venue.search_tags || []), ...(venue.culture_tags || []), ...(venue.shake_tags || []), ...(venue.amenity_tags || []), ...(venue.dietary_tags || []), ...(venue.ownership_tags || [])].filter(Boolean).join(' ').toLowerCase()
}

function distanceMiles(a, b) {
  if (!a || !b || a.latitude == null || a.longitude == null) return null
  const rad = value => Number(value) * Math.PI / 180
  const dLat = rad(Number(a.latitude) - Number(b.latitude))
  const dLon = rad(Number(a.longitude) - Number(b.longitude))
  const lat1 = rad(Number(b.latitude))
  const lat2 = rad(Number(a.latitude))
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function weightedPick(rows) {
  if (!rows.length) return null
  const weighted = rows.map(row => {
    const quality = Math.max(0.3, Number(row.quality_score || 50) / 100)
    const culture = Math.max(0.4, Number(row.culture_score || 50) / 100)
    const editorial = Math.max(0.25, Number(row.shake_weight || 1))
    return { row, weight: quality * 0.55 + culture * 0.25 + editorial * 0.2 }
  })
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  let cursor = Math.random() * total
  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) return item.row
  }
  return weighted.at(-1)?.row || rows[0]
}

export default function ShakeRestaurantPanel({ city, cityName, session, onOpen }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cuisine, setCuisine] = useState('')
  const [price, setPrice] = useState('')
  const [vibe, setVibe] = useState('')
  const [blackOwned, setBlackOwned] = useState(false)
  const [reservations, setReservations] = useState(false)
  const [distance, setDistance] = useState('')
  const [location, setLocation] = useState(null)
  const [motionReady, setMotionReady] = useState(false)
  const [status, setStatus] = useState('Shake your phone or tap Pick for me.')
  const historyRef = useRef([])
  const lastShakeRef = useRef(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    loadShakeRestaurants(city, { limit: 240 }).then(data => {
      if (active) setRows(data || [])
    }).catch(() => {
      if (active) setStatus('Restaurant picks are temporarily unavailable.')
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [city])

  const filtered = useMemo(() => rows.filter(venue => {
    const text = haystack(venue)
    if (cuisine && !text.includes(cuisine)) return false
    if (price && venue.price_range !== price) return false
    if (vibe && !text.includes(vibe)) return false
    if (blackOwned && !venue.is_black_owned && !(venue.ownership_tags || []).includes('black_owned')) return false
    if (reservations && !venue.reservation_req && !venue.booking_link) return false
    if (distance && location) {
      const miles = distanceMiles(venue, location)
      if (miles == null || miles > Number(distance)) return false
    }
    return true
  }), [rows, cuisine, price, vibe, blackOwned, reservations, distance, location])

  const pick = async source => {
    if (rolling || loading) return
    const history = new Set(historyRef.current.slice(-8))
    let pool = filtered.filter(venue => !history.has(venue.id))
    if (!pool.length) pool = filtered
    if (!pool.length) {
      setStatus('No restaurants match those filters. Remove one and shake again.')
      return
    }
    setRolling(true)
    setStatus('GOOD TIMES is choosing…')
    try { await Haptics.impact({ style: ImpactStyle.Medium }) } catch {}
    window.setTimeout(async () => {
      const chosen = weightedPick(pool)
      historyRef.current = [...historyRef.current, chosen.id].slice(-12)
      setResult(chosen)
      setRolling(false)
      setStatus('This is the move.')
      try { await Haptics.impact({ style: ImpactStyle.Heavy }) } catch {}
      recordProductEvent({ eventName: 'shake_restaurant_result', surface: 'shake', objectType: 'venue', objectId: chosen.id, city, properties: { source, cuisine, price, vibe, black_owned: blackOwned, reservations, distance_miles: distance || null, candidate_count: pool.length } }, session)
      recordTasteSignal({ entityType: 'venue', entityId: chosen.id, signalType: 'shake_result', city, metadata: { cuisine, price, vibe } }, session)
    }, 650)
  }

  const enableMotion = async () => {
    try {
      if (typeof DeviceMotionEvent === 'undefined') {
        setStatus('Motion sensing is unavailable here. Tap Pick for me instead.')
        return
      }
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission()
        if (permission !== 'granted') throw new Error('permission denied')
      }
      setMotionReady(true)
      setStatus('Shake is on. Give your phone a shake.')
    } catch {
      setStatus('Motion permission was not enabled. Tap Pick for me anytime.')
    }
  }

  useEffect(() => {
    if (!motionReady) return undefined
    const listener = event => {
      const acc = event.accelerationIncludingGravity || event.acceleration
      if (!acc) return
      const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2)
      const now = Date.now()
      if (magnitude > 22 && now - lastShakeRef.current > 1400) {
        lastShakeRef.current = now
        pick('motion')
      }
    }
    window.addEventListener('devicemotion', listener)
    return () => window.removeEventListener('devicemotion', listener)
  })

  const requestLocation = () => {
    if (!navigator.geolocation) return setStatus('Location is unavailable on this device.')
    navigator.geolocation.getCurrentPosition(position => {
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      setStatus('Distance filtering is ready.')
    }, () => setStatus('Location was not enabled. You can keep using city-wide picks.'), { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 })
  }

  const reject = () => {
    if (!result) return
    recordTasteSignal({ entityType: 'venue', entityId: result.id, signalType: 'shake_reject', city, metadata: { surface: 'shake' } }, session)
    pick('reject')
  }

  return <section className="gt-shake" aria-label="Shake restaurant picker">
    <div className="gt-shake__head">
      <div><span>GOOD TIMES SHAKE</span><h2>Where we eating?</h2><p>{status}</p></div>
      <div className={`gt-shake__phone ${rolling ? 'is-rolling' : ''}`} aria-hidden="true">GT</div>
    </div>

    <div className="gt-shake__actions">
      <button type="button" className="gt-shake__primary" onClick={() => pick('tap')} disabled={loading || rolling}>{rolling ? 'Choosing…' : 'Pick for me'}</button>
      <button type="button" onClick={enableMotion}>{motionReady ? 'Shake enabled' : 'Enable phone shake'}</button>
      <button type="button" onClick={() => setFiltersOpen(value => !value)}>{filtersOpen ? 'Hide filters' : 'Add filters'}</button>
    </div>

    {filtersOpen && <div className="gt-shake__filters">
      <label>Cuisine<select value={cuisine} onChange={event => setCuisine(event.target.value)}><option value="">Anything</option>{CUISINES.map(value => <option key={value} value={value}>{value.replace(/\b\w/g, char => char.toUpperCase())}</option>)}</select></label>
      <label>Price<select value={price} onChange={event => setPrice(event.target.value)}><option value="">Any price</option><option>$</option><option>$$</option><option>$$$</option><option>$$$$</option></select></label>
      <label>Vibe<select value={vibe} onChange={event => setVibe(event.target.value)}><option value="">Any vibe</option>{VIBES.map(value => <option key={value} value={value}>{value.replace(/\b\w/g, char => char.toUpperCase())}</option>)}</select></label>
      <label>Distance<select value={distance} onChange={event => setDistance(event.target.value)}><option value="">Anywhere in {cityName}</option><option value="1">Within 1 mile</option><option value="3">Within 3 miles</option><option value="5">Within 5 miles</option><option value="10">Within 10 miles</option><option value="25">Within 25 miles</option></select></label>
      {distance && !location && <button type="button" className="gt-shake__location" onClick={requestLocation}>Use my location</button>}
      <label className="gt-shake__check"><input type="checkbox" checked={blackOwned} onChange={event => setBlackOwned(event.target.checked)}/>Black-owned</label>
      <label className="gt-shake__check"><input type="checkbox" checked={reservations} onChange={event => setReservations(event.target.checked)}/>Reservations / booking</label>
      <small>{filtered.length} eligible picks</small>
    </div>}

    {result && <article className="gt-shake__result">
      <div className="gt-shake__image">{result.hero_image ? <img src={result.hero_image} alt=""/> : <div>GT</div>}<span>GOOD TIMES PICK</span></div>
      <div className="gt-shake__copy">
        <small>{result.subcategory || 'Restaurant'}{result.price_range ? ` · ${result.price_range}` : ''}</small>
        <h3>{result.name}</h3>
        <p>{result.short_desc || `${result.name} is your random GOOD TIMES pick in ${result.neighborhood || cityName}.`}</p>
        <div className="gt-shake__facts"><span>{result.neighborhood || cityName}</span>{result.google_rating ? <span>★ {Number(result.google_rating).toFixed(1)}</span> : null}{result.is_black_owned ? <span>Black-owned</span> : null}</div>
        <div className="gt-shake__result-actions"><button type="button" className="gt-shake__primary" onClick={() => { recordTasteSignal({ entityType: 'venue', entityId: result.id, signalType: 'shake_accept', city, metadata: { surface: 'shake' } }, session); onOpen(result) }}>Let’s go</button><button type="button" onClick={() => pick('reshake')}>Shake again</button><button type="button" onClick={reject}>Nah</button></div>
      </div>
    </article>}
  </section>
}
