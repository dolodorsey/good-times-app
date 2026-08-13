import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clearSession, readSession, updatePreferences } from '../auth/client.js'
import {
  askGoodTimesConcierge,
  cityLabel,
  cityOptions,
  loadCanonicalEvents,
  loadCanonicalVenues,
  loadExploreDirectory,
  loadExploreTaxonomy,
  loadGoodTimesProfile,
  loadItineraries,
  loadSavedItems,
  recordProductEvent,
  recordTasteSignal,
  saveItem,
  todayISO,
  unsaveItem,
} from '../intelligence/client.js'
import BuildMyNightPanel from './BuildMyNightPanel.jsx'
import ExploreTaxonomyBrowser from './ExploreTaxonomyBrowser.jsx'

const CATEGORY_LABELS = {
  concerts_live_music: 'Concerts & Live Music',
  nightlife: 'Nightlife',
  comedy_performing_arts: 'Comedy & Performing Arts',
  festivals_major_activations: 'Festivals & Activations',
  dining_culinary: 'Dining & Culinary',
  sports_watch: 'Sports',
  community_civic: 'Community & Networking',
  day_parties_brunch: 'Brunch & Day Parties',
  dating_social: 'Dating & Social',
  wellness_fitness: 'Wellness & Fitness',
  arts_museums_culture: 'Arts & Culture',
  family_kids: 'Family',
  college_alumni: 'College & Alumni',
  vip_exclusive: 'VIP & Exclusive',
}
const CATEGORY_MARKS = {
  concerts_live_music: '♪', nightlife: '◐', comedy_performing_arts: '◡',
  festivals_major_activations: '✦', dining_culinary: '◇', sports_watch: '◎',
  community_civic: '◌', day_parties_brunch: '☼', dating_social: '♡',
  wellness_fitness: '∿', arts_museums_culture: 'A', family_kids: 'F',
  college_alumni: 'U', vip_exclusive: '♛',
}
const VENUE_LABELS = {
  nightclub: 'Nightclub', lounge: 'Lounge', hookah: 'Hookah', bar: 'Bar',
  cocktail_bar: 'Cocktail Bar', rooftop: 'Rooftop', speakeasy: 'Speakeasy',
  jazz: 'Jazz', restaurant: 'Restaurant', brunch: 'Brunch', food_hall: 'Food Hall',
  coffee: 'Coffee', wine_bar: 'Wine Bar', culture: 'Culture', museum: 'Museum',
  gallery: 'Gallery', comedy: 'Comedy', event_venue: 'Event Venue', spa: 'Spa',
  fitness: 'Fitness', gym: 'Gym', shopping: 'Shopping', entertainment: 'Entertainment',
}
const TAB_CONFIG = [
  ['home', '⌂', 'Now'],
  ['dates', '◫', 'Dates'],
  ['concierge', '✦', 'Build Night'],
  ['plans', '≋', 'Plans'],
  ['explore', '◇', 'Explore'],
  ['vault', '▣', 'Vault'],
]
const QUICK_PROMPTS = [
  'Plan a grown and sexy night tonight',
  'Dinner and live music this weekend',
  'A Black-owned date night in Atlanta',
  'Something fun and free tomorrow',
  'Build a birthday itinerary for four',
]

