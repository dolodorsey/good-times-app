import React, { useMemo, useState } from 'react'
import { gtAssetUrl } from './good-times-assets.js'

const VIBE_CONFIG = [
  ['Grown & sexy','gt-cat-mood-bougie.webp'],
  ['High energy','gt-cat-mood-turnt.webp'],
  ['Date night','gt-cat-mood-date.webp'],
  ['Live music','gt-cat-music.webp'],
  ['Black-owned','gt-cat-culture.webp'],
  ['Rooftop','gt-bg-rooftop-lounge.webp'],
  ['Food first','gt-cat-dining.webp'],
  ['Something different','gt-cat-mood-explore.webp'],
]
const VIBES=VIBE_CONFIG.map(([label])=>label)
const BUDGETS = ['No preference', 'Under $50 each', '$50–$100 each', '$100–$200 each', 'Premium / VIP']
const BG = path => gtAssetUrl(path,'good-times-backgrounds')

export default function BuildMyNightPanel({ cityName, busy = false, onBuild }) {
  const [occasion, setOccasion] = useState('A night out')
  const [date, setDate] = useState('Tonight')
  const [groupSize, setGroupSize] = useState('2')
  const [area, setArea] = useState('No preference')
  const [budget, setBudget] = useState('No preference')
  const [vibes, setVibes] = useState(['Grown & sexy'])

  const prompt = useMemo(() => {
    const people = Number(groupSize || 1)
    return [
      `Build my night in ${cityName}.`,
      `Occasion: ${occasion}.`,
      `When: ${date}.`,
      `Group: ${people} ${people === 1 ? 'person' : 'people'}.`,
      `Vibes: ${vibes.length ? vibes.join(', ') : 'open to strong recommendations'}.`,
      `Area: ${area}.`,
      `Budget: ${budget}.`,
      'Create a complete sequence with timing, dinner or first stop, the main experience, and an optional late-night move. Use only current source-backed events and verified venues. Save the result as an itinerary.',
    ].join(' ')
  }, [area, budget, cityName, date, groupSize, occasion, vibes])

  const toggleVibe = vibe => {
    setVibes(current => current.includes(vibe) ? current.filter(item => item !== vibe) : [...current, vibe].slice(0, 4))
  }

  const leadVibe=vibes[0]||'Something different'
  const leadArt=VIBE_CONFIG.find(([label])=>label===leadVibe)?.[1]||'gt-cat-mood-explore.webp'
  const planPreview=[
    ['01','START',leadVibe==='Food first'?'Dinner first':area==='No preference'?'Best opening move':area],
    ['02','MAIN MOVE',leadVibe==='High energy'?'Party / live energy':leadVibe],
    ['03','LATE',budget==='Premium / VIP'?'VIP after-hours':'Optional late-night move'],
  ]

  return <section className="gt2-builder" aria-labelledby="gt-build-night-title" style={{'--gt-build-art':`url("${BG(leadArt)}")`}}>
    <div className="gt2-builder-head">
      <span>GUIDED CONCIERGE</span>
      <h2 id="gt-build-night-title">Build My Night</h2>
      <p>Shape the vibe visually, then GOOD TIMES turns current parties, events and verified places into one complete night.</p>
    </div>

    <div className="gt2-builder-preview" aria-label="Live night preview">
      <div className="gt2-builder-preview-art"><span>{date.toUpperCase()}</span><strong>{cityName}</strong><small>{vibes.slice(0,2).join(' · ')}</small></div>
      <div className="gt2-builder-route">{planPreview.map(([index,label,value])=><div key={index}><span>{index}</span><div><small>{label}</small><strong>{value}</strong></div></div>)}</div>
    </div>

    <div className="gt2-builder-vibes visual">
      <span>Pick up to four vibes</span>
      <div>{VIBE_CONFIG.map(([vibe,art]) => <button
        type="button"
        key={vibe}
        className={vibes.includes(vibe) ? 'active' : ''}
        style={{'--gt-vibe-art':`url("${BG(art)}")`}}
        onClick={() => toggleVibe(vibe)}
      ><i/><strong>{vibe}</strong>{vibes.includes(vibe)&&<em>✓</em>}</button>)}</div>
    </div>

    <div className="gt2-builder-grid">
      <label><span>Occasion</span><input value={occasion} onChange={event => setOccasion(event.target.value)} placeholder="Birthday, date, friends in town…" /></label>
      <label><span>When</span><select value={date} onChange={event => setDate(event.target.value)}><option>Tonight</option><option>Tomorrow</option><option>This Friday</option><option>This Saturday</option><option>This weekend</option><option>Choose in chat</option></select></label>
      <label><span>Group size</span><select value={groupSize} onChange={event => setGroupSize(event.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}</select></label>
      <label><span>Area</span><input value={area} onChange={event => setArea(event.target.value)} placeholder="Buckhead, Midtown, no preference…" /></label>
      <label className="wide"><span>Budget</span><select value={budget} onChange={event => setBudget(event.target.value)}>{BUDGETS.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>

    <button className="gt2-builder-submit" type="button" disabled={busy} onClick={() => onBuild?.(prompt)}>
      {busy ? 'Building your night…' : '✦ Build My Night'}
    </button>
    <small>Plans are recommendations, not confirmed reservations. Ticket and booking links remain visible for final action.</small>
  </section>
}