function formatDate(dateString, includeYear = false) {
  if (!dateString) return 'Date TBA'
  const date = new Date(`${dateString}T12:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}),
  })
}
function formatTime(value) {
  if (!value || value === 'TBA') return 'Time TBA'
  const match = String(value).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
}
function categoryLabel(value) {
  return CATEGORY_LABELS[value] || String(value || 'Experience').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}
function venueLabel(value) {
  return VENUE_LABELS[value] || String(value || 'Place').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}
function isTonight(event) {
  return event.event_date === todayISO()
}
function daysFromToday(dateString) {
  const today = new Date(`${todayISO()}T12:00:00`)
  const date = new Date(`${dateString}T12:00:00`)
  return Math.round((date - today) / 86400000)
}
function AppMark() {
  return <div className="gt2-mark"><span>GT</span></div>
}
function EmptyState({ mark = '✦', title, body, action }) {
  return <div className="gt2-empty"><span>{mark}</span><h2>{title}</h2><p>{body}</p>{action}</div>
}

function EventCard({ event, saved, onOpen, onSave, compact = false }) {
  return <article className={`gt2-event-card ${compact ? 'compact' : ''}`} onClick={onOpen}>
    <div className="gt2-event-image">
      {event.image_url ? <img src={event.image_url} alt="" loading="lazy" /> : <div className="gt2-image-fallback"><span>{CATEGORY_MARKS[event.category_key] || 'GT'}</span></div>}
      <div className="gt2-image-veil" />
      <button className={`gt2-save ${saved ? 'active' : ''}`} aria-label={saved ? 'Remove saved event' : 'Save event'} onClick={click => { click.stopPropagation(); onSave() }}>▣</button>
      <div className="gt2-event-badge">{event.is_curated ? 'CURATED' : event.is_featured ? 'FEATURED' : categoryLabel(event.category_key)}</div>
      <div className="gt2-date-tile"><strong>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString(undefined,{day:'2-digit'})}</strong><small>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</small></div>
    </div>
    <div className="gt2-event-copy">
      <span>{categoryLabel(event.category_key)}</span>
      <h3>{event.title}</h3>
      <p>{formatDate(event.event_date)} · {formatTime(event.event_time)}</p>
      <small>{event.venue_name || 'Location TBA'}</small>
      {event.recommendation_score != null && <em>{Math.round(event.recommendation_score)} MATCH</em>}
    </div>
  </article>
}

function VenueCard({ venue, saved, onOpen, onSave, compact = false }) {
  return <article className={`gt2-venue-card ${compact ? 'compact' : ''}`} onClick={onOpen}>
    <div className="gt2-venue-image">
      {venue.hero_image ? <img src={venue.hero_image} alt="" loading="lazy" /> : <div className="gt2-image-fallback"><span>GT</span></div>}
      <div className="gt2-image-veil" />
      <button className={`gt2-save ${saved ? 'active' : ''}`} aria-label={saved ? 'Remove saved place' : 'Save place'} onClick={click => { click.stopPropagation(); onSave() }}>▣</button>
      {venue.is_black_owned && <div className="gt2-owner-badge">BLACK-OWNED</div>}
      {venue.is_khg && <div className="gt2-khg-badge">KOLLECTIVE</div>}
    </div>
    <div className="gt2-venue-copy">
      <div><span>{venueLabel(venue.category_key)}</span>{venue.google_rating && <em>★ {Number(venue.google_rating).toFixed(1)}</em>}</div>
      <h3>{venue.name}</h3>
      <p>{venue.short_desc || `${venueLabel(venue.category_key)} in ${venue.neighborhood || cityLabel(venue.city_key)}.`}</p>
      <small>{venue.neighborhood || cityLabel(venue.city_key)}{venue.price_range ? ` · ${venue.price_range}` : ''}</small>
      {venue.recommendation_score != null && <b>{Math.round(venue.recommendation_score)} MATCH</b>}
    </div>
  </article>
}

function EventSheet({ event, saved, onClose, onSave, onConcierge }) {
  return <div className="gt2-backdrop" onMouseDown={onClose}>
    <section className="gt2-detail-sheet" onMouseDown={eventObject => eventObject.stopPropagation()}>
      <button className="gt2-sheet-close" onClick={onClose}>×</button>
      <div className="gt2-detail-image">
        {event.image_url ? <img src={event.image_url} alt="" /> : <div className="gt2-image-fallback"><span>GT</span></div>}
        <div className="gt2-image-veil" />
        <div className="gt2-detail-label">{categoryLabel(event.category_key)}</div>
      </div>
      <div className="gt2-detail-copy">
        <h2>{event.title}</h2>
        <div className="gt2-detail-facts">
          <div><span>DATE</span><strong>{formatDate(event.event_date, true)}</strong></div>
          <div><span>TIME</span><strong>{formatTime(event.event_time)}</strong></div>
          <div><span>VENUE</span><strong>{event.venue_name || 'TBA'}</strong></div>
          <div><span>GOOD TIMES SCORE</span><strong>{Math.round(Number(event.recommendation_score ?? event.good_times_score ?? 0)) || '—'}</strong></div>
        </div>
        {event.reasons?.length > 0 && <div className="gt2-reasons"><span>WHY IT FITS</span>{event.reasons.map(reason => <p key={reason}>✦ {reason}</p>)}</div>}
        <div className="gt2-detail-actions">
          <button className={saved ? 'saved' : ''} onClick={onSave}>{saved ? 'Saved to Vault' : 'Save to Vault'}</button>
          {event.ticket_url && <a href={event.ticket_url} target="_blank" rel="noreferrer">View tickets</a>}
          <button onClick={onConcierge}>Build around this</button>
        </div>
        <p className="gt2-truth">Tickets, timing and venue details are shown only when present in current source records. GOOD TIMES does not promise entry or availability.</p>
      </div>
    </section>
  </div>
}

function VenueSheet({ venue, saved, onClose, onSave, onConcierge }) {
  const directions = venue.latitude != null && venue.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address || ''}`)}`
  return <div className="gt2-backdrop" onMouseDown={onClose}>
    <section className="gt2-detail-sheet" onMouseDown={eventObject => eventObject.stopPropagation()}>
      <button className="gt2-sheet-close" onClick={onClose}>×</button>
      <div className="gt2-detail-image">
        {venue.hero_image ? <img src={venue.hero_image} alt="" /> : <div className="gt2-image-fallback"><span>GT</span></div>}
        <div className="gt2-image-veil" />
        <div className="gt2-detail-label">{venueLabel(venue.category_key)}</div>
        {venue.is_black_owned && <div className="gt2-owner-badge">BLACK-OWNED</div>}
      </div>
      <div className="gt2-detail-copy">
        <h2>{venue.name}</h2>
        <p className="gt2-long-copy">{venue.short_desc || venue.insider_tip || `Explore ${venue.name} in ${venue.neighborhood || cityLabel(venue.city_key)}.`}</p>
        <div className="gt2-detail-facts">
          <div><span>AREA</span><strong>{venue.neighborhood || cityLabel(venue.city_key)}</strong></div>
          <div><span>RATING</span><strong>{venue.google_rating ? `★ ${Number(venue.google_rating).toFixed(1)}` : 'Not listed'}</strong></div>
          <div><span>PRICE</span><strong>{venue.price_range || 'Not listed'}</strong></div>
          <div><span>HOURS</span><strong>{venue.hours_summary || 'Confirm directly'}</strong></div>
        </div>
        {venue.reasons?.length > 0 && <div className="gt2-reasons"><span>WHY IT FITS</span>{venue.reasons.map(reason => <p key={reason}>✦ {reason}</p>)}</div>}
        {venue.insider_tip && <div className="gt2-insider"><span>INSIDER NOTE</span><p>{venue.insider_tip}</p></div>}
        <div className="gt2-quick-actions">
          {venue.phone && <a href={`tel:${venue.phone}`}>Call</a>}
          <a href={directions} target="_blank" rel="noreferrer">Directions</a>
          {venue.website && <a href={venue.website} target="_blank" rel="noreferrer">Website</a>}
          {venue.instagram_handle && <a href={`https://instagram.com/${String(venue.instagram_handle).replace('@','')}`} target="_blank" rel="noreferrer">Instagram</a>}
        </div>
        <div className="gt2-detail-actions">
          <button className={saved ? 'saved' : ''} onClick={onSave}>{saved ? 'Saved to Vault' : 'Save to Vault'}</button>
          {venue.booking_link && <a href={venue.booking_link} target="_blank" rel="noreferrer">Open booking link</a>}
          <button onClick={onConcierge}>Plan a night here</button>
        </div>
        <p className="gt2-truth">Hours, dress code, reservations and entry policies can change. Confirm directly with the venue before going.</p>
      </div>
    </section>
  </div>
}

export default function GoodTimesCommandApp() {
  const session = useMemo(() => readSession(), [])
  const [profile, setProfile] = useState(null)
  const [events, setEvents] = useState([])
  const [venues, setVenues] = useState([])
  const [taxonomy, setTaxonomy] = useState([])
  const [exploreDirectory, setExploreDirectory] = useState([])
  const [exploreCategory, setExploreCategory] = useState(null)
  const [exploreSubcategory, setExploreSubcategory] = useState(null)
  const [savedItems, setSavedItems] = useState([])
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [city, setCity] = useState('atlanta')
  const [tab, setTab] = useState('home')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [dateMode, setDateMode] = useState('upcoming')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [mapMode, setMapMode] = useState(false)
  const [conciergeQuery, setConciergeQuery] = useState('')
  const [conciergeMessages, setConciergeMessages] = useState([])
  const [conciergeResult, setConciergeResult] = useState(null)
  const [conciergeBusy, setConciergeBusy] = useState(false)
  const [conciergeError, setConciergeError] = useState('')
  const [threadId, setThreadId] = useState(null)
  const [toast, setToast] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const contentRef = useRef(null)

  const refreshAccountData = useCallback(async nextProfile => {
    if (!nextProfile?.id) return
    const [saved, plans] = await Promise.all([
      loadSavedItems(nextProfile.id, session).catch(() => []),
      loadItineraries(session).catch(() => []),
    ])
    setSavedItems(saved)
    setItineraries(plans)
  }, [session])

  const loadExperience = useCallback(async nextCity => {
    setLoading(true)
    setLoadError('')
    try {
      const [nextEvents, nextVenues, nextTaxonomy, nextExploreDirectory] = await Promise.all([
        loadCanonicalEvents(nextCity),
        loadCanonicalVenues(nextCity),
        loadExploreTaxonomy().catch(() => []),
        loadExploreDirectory(nextCity).catch(() => []),
      ])
      setEvents(nextEvents || [])
      setVenues(nextVenues || [])
      setTaxonomy(nextTaxonomy || [])
      setExploreDirectory(nextExploreDirectory || [])
      recordProductEvent({ eventName: 'feed_loaded', surface: 'app', objectType: 'city', objectId: nextCity, city: nextCity, properties: { events: nextEvents?.length || 0, venues: nextVenues?.length || 0 } }, session)
    } catch (error) {
      setLoadError(error.message || 'The GOOD TIMES feed could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    let active = true
    ;(async () => {
      const nextProfile = await loadGoodTimesProfile(session).catch(() => null)
      if (!active) return
      setProfile(nextProfile)
      const initialCity = nextProfile?.last_city || nextProfile?.home_city || 'atlanta'
      setCity(initialCity)
      await Promise.all([loadExperience(initialCity), refreshAccountData(nextProfile)])
    })()
    return () => { active = false }
  }, [loadExperience, refreshAccountData, session])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const savedKeySet = useMemo(() => new Set(savedItems.map(item => `${item.item_type}:${item.item_id}`)), [savedItems])
  const categories = useMemo(() => {
    const counts = new Map()
    events.forEach(event => counts.set(event.category_key || 'experience', (counts.get(event.category_key || 'experience') || 0) + 1))
    return [...counts.entries()].sort((a,b) => b[1] - a[1])
  }, [events])
  const tonightEvents = useMemo(() => events.filter(isTonight).slice(0, 12), [events])
  const nextSeven = useMemo(() => events.filter(event => daysFromToday(event.event_date) >= 0 && daysFromToday(event.event_date) <= 7).slice(0, 16), [events])
  const heroEvents = useMemo(() => {
    const ranked = [...events].sort((a,b) => Number(isTonight(b)) - Number(isTonight(a)) || Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
    const images = new Set()
    return ranked.filter(event => {
      const image = String(event.image_url || '').trim()
      if (!image || images.has(image)) return false
      images.add(image)
      return true
    }).slice(0, 6)
  }, [events])
  const heroEvent = heroEvents[heroIndex % Math.max(heroEvents.length, 1)] || events[0]
  const upcomingConcerts = useMemo(() => events.filter(event => event.category_key === 'concerts_live_music' && daysFromToday(event.event_date) >= 0).slice(0, 12), [events])
  const cultureVenues = useMemo(() => {
    const images = new Set()
    return venues.filter(venue => venue.is_culture_pick || venue.is_black_owned || venue.is_khg).filter(venue => {
      const image = String(venue.hero_image || '').trim()
      if (!image) return true
      if (images.has(image)) return false
      images.add(image)
      return true
    }).slice(0, 14)
  }, [venues])

  useEffect(() => {
    setHeroIndex(0)
    if (heroEvents.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => setHeroIndex(index => (index + 1) % heroEvents.length), 6500)
    return () => window.clearInterval(timer)
  }, [heroEvents])

  const openScreen = useCallback((nextTab, options = {}) => {
    setTab(nextTab)
    if (options.dateMode) setDateMode(options.dateMode)
    if (options.category) setCategory(options.category)
    if (options.clearQuery !== false) setQuery('')
    window.requestAnimationFrame(() => contentRef.current?.scrollTo({ top: 0, behavior: 'instant' }))
  }, [])

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter(event => {
      const categoryMatch = category === 'all' || event.category_key === category
      const dateMatch = dateMode === 'today' ? isTonight(event) : dateMode === 'week' ? daysFromToday(event.event_date) <= 7 : true
      const searchMatch = !needle || [event.title,event.venue_name,event.organizer,event.category_key,event.subcategory_key,event.raw_type,event.raw_category].filter(Boolean).join(' ').toLowerCase().includes(needle)
      return categoryMatch && dateMatch && searchMatch
    })
  }, [events, query, category, dateMode])

  const filteredVenues = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return venues.filter(venue => !needle || [venue.name,venue.neighborhood,venue.category_key,venue.subcategory,venue.short_desc,...(venue.vibe_tags||[]),...(venue.culture_tags||[])].filter(Boolean).join(' ').toLowerCase().includes(needle))
  }, [venues, query])

  const savedEvents = useMemo(() => events.filter(event => savedKeySet.has(`event:${event.event_key}`)), [events, savedKeySet])
  const savedVenues = useMemo(() => venues.filter(venue => savedKeySet.has(`venue:${venue.id}`)), [venues, savedKeySet])

  const openEvent = event => {
    setSelectedEvent(event)
    recordProductEvent({ eventName: 'event_opened', surface: tab, objectType: 'event', objectId: event.event_key, city, properties: { category: event.category_key } }, session)
    recordTasteSignal({ entityType: 'event', entityId: event.event_key, signalType: 'view', city, metadata: { category_key: event.category_key } }, session)
  }
  const openVenue = venue => {
    setSelectedVenue(venue)
    recordProductEvent({ eventName: 'venue_opened', surface: tab, objectType: 'venue', objectId: venue.id, city, properties: { category: venue.category_key } }, session)
    recordTasteSignal({ entityType: 'venue', entityId: venue.id, signalType: 'view', city, metadata: { category_key: venue.category_key } }, session)
  }

  const toggleSave = async (itemType, itemId) => {
    if (!profile?.id) return
    const key = `${itemType}:${itemId}`
    const alreadySaved = savedKeySet.has(key)
    try {
      if (alreadySaved) {
        await unsaveItem({ profileId: profile.id, itemType, itemId }, session)
        setSavedItems(current => current.filter(item => `${item.item_type}:${item.item_id}` !== key))
        setToast('Removed from your Vault.')
      } else {
        await saveItem({ profileId: profile.id, itemType, itemId }, session)
        const next = await loadSavedItems(profile.id, session)
        setSavedItems(next)
        setToast('Saved to your Vault.')
      }
    } catch (error) {
      setToast(error.message || 'Save failed.')
    }
  }

  const runConcierge = async ({ prompt = conciergeQuery, action = 'recommend' } = {}) => {
    const text = String(prompt || '').trim()
    if (!text || conciergeBusy) return
    setConciergeBusy(true)
    setConciergeError('')
    setConciergeMessages(current => [...current, { role: 'user', content: text }])
    setConciergeQuery('')
    try {
      const result = await askGoodTimesConcierge({ query: text, action, city, thread_id: threadId }, session)
      setThreadId(result.thread_id)
      setConciergeResult(result)
      setConciergeMessages(current => [...current, { role: 'assistant', content: result.message }])
      if (result.itinerary) {
        setItineraries(current => [result.itinerary, ...current.filter(item => item.id !== result.itinerary.id)])
        setToast('Your itinerary was saved to Plans.')
      }
    } catch (error) {
      setConciergeError(error.message || 'The concierge could not complete that request.')
      setConciergeMessages(current => [...current, { role: 'assistant', content: 'I could not complete that request from reliable current data. Try a different date, area or type of experience.' }])
    } finally {
      setConciergeBusy(false)
    }
  }
  const planAroundEvent = event => {
    setSelectedEvent(null)
    setTab('concierge')
    const prompt = `Build a complete night around ${event.title} at ${event.venue_name || 'the listed venue'} on ${formatDate(event.event_date)}.`
    setConciergeQuery(prompt)
    window.setTimeout(() => runConcierge({ prompt, action: 'itinerary' }), 50)
  }
  const planAroundVenue = venue => {
    setSelectedVenue(null)
    setTab('concierge')
    const prompt = `Plan a complete night that includes ${venue.name} in ${venue.neighborhood || cityLabel(city)}.`
    setConciergeQuery(prompt)
    window.setTimeout(() => runConcierge({ prompt, action: 'itinerary' }), 50)
  }

  const changeCity = async nextCity => {
    setCity(nextCity)
    setQuery('')
    setExploreCategory(null)
    setExploreSubcategory(null)
    await updatePreferences(session.user.id, { last_city: nextCity }, session.access_token).catch(() => false)
    await loadExperience(nextCity)
  }

  if (loading && !events.length) {
    return <div className="gt2-loading"><div className="gt2-loading-scene"/><AppMark/><div className="gt2-loading-line"/><span>Curating {cityLabel(city)}</span></div>
  }

  return <div className="gt2-app">
    <header className="gt2-topbar">
      <button className="gt2-brand" onClick={() => setTab('home')}><AppMark/><span><strong>GOOD TIMES</strong><small>Worldwide Experience Concierge</small></span></button>
      <button className="gt2-city" onClick={() => setTab('profile')}><span>⌖</span>{cityLabel(city)}</button>
    </header>

    <main className="gt2-content" ref={contentRef}>
      {tab === 'home' && <>
        {heroEvent ? <section className="gt2-hero" style={heroEvent.image_url ? { backgroundImage: `url(${heroEvent.image_url})` } : undefined}>
          <div className="gt2-hero-veil"/>
          <div className="gt2-hero-copy">
            <span>{isTonight(heroEvent) ? 'TONIGHT IN ' : 'CURATED FOR '}{cityLabel(city).toUpperCase()}</span>
            <h1>{heroEvent.title}</h1>
            <p>{formatDate(heroEvent.event_date)} · {formatTime(heroEvent.event_time)}<br/>{heroEvent.venue_name || 'Location TBA'}</p>
            <div><button onClick={() => openEvent(heroEvent)}>See the move</button><button onClick={() => { openScreen('concierge');setConciergeQuery('Build my night tonight') }}>Build my night</button></div>
          </div>
          <div className="gt2-hero-index"><strong>{heroIndex + 1}</strong><small>of {heroEvents.length || 1} featured</small></div>
          {heroEvents.length > 1 && <div className="gt2-hero-controls" aria-label="Featured experiences">{heroEvents.map((event,index) => <button key={event.event_key} className={index===heroIndex?'active':''} aria-label={`Show ${event.title}`} onClick={() => setHeroIndex(index)}/>)}</div>}
        </section> : <EmptyState title="No current experiences" body="The source feed has no current records for this city." />}

        <button className="gt2-command-launch" onClick={() => openScreen('concierge')}><span>✦</span><div><small>BUILD MY NIGHT</small><strong>Turn your vibe into a complete plan.</strong></div><em>›</em></button>

        <section className="gt2-pulse">
          <div><strong>{events.length}</strong><span>Experiences</span></div>
          <div><strong>{venues.length}</strong><span>Places</span></div>
          <div><strong>{taxonomy.length || categories.length}</strong><span>Categories</span></div>
          <div><strong>{savedItems.length}</strong><span>Saved</span></div>
        </section>

        <section className="gt2-section gt2-section-tonight">
          <div className="gt2-section-title"><div><span>RIGHT NOW</span><h2>{tonightEvents.length ? 'Tonight’s moves' : 'Next up'}</h2></div><button onClick={() => openScreen('dates',{dateMode:tonightEvents.length?'today':'upcoming',category:'all'})}>See all tonight <span>›</span></button></div>
          <div className="gt2-horizontal">
            {(tonightEvents.length ? tonightEvents : events).slice(0,12).map(event => <EventCard compact key={event.event_key} event={event} saved={savedKeySet.has(`event:${event.event_key}`)} onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>) }
          </div>
        </section>

        {upcomingConcerts.length > 0 && <section className="gt2-section gt2-section-concerts">
          <div className="gt2-section-title"><div><span>LIVE MUSIC</span><h2>Upcoming concerts</h2></div><button onClick={() => openScreen('dates',{dateMode:'upcoming',category:'concerts_live_music'})}>See all concerts <span>›</span></button></div>
          <div className="gt2-horizontal">
            {upcomingConcerts.map(event => <EventCard compact key={event.event_key} event={event} saved={savedKeySet.has(`event:${event.event_key}`)} onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>) }
          </div>
        </section>}

        <section className="gt2-section gt2-dark-section gt2-section-week">
          <div className="gt2-section-title"><div><span>NEXT SEVEN DAYS</span><h2>Worth leaving home for</h2></div><button onClick={() => openScreen('dates',{dateMode:'week',category:'all'})}>Open calendar <span>›</span></button></div>
          <div className="gt2-event-grid">
            {nextSeven.slice(0,6).map(event => <EventCard key={event.event_key} event={event} saved={savedKeySet.has(`event:${event.event_key}`)} onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>) }
          </div>
        </section>

        <section className="gt2-section gt2-section-places">
          <div className="gt2-section-title"><div><span>CULTURE LAYER</span><h2>Places that matter</h2></div><button onClick={() => openScreen('explore')}>Explore places <span>›</span></button></div>
          <div className="gt2-horizontal">
            {(cultureVenues.length ? cultureVenues : venues).slice(0,12).map(venue => <VenueCard compact key={venue.id} venue={venue} saved={savedKeySet.has(`venue:${venue.id}`)} onOpen={() => openVenue(venue)} onSave={() => toggleSave('venue',venue.id)}/>) }
          </div>
        </section>
      </>}

      {tab === 'dates' && <section className="gt2-screen">
        <div className="gt2-screen-heading"><span>DATES</span><h1>What’s happening.</h1><p>{filteredEvents.length} current experiences in {cityLabel(city)}.</p></div>
        <div className="gt2-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search artists, venues, categories…"/>{query && <button onClick={() => setQuery('')}>×</button>}</div>
        <div className="gt2-date-tabs"><button className={dateMode==='upcoming'?'active':''} onClick={() => setDateMode('upcoming')}>Upcoming</button><button className={dateMode==='today'?'active':''} onClick={() => setDateMode('today')}>Today</button><button className={dateMode==='week'?'active':''} onClick={() => setDateMode('week')}>This week</button></div>
        <div className="gt2-filter-rail"><button className={category==='all'?'active':''} onClick={() => setCategory('all')}>All <small>{events.length}</small></button>{categories.map(([key,count]) => <button key={key} className={category===key?'active':''} onClick={() => setCategory(key)}>{categoryLabel(key)} <small>{count}</small></button>)}</div>
        {loadError ? <EmptyState mark="!" title="Feed unavailable" body={loadError}/>:filteredEvents.length===0?<EmptyState mark="⌕" title="No strong matches" body="Try another category, keyword or date range." action={<button className="gt2-primary" onClick={() => {setCategory('all');setDateMode('upcoming');setQuery('')}}>Reset filters</button>}/>:<div className="gt2-event-grid">{filteredEvents.map(event => <EventCard key={event.event_key} event={event} saved={savedKeySet.has(`event:${event.event_key}`)} onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>)}</div>}
      </section>}

      {tab === 'concierge' && <section className="gt2-concierge-screen">
        <div className="gt2-concierge-hero"><div className="gt2-agent-orbit"><i/><i/><span>GT</span></div><span>LIVE EXPERIENCE AGENT</span><h1>Build My Night.</h1><p>Start with the guided builder, then use the concierge chat to refine the plan around real events and verified places.</p></div><BuildMyNightPanel cityName={cityLabel(city)} busy={conciergeBusy} onBuild={prompt => runConcierge({ prompt, action: 'itinerary' })}/>
        <div className="gt2-quick-prompts">{QUICK_PROMPTS.map(prompt => <button key={prompt} onClick={() => runConcierge({ prompt, action: prompt.startsWith('Build') ? 'itinerary' : 'recommend' })}>{prompt}</button>)}</div>
        <div className="gt2-thread">
          {conciergeMessages.length===0 && <div className="gt2-agent-intro"><span>✦</span><p>Tell me the date, vibe, area, budget, occasion or group size. I’ll return only current source-backed options.</p></div>}
          {conciergeMessages.map((message,index) => <div key={`${message.role}-${index}`} className={`gt2-message ${message.role}`}><span>{message.role==='assistant'?'GT':'YOU'}</span><p>{message.content}</p></div>)}
          {conciergeBusy && <div className="gt2-message assistant loading"><span>GT</span><p>Checking timing, quality, actions and your taste…</p></div>}
          {conciergeError && <div className="gt2-concierge-error">{conciergeError}</div>}
        </div>
        {conciergeResult && <div className="gt2-agent-results">
          {conciergeResult.events?.length>0 && <><div className="gt2-section-title"><div><span>EVENT MATCHES</span><h2>Strongest current options</h2></div></div><div className="gt2-horizontal">{conciergeResult.events.slice(0,8).map(event => <EventCard compact key={event.event_key} event={event} saved={savedKeySet.has(`event:${event.event_key}`)} onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>)}</div></>}
          {conciergeResult.venues?.length>0 && <><div className="gt2-section-title"><div><span>PLACE MATCHES</span><h2>Where the night can go</h2></div></div><div className="gt2-horizontal">{conciergeResult.venues.slice(0,8).map(venue => <VenueCard compact key={venue.id} venue={venue} saved={savedKeySet.has(`venue:${venue.id}`)} onOpen={() => openVenue(venue)} onSave={() => toggleSave('venue',venue.id)}/>)}</div></>}
          {!conciergeResult.itinerary && <button className="gt2-build-plan" onClick={() => runConcierge({ prompt: conciergeMessages.filter(message=>message.role==='user').at(-1)?.content || 'Build my best night', action:'itinerary' })}>Build and save this night</button>}
        </div>}
        <div className="gt2-composer"><textarea value={conciergeQuery} onChange={event => setConciergeQuery(event.target.value)} placeholder="Example: grown and sexy dinner, R&B and a lounge Saturday for four…"/><div><button onClick={() => runConcierge({ action:'recommend' })} disabled={!conciergeQuery.trim()||conciergeBusy}>Recommend</button><button onClick={() => runConcierge({ action:'itinerary' })} disabled={!conciergeQuery.trim()||conciergeBusy}>Build plan</button></div></div>
      </section>}

      {tab === 'plans' && <section className="gt2-screen">
        <div className="gt2-screen-heading"><span>PLANS</span><h1>Your nights.</h1><p>Agent-built and personally saved itineraries.</p></div>
        {itineraries.length===0 ? <EmptyState mark="≋" title="No plans built yet" body="Give the concierge a date, vibe, area and occasion. It will build a source-backed sequence and save it here." action={<button className="gt2-primary" onClick={() => setTab('concierge')}>Build my first night</button>}/> : <div className="gt2-plans-list">{itineraries.map(plan => <article key={plan.id} className="gt2-plan-card"><div className="gt2-plan-head"><div><span>{plan.created_by==='ai'?'AGENT-BUILT':'YOUR PLAN'}</span><h2>{plan.name}</h2><p>{formatDate(plan.itinerary_date,true)} · {cityLabel(plan.city_id)} · {plan.group_size || 1} guest{Number(plan.group_size||1)===1?'':'s'}</p></div><em>{plan.status}</em></div><div className="gt2-plan-stops">{(plan.stops||[]).map((stop,index) => <div key={`${stop.id}-${index}`}><span>{index+1}</span><div><small>{String(stop.role||stop.type||'stop').toUpperCase()}</small><strong>{stop.name}</strong><p>{stop.time ? `${formatTime(stop.time)} · ` : ''}{stop.venue || stop.address || ''}</p></div>{stop.ticket_url&&<a href={stop.ticket_url} target="_blank" rel="noreferrer">Tickets</a>}{stop.booking_link&&<a href={stop.booking_link} target="_blank" rel="noreferrer">Book</a>}</div>)}</div><p className="gt2-truth">This is a planning sequence, not a reservation confirmation. Use the listed ticket and booking links to secure access.</p></article>)}</div>}
      </section>}

      {tab === 'explore' && <ExploreTaxonomyBrowser
        taxonomy={taxonomy}
        directory={exploreDirectory}
        cityName={cityLabel(city)}
        query={query}
        onQuery={setQuery}
        selectedCategory={exploreCategory}
        selectedSubcategory={exploreSubcategory}
        onCategory={setExploreCategory}
        onSubcategory={setExploreSubcategory}
        mapMode={mapMode}
        onMapMode={setMapMode}
        renderVenue={(venue, compact) => <VenueCard compact={compact} key={`${venue.id}-${venue.subcategory_key || "all"}`} venue={venue} saved={savedKeySet.has(`venue:${venue.id}`)} onOpen={() => openVenue(venue)} onSave={() => toggleSave('venue', venue.id)}/>} 
      />}

      {tab === 'vault' && <section className="gt2-screen">
        <div className="gt2-screen-heading"><span>VAULT</span><h1>Keep the good ones.</h1><p>{savedItems.length} saved event{savedItems.length===1?'':'s'} and places.</p></div>
        {savedItems.length===0 ? <EmptyState mark="▣" title="Your Vault is empty" body="Save events and places. GOOD TIMES will use those choices to improve future recommendations." action={<button className="gt2-primary" onClick={() => setTab('dates')}>Explore what’s happening</button>}/> : <><div className="gt2-section-title"><div><span>SAVED EVENTS</span><h2>{savedEvents.length} experiences</h2></div></div>{savedEvents.length>0?<div className="gt2-event-grid">{savedEvents.map(event => <EventCard key={event.event_key} event={event} saved onOpen={() => openEvent(event)} onSave={() => toggleSave('event',event.event_key)}/>)}</div>:<p className="gt2-vault-note">Some saved events are outside the currently loaded date or city.</p>}<div className="gt2-section-title"><div><span>SAVED PLACES</span><h2>{savedVenues.length} venues</h2></div></div>{savedVenues.length>0?<div className="gt2-venue-grid">{savedVenues.map(venue => <VenueCard key={venue.id} venue={venue} saved onOpen={() => openVenue(venue)} onSave={() => toggleSave('venue',venue.id)}/>)}</div>:<p className="gt2-vault-note">Some saved places are outside the currently loaded city.</p>}</>}
      </section>}

      {tab === 'profile' && <section className="gt2-screen">
        <div className="gt2-profile-hero"><AppMark/><span>YOUR GOOD TIMES</span><h1>{profile?.full_name || session?.user?.email}</h1><p>{session?.user?.email}</p></div>
        <div className="gt2-account-card"><span>HOME CITY</span><select value={city} onChange={event => changeCity(event.target.value)}>{cityOptions.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><p>GOOD TIMES will use this city for the feed and concierge unless your request names another place.</p></div>
        <div className="gt2-account-stats"><div><strong>{profile?.vibe_preferences?.length || 0}</strong><span>Vibe preferences</span></div><div><strong>{savedItems.length}</strong><span>Saved</span></div><div><strong>{itineraries.length}</strong><span>Plans</span></div></div>
        <div className="gt2-account-menu"><button onClick={() => setTab('concierge')}><span>✦</span><div><strong>GOOD TIMES Concierge</strong><small>Ask, rank and build the next move</small></div><em>›</em></button><button onClick={() => setTab('vault')}><span>▣</span><div><strong>My Vault</strong><small>Saved events and places</small></div><em>›</em></button><button onClick={() => setTab('plans')}><span>≋</span><div><strong>My Plans</strong><small>Saved itineraries</small></div><em>›</em></button><a href="/legacy"><span>↗</span><div><strong>Legacy experience</strong><small>Temporary rollback route</small></div><em>›</em></a><button className="danger" onClick={() => { clearSession();window.location.reload() }}><span>↪</span><div><strong>Sign out</strong><small>End this GOOD TIMES session</small></div><em>›</em></button></div>
      </section>}
    </main>

    <nav className="gt2-nav" aria-label="GOOD TIMES navigation">{TAB_CONFIG.map(([id,mark,label]) => <button key={id} className={tab===id?'active':''} onClick={() => openScreen(id)}><span>{mark}</span><small>{label}</small></button>)}</nav>
    {selectedEvent && <EventSheet event={selectedEvent} saved={savedKeySet.has(`event:${selectedEvent.event_key}`)} onClose={() => setSelectedEvent(null)} onSave={() => toggleSave('event',selectedEvent.event_key)} onConcierge={() => planAroundEvent(selectedEvent)}/>} 
    {selectedVenue && <VenueSheet venue={selectedVenue} saved={savedKeySet.has(`venue:${selectedVenue.id}`)} onClose={() => setSelectedVenue(null)} onSave={() => toggleSave('venue',selectedVenue.id)} onConcierge={() => planAroundVenue(selectedVenue)}/>} 
    {toast && <div className="gt2-toast">{toast}</div>}
  </div>
}
